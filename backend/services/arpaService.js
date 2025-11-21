import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';

/**
 * ARPA (Automated Risk Prediction Algorithm) Service
 * Automatically calculates patient risk scores based on multiple factors
 */

/**
 * Calculate ARPA risk score for a patient
 * @param {string} patientId - Patient ID
 * @param {string} calculatedBy - User ID who triggered the calculation (optional, for audit)
 * @param {object} options - Additional options (skipAudit, etc.)
 * @returns {Promise<object>} Risk score calculation result
 */
export async function calculateARPARiskScore(patientId, calculatedBy = null, options = {}) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Query patients (D2) for basic info
    const [patients] = await connection.query(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      await connection.rollback();
      throw new Error('Patient not found');
    }

    const patient = patients[0];

    // 2. Query clinical_visits (D3) → count visits, check adherence
    const [visits] = await connection.query(
      `SELECT 
        COUNT(*) as visit_count, 
        MAX(visit_date) as last_visit_date,
        MIN(visit_date) as first_visit_date,
        COUNT(CASE WHEN visit_type = 'follow_up' THEN 1 END) as follow_up_count,
        COUNT(CASE WHEN visit_type = 'emergency' THEN 1 END) as emergency_count
       FROM clinical_visits 
       WHERE patient_id = ?`,
      [patientId]
    );
    const visitData = visits[0] || { 
      visit_count: 0, 
      last_visit_date: null, 
      first_visit_date: null,
      follow_up_count: 0,
      emergency_count: 0
    };

    // 3. Query prescriptions + medication_adherence (D4) → check medication compliance
    const [prescriptions] = await connection.query(
      `SELECT 
        COUNT(*) as prescription_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_prescriptions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_prescriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_prescriptions
       FROM prescriptions 
       WHERE patient_id = ?`,
      [patientId]
    );
    const prescriptionData = prescriptions[0] || { 
      prescription_count: 0,
      active_prescriptions: 0,
      completed_prescriptions: 0,
      cancelled_prescriptions: 0
    };

    // Get medication adherence data
    const [adherence] = await connection.query(
      `SELECT 
        AVG(adherence_percentage) as avg_adherence,
        COUNT(*) as adherence_records,
        COUNT(CASE WHEN taken = 0 THEN 1 END) as missed_doses,
        MAX(adherence_date) as last_adherence_date
       FROM medication_adherence 
       WHERE patient_id = ? AND adherence_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`,
      [patientId]
    );
    const adherenceData = adherence[0] || { 
      avg_adherence: null, 
      adherence_records: 0,
      missed_doses: 0,
      last_adherence_date: null
    };

    // Get ART regimen adherence if applicable
    const [artRegimens] = await connection.query(
      `SELECT 
        COUNT(*) as regimen_count,
        SUM(missed_doses) as total_missed_doses
       FROM art_regimen_drugs ard
       JOIN art_regimens ar ON ard.regimen_id = ar.regimen_id
       WHERE ar.patient_id = ? AND ar.status = 'active'`,
      [patientId]
    );
    const artData = artRegimens[0] || { regimen_count: 0, total_missed_doses: 0 };

    // 4. Query lab_results (D5) → check CD4, viral load trends
    const [labResults] = await connection.query(
      `SELECT 
        lr.test_code,
        lr.test_name,
        lr.result_value,
        lr.unit,
        lr.reported_at,
        lr.is_critical
       FROM lab_results lr
       WHERE lr.patient_id = ? 
       ORDER BY lr.reported_at DESC
       LIMIT 20`,
      [patientId]
    );

    // Analyze lab trends
    const cd4Results = labResults.filter(r => 
      r.test_code?.toLowerCase().includes('cd4') || 
      r.test_name?.toLowerCase().includes('cd4')
    );
    const viralLoadResults = labResults.filter(r => 
      r.test_code?.toLowerCase().includes('vl') || 
      r.test_code?.toLowerCase().includes('viral') ||
      r.test_name?.toLowerCase().includes('viral load')
    );

    // Get critical lab results count
    const criticalLabs = labResults.filter(r => r.is_critical === 1 || r.is_critical === true);

    // 5. Query appointments (D6) → check appointment attendance
    const [appointments] = await connection.query(
      `SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_appointments,
        MAX(scheduled_start) as last_appointment_date
       FROM appointments 
       WHERE patient_id = ?`,
      [patientId]
    );
    const appointmentData = appointments[0] || { 
      total_appointments: 0, 
      completed_appointments: 0,
      cancelled_appointments: 0,
      no_show_appointments: 0,
      last_appointment_date: null
    };

    // 6. Calculate risk score based on factors
    let riskScore = 0;
    const riskFactors = {
      visitCount: visitData.visit_count,
      prescriptionCount: prescriptionData.prescription_count,
      totalAppointments: appointmentData.total_appointments,
      completedAppointments: appointmentData.completed_appointments,
      missedAppointments: appointmentData.no_show_appointments,
    };

    // Factor 1: Visit frequency (lower visits = higher risk)
    const daysSinceLastVisit = visitData.last_visit_date 
      ? Math.floor((new Date() - new Date(visitData.last_visit_date)) / (1000 * 60 * 60 * 24))
      : 365;
    
    if (daysSinceLastVisit > 180) riskScore += 25;
    else if (daysSinceLastVisit > 90) riskScore += 20;
    else if (daysSinceLastVisit > 60) riskScore += 15;
    else if (daysSinceLastVisit > 30) riskScore += 10;
    else if (daysSinceLastVisit > 14) riskScore += 5;
    
    riskFactors.daysSinceLastVisit = daysSinceLastVisit;
    riskFactors.visitFrequency = visitData.visit_count > 0 
      ? Math.round((visitData.visit_count / Math.max(1, Math.floor((new Date() - new Date(patient.created_at)) / (1000 * 60 * 60 * 24 * 30)))) * 10) / 10
      : 0;

    // Factor 2: Medication adherence (lower adherence = higher risk)
    const adherencePercent = adherenceData.avg_adherence || 0;
    const missedDoseRate = adherenceData.adherence_records > 0
      ? (adherenceData.missed_doses / adherenceData.adherence_records) * 100
      : 0;
    
    if (adherencePercent < 70) riskScore += 30;
    else if (adherencePercent < 80) riskScore += 25;
    else if (adherencePercent < 90) riskScore += 15;
    else if (adherencePercent < 95) riskScore += 10;
    else if (adherencePercent < 100) riskScore += 5;
    
    if (missedDoseRate > 30) riskScore += 15;
    else if (missedDoseRate > 20) riskScore += 10;
    else if (missedDoseRate > 10) riskScore += 5;
    
    riskFactors.medicationAdherence = Math.round(adherencePercent * 10) / 10;
    riskFactors.missedDoseRate = Math.round(missedDoseRate * 10) / 10;
    riskFactors.artMissedDoses = artData.total_missed_doses || 0;

    // Factor 3: Appointment attendance (more missed = higher risk)
    const missedRate = appointmentData.total_appointments > 0 
      ? (appointmentData.no_show_appointments / appointmentData.total_appointments) * 100 
      : 0;
    const attendanceRate = appointmentData.total_appointments > 0
      ? (appointmentData.completed_appointments / appointmentData.total_appointments) * 100
      : 0;
    
    if (missedRate > 40) riskScore += 25;
    else if (missedRate > 30) riskScore += 20;
    else if (missedRate > 20) riskScore += 15;
    else if (missedRate > 10) riskScore += 10;
    else if (missedRate > 5) riskScore += 5;
    
    if (attendanceRate < 50 && appointmentData.total_appointments > 3) riskScore += 15;
    
    riskFactors.appointmentMissedRate = Math.round(missedRate * 10) / 10;
    riskFactors.appointmentAttendanceRate = Math.round(attendanceRate * 10) / 10;

    // Factor 4: Lab compliance (missing recent labs = higher risk)
    const daysSinceLastLab = labResults.length > 0 && labResults[0].reported_at
      ? Math.floor((new Date() - new Date(labResults[0].reported_at)) / (1000 * 60 * 60 * 24))
      : 365;
    
    if (daysSinceLastLab > 180) riskScore += 20;
    else if (daysSinceLastLab > 120) riskScore += 15;
    else if (daysSinceLastLab > 90) riskScore += 10;
    else if (daysSinceLastLab > 60) riskScore += 5;
    
    riskFactors.daysSinceLastLab = daysSinceLastLab;
    riskFactors.criticalLabsCount = criticalLabs.length;

    // Factor 5: CD4 trend (declining = higher risk)
    if (cd4Results.length >= 2) {
      const latestCD4 = parseFloat(cd4Results[0]?.result_value) || 0;
      const previousCD4 = parseFloat(cd4Results[1]?.result_value) || 0;
      const cd4Change = latestCD4 - previousCD4;
      const cd4ChangePercent = previousCD4 > 0 ? (cd4Change / previousCD4) * 100 : 0;
      
      if (latestCD4 < 200) riskScore += 20;
      else if (latestCD4 < 350) riskScore += 10;
      else if (latestCD4 < 500) riskScore += 5;
      
      if (cd4ChangePercent < -20) riskScore += 15;
      else if (cd4ChangePercent < -10) riskScore += 10;
      
      riskFactors.cd4Trend = { 
        latest: latestCD4, 
        previous: previousCD4,
        change: cd4Change,
        changePercent: Math.round(cd4ChangePercent * 10) / 10
      };
    } else if (cd4Results.length === 1) {
      const latestCD4 = parseFloat(cd4Results[0]?.result_value) || 0;
      if (latestCD4 < 200) riskScore += 15;
      else if (latestCD4 < 350) riskScore += 8;
      riskFactors.cd4Trend = { latest: latestCD4, previous: null };
    }

    // Factor 6: Viral load (detectable = higher risk)
    if (viralLoadResults.length > 0) {
      const latestVL = parseFloat(viralLoadResults[0]?.result_value) || 0;
      const latestVLText = viralLoadResults[0]?.result_value?.toString().toLowerCase() || '';
      
      // Handle "undetectable" or "< 20" type results
      if (latestVLText.includes('undetectable') || latestVLText.includes('<')) {
        riskFactors.viralLoad = { value: 'Undetectable', numeric: 0 };
      } else {
        if (latestVL > 1000) riskScore += 25;
        else if (latestVL > 500) riskScore += 20;
        else if (latestVL > 200) riskScore += 15;
        else if (latestVL > 50) riskScore += 10;
        else if (latestVL > 20) riskScore += 5;
        
        riskFactors.viralLoad = { value: latestVL, numeric: latestVL };
      }
    }

    // Factor 7: Emergency visits (more emergencies = higher risk)
    if (visitData.emergency_count > 0) {
      const emergencyRate = visitData.visit_count > 0
        ? (visitData.emergency_count / visitData.visit_count) * 100
        : 0;
      if (emergencyRate > 30) riskScore += 15;
      else if (emergencyRate > 20) riskScore += 10;
      else if (emergencyRate > 10) riskScore += 5;
      riskFactors.emergencyVisitRate = Math.round(emergencyRate * 10) / 10;
    }

    // Factor 8: Prescription status (cancelled prescriptions = higher risk)
    if (prescriptionData.cancelled_prescriptions > 0) {
      const cancelledRate = prescriptionData.prescription_count > 0
        ? (prescriptionData.cancelled_prescriptions / prescriptionData.prescription_count) * 100
        : 0;
      if (cancelledRate > 30) riskScore += 10;
      else if (cancelledRate > 20) riskScore += 7;
      else if (cancelledRate > 10) riskScore += 5;
      riskFactors.prescriptionCancelledRate = Math.round(cancelledRate * 10) / 10;
    }

    // Factor 9: No active prescriptions but patient should have them
    if (prescriptionData.active_prescriptions === 0 && visitData.visit_count > 0) {
      riskScore += 10;
      riskFactors.noActivePrescriptions = true;
    }

    // Cap score at 100
    riskScore = Math.min(Math.round(riskScore * 10) / 10, 100);

    // Determine risk level and recommendations
    let riskLevel = 'LOW';
    let recommendations = 'Continue current treatment plan. Maintain regular appointments and medication adherence.';

    if (riskScore >= 70) {
      riskLevel = 'HIGH';
      recommendations = 'HIGH RISK DETECTED. Immediate intervention required. ' +
        'Schedule urgent follow-up appointment, review medication adherence, ' +
        'conduct comprehensive assessment, and consider additional support services. ' +
        'Monitor closely and provide intensive case management.';
    } else if (riskScore >= 50) {
      riskLevel = 'MEDIUM-HIGH';
      recommendations = 'Moderate to high risk detected. Schedule follow-up appointment within 2 weeks, ' +
        'review medication adherence, provide additional counseling, and consider support services. ' +
        'Monitor patient closely.';
    } else if (riskScore >= 40) {
      riskLevel = 'MEDIUM';
      recommendations = 'Moderate risk detected. Schedule follow-up appointment, ' +
        'review medication adherence, and provide additional counseling if needed. ' +
        'Monitor patient progress.';
    } else if (riskScore >= 20) {
      riskLevel = 'LOW-MEDIUM';
      recommendations = 'Low to moderate risk. Continue current treatment plan. ' +
        'Maintain regular appointments and medication adherence. ' +
        'Provide routine monitoring and support.';
    } else {
      riskLevel = 'LOW';
      recommendations = 'Low risk. Continue current treatment plan. ' +
        'Maintain regular appointments and medication adherence. ' +
        'Continue routine monitoring.';
    }

    // 7. Save to patient_risk_scores
    const risk_score_id = uuidv4();
    const riskFactorsJson = JSON.stringify(riskFactors);

    await connection.query(
      `INSERT INTO patient_risk_scores 
      (risk_score_id, patient_id, score, risk_factors, recommendations, calculated_by, calculated_on)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
      [risk_score_id, patientId, riskScore, riskFactorsJson, recommendations, calculatedBy]
    );

    // 8. Update patients.arpa_risk_score
    await connection.query(
      `UPDATE patients 
      SET arpa_risk_score = ?, arpa_last_calculated = CURRENT_DATE
      WHERE patient_id = ?`,
      [riskScore, patientId]
    );

    await connection.commit();

    // 9. Log calculation to audit_log (D8) if not skipped
    if (!options.skipAudit && calculatedBy) {
      const userInfo = await getUserInfoForAudit(calculatedBy);
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'ARPA Risk Assessment',
        entity_type: 'risk_score',
        entity_id: risk_score_id,
        record_id: patientId,
        new_value: {
          risk_score_id,
          patient_id: patientId,
          score: riskScore,
          risk_level: riskLevel,
          risk_factors: riskFactors,
        },
        change_summary: `ARPA risk score calculated for patient ${patient.first_name} ${patient.last_name} (UIC: ${patient.uic}): ${riskScore} (${riskLevel})`,
        ip_address: null, // Auto-calculated, no request object
        user_agent: 'ARPA Service',
        status: 'success',
      });
    }

    // Fetch the created risk score
    const [newScore] = await connection.query(
      `SELECT prs.*, u.username as calculated_by_name, u.full_name as calculated_by_full_name
       FROM patient_risk_scores prs
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE prs.risk_score_id = ?`,
      [risk_score_id]
    );

    const result = {
      ...newScore[0],
      risk_factors: typeof newScore[0].risk_factors === 'string' 
        ? JSON.parse(newScore[0].risk_factors) 
        : newScore[0].risk_factors,
      risk_level: riskLevel,
      risk_score: riskScore,
    };

    connection.release();
    return result;
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Get ARPA risk score history for a patient
 * @param {string} patientId - Patient ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<array>} Array of risk score records
 */
export async function getARPAHistory(patientId, limit = 10) {
  try {
    const [scores] = await db.query(
      `SELECT 
        prs.*, 
        u.username as calculated_by_name,
        u.full_name as calculated_by_full_name
       FROM patient_risk_scores prs
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE prs.patient_id = ?
       ORDER BY prs.calculated_on DESC, prs.risk_score_id DESC
       LIMIT ?`,
      [patientId, limit]
    );

    return scores.map(score => ({
      ...score,
      risk_factors: typeof score.risk_factors === 'string' 
        ? JSON.parse(score.risk_factors) 
        : score.risk_factors,
    }));
  } catch (error) {
    throw error;
  }
}

/**
 * Get current ARPA risk score for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<object|null>} Current risk score or null
 */
export async function getCurrentARPAScore(patientId) {
  try {
    const [patients] = await db.query(
      `SELECT 
        p.arpa_risk_score,
        p.arpa_last_calculated,
        prs.*,
        u.username as calculated_by_name,
        u.full_name as calculated_by_full_name
       FROM patients p
       LEFT JOIN patient_risk_scores prs ON p.patient_id = prs.patient_id
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE p.patient_id = ?
       ORDER BY prs.calculated_on DESC
       LIMIT 1`,
      [patientId]
    );

    if (patients.length === 0 || !patients[0].arpa_risk_score) {
      return null;
    }

    const result = patients[0];
    return {
      ...result,
      risk_factors: typeof result.risk_factors === 'string' 
        ? JSON.parse(result.risk_factors) 
        : result.risk_factors,
    };
  } catch (error) {
    throw error;
  }
}


import express from 'express';
import { db } from '../db.js';
import crypto from 'crypto';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';

const router = express.Router();

// GET /api/profile/me - Get current user's patient profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // First try to get patient via /api/auth/me logic
    const [users] = await db.query(
      "SELECT user_id, username, email, full_name, role, facility_id FROM users WHERE user_id = ?",
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    let patient = null;

    // Find patient record for any user role
    // Try multiple methods to find patient
    let [patients] = await db.query(
      "SELECT * FROM patients WHERE created_by = ?",
      [user.user_id]
    );
    
    if (patients.length === 0 && user.email) {
      [patients] = await db.query(
        "SELECT * FROM patients WHERE email = ? AND status = 'active'",
        [user.email]
      );
    }
    
    // If still not found, try by name matching
    if (patients.length === 0) {
      [patients] = await db.query(
        `SELECT * FROM patients 
         WHERE (CONCAT(first_name, ' ', last_name) LIKE ? OR email = ?)
         AND status = 'active'
         LIMIT 1`,
        [`%${user.full_name || user.username}%`, user.email || '']
      );
    }
    
    patient = patients[0] || null;

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient profile not found for this user' 
      });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== PATIENT IDENTIFIERS ====================

// Get all identifiers for a patient
router.get('/:patientId/identifiers', async (req, res) => {
  try {
    const [identifiers] = await db.query(
      'SELECT * FROM patient_identifiers WHERE patient_id = ? ORDER BY id_type',
      [req.params.patientId]
    );

    res.json({ success: true, data: identifiers });
  } catch (error) {
    console.error('Error fetching identifiers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch identifiers' });
  }
});

// Add identifier
router.post('/:patientId/identifiers', async (req, res) => {
  try {
    const { id_type, id_value, issued_at, expires_at, verified } = req.body;

    if (!id_type || !id_value) {
      return res.status(400).json({
        success: false,
        message: 'ID type and value are required',
      });
    }

    const identifier_id = crypto.randomUUID();

    await db.query(
      `INSERT INTO patient_identifiers 
      (identifier_id, patient_id, id_type, id_value, issued_at, expires_at, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [identifier_id, req.params.patientId, id_type, id_value, issued_at || null, expires_at || null, verified || false]
    );

    const [newIdentifier] = await db.query(
      'SELECT * FROM patient_identifiers WHERE identifier_id = ?',
      [identifier_id]
    );

    res.status(201).json({
      success: true,
      message: 'Identifier added successfully',
      data: newIdentifier[0],
    });
  } catch (error) {
    console.error('Error adding identifier:', error);
    res.status(500).json({ success: false, message: 'Failed to add identifier' });
  }
});

// Update identifier
router.put('/identifiers/:id', async (req, res) => {
  try {
    const { id_type, id_value, issued_at, expires_at, verified } = req.body;

    const [result] = await db.query(
      `UPDATE patient_identifiers 
      SET id_type = ?, id_value = ?, issued_at = ?, expires_at = ?, verified = ?
      WHERE identifier_id = ?`,
      [id_type, id_value, issued_at || null, expires_at || null, verified || false, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Identifier not found' });
    }

    const [updated] = await db.query(
      'SELECT * FROM patient_identifiers WHERE identifier_id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Identifier updated successfully',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error updating identifier:', error);
    res.status(500).json({ success: false, message: 'Failed to update identifier' });
  }
});

// Delete identifier
router.delete('/identifiers/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM patient_identifiers WHERE identifier_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Identifier not found' });
    }

    res.json({ success: true, message: 'Identifier deleted successfully' });
  } catch (error) {
    console.error('Error deleting identifier:', error);
    res.status(500).json({ success: false, message: 'Failed to delete identifier' });
  }
});

// ==================== PATIENT RISK SCORES ====================

// Get all risk scores for a patient
router.get('/:patientId/risk-scores', async (req, res) => {
  try {
    const [scores] = await db.query(
      `SELECT prs.*, u.username as calculated_by_name
       FROM patient_risk_scores prs
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE prs.patient_id = ?
       ORDER BY prs.calculated_on DESC`,
      [req.params.patientId]
    );

    // Parse JSON fields
    const scoresWithParsed = scores.map(score => ({
      ...score,
      risk_factors: typeof score.risk_factors === 'string' 
        ? JSON.parse(score.risk_factors) 
        : score.risk_factors,
    }));

    res.json({ success: true, data: scoresWithParsed });
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch risk scores' });
  }
});

// Calculate ARPA Risk Score (P2.4)
router.post('/:patientId/calculate-arpa', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const calculated_by = req.user.user_id;

    // 1. Query patients (D2) for basic info
    const [patients] = await db.query(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const patient = patients[0];

    // 2. Query clinical_visits (D3) → count visits, check adherence
    const [visits] = await db.query(
      `SELECT COUNT(*) as visit_count, 
              MAX(visit_date) as last_visit_date,
              MIN(visit_date) as first_visit_date
       FROM clinical_visits 
       WHERE patient_id = ?`,
      [patientId]
    );
    const visitData = visits[0] || { visit_count: 0 };

    // 3. Query prescriptions + medication_adherence (D4) → check medication compliance
    const [prescriptions] = await db.query(
      `SELECT COUNT(*) as prescription_count
       FROM prescriptions 
       WHERE patient_id = ? AND status = 'active'`,
      [patientId]
    );
    const prescriptionCount = prescriptions[0]?.prescription_count || 0;

    const [adherence] = await db.query(
      `SELECT AVG(adherence_percentage) as avg_adherence,
              COUNT(*) as adherence_records
       FROM medication_adherence 
       WHERE patient_id = ?`,
      [patientId]
    );
    const adherenceData = adherence[0] || { avg_adherence: 0, adherence_records: 0 };

    // 4. Query lab_results (D5) → check CD4, viral load trends
    const [labResults] = await db.query(
      `SELECT test_type, test_result, test_date
       FROM lab_results 
       WHERE patient_id = ? 
       ORDER BY test_date DESC
       LIMIT 10`,
      [patientId]
    );

    // Analyze lab trends
    const cd4Results = labResults.filter(r => r.test_type?.toLowerCase().includes('cd4'));
    const viralLoadResults = labResults.filter(r => r.test_type?.toLowerCase().includes('viral') || r.test_type?.toLowerCase().includes('vl'));

    // 5. Query appointments (D6) → check appointment attendance
    const [appointments] = await db.query(
      `SELECT COUNT(*) as total_appointments,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
              SUM(CASE WHEN status = 'missed' OR status = 'no_show' THEN 1 ELSE 0 END) as missed_appointments
       FROM appointments 
       WHERE patient_id = ?`,
      [patientId]
    );
    const appointmentData = appointments[0] || { 
      total_appointments: 0, 
      completed_appointments: 0, 
      missed_appointments: 0 
    };

    // 6. Calculate risk score based on factors
    let riskScore = 0;
    const riskFactors = {};

    // Factor 1: Visit frequency (lower visits = higher risk)
    const daysSinceLastVisit = visitData.last_visit_date 
      ? Math.floor((new Date() - new Date(visitData.last_visit_date)) / (1000 * 60 * 60 * 24))
      : 365;
    if (daysSinceLastVisit > 90) riskScore += 20;
    else if (daysSinceLastVisit > 60) riskScore += 10;
    else if (daysSinceLastVisit > 30) riskScore += 5;
    riskFactors.daysSinceLastVisit = daysSinceLastVisit;

    // Factor 2: Medication adherence (lower adherence = higher risk)
    const adherencePercent = adherenceData.avg_adherence || 0;
    if (adherencePercent < 80) riskScore += 25;
    else if (adherencePercent < 90) riskScore += 15;
    else if (adherencePercent < 95) riskScore += 5;
    riskFactors.medicationAdherence = adherencePercent;

    // Factor 3: Appointment attendance (more missed = higher risk)
    const missedRate = appointmentData.total_appointments > 0 
      ? (appointmentData.missed_appointments / appointmentData.total_appointments) * 100 
      : 0;
    if (missedRate > 30) riskScore += 20;
    else if (missedRate > 20) riskScore += 10;
    else if (missedRate > 10) riskScore += 5;
    riskFactors.appointmentMissedRate = missedRate;

    // Factor 4: Lab compliance (missing recent labs = higher risk)
    const daysSinceLastLab = labResults.length > 0 && labResults[0].test_date
      ? Math.floor((new Date() - new Date(labResults[0].test_date)) / (1000 * 60 * 60 * 24))
      : 365;
    if (daysSinceLastLab > 180) riskScore += 15;
    else if (daysSinceLastLab > 90) riskScore += 10;
    riskFactors.daysSinceLastLab = daysSinceLastLab;

    // Factor 5: CD4 trend (declining = higher risk)
    if (cd4Results.length >= 2) {
      const latestCD4 = parseFloat(cd4Results[0]?.test_result) || 0;
      const previousCD4 = parseFloat(cd4Results[1]?.test_result) || 0;
      if (latestCD4 < previousCD4 * 0.8) riskScore += 15;
      else if (latestCD4 < 200) riskScore += 10;
      riskFactors.cd4Trend = { latest: latestCD4, previous: previousCD4 };
    }

    // Factor 6: Viral load (detectable = higher risk)
    if (viralLoadResults.length > 0) {
      const latestVL = parseFloat(viralLoadResults[0]?.test_result) || 0;
      if (latestVL > 1000) riskScore += 20;
      else if (latestVL > 200) riskScore += 10;
      riskFactors.viralLoad = latestVL;
    }

    // Cap score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level and recommendations
    let riskLevel = 'LOW';
    let recommendations = 'Continue current treatment plan.';

    if (riskScore >= 70) {
      riskLevel = 'HIGH';
      recommendations = 'High risk detected. Immediate intervention required. Schedule urgent follow-up, review medication adherence, and consider additional support services.';
    } else if (riskScore >= 40) {
      riskLevel = 'MEDIUM';
      recommendations = 'Moderate risk detected. Schedule follow-up appointment, review medication adherence, and provide additional counseling if needed.';
    } else {
      riskLevel = 'LOW';
      recommendations = 'Low risk. Continue current treatment plan. Maintain regular appointments and medication adherence.';
    }

    // 7. Save to patient_risk_scores
    const risk_score_id = crypto.randomUUID();
    const riskFactorsJson = JSON.stringify({
      ...riskFactors,
      visitCount: visitData.visit_count,
      prescriptionCount,
      totalAppointments: appointmentData.total_appointments,
      completedAppointments: appointmentData.completed_appointments,
      missedAppointments: appointmentData.missed_appointments,
    });

    await db.query(
      `INSERT INTO patient_risk_scores 
      (risk_score_id, patient_id, score, risk_factors, recommendations, calculated_by, calculated_on)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
      [risk_score_id, patientId, riskScore, riskFactorsJson, recommendations, calculated_by]
    );

    // 8. Update patients.arpa_risk_score
    await db.query(
      `UPDATE patients 
      SET arpa_risk_score = ?, arpa_last_calculated = CURRENT_DATE
      WHERE patient_id = ?`,
      [riskScore, patientId]
    );

    // 9. Log calculation to audit_log (D8)
    const userInfo = await getUserInfoForAudit(calculated_by);

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
      change_summary: `ARPA risk score calculated for patient ${patient.first_name} ${patient.last_name}: ${riskScore} (${riskLevel})`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Fetch the created risk score
    const [newScore] = await db.query(
      `SELECT prs.*, u.username as calculated_by_name
       FROM patient_risk_scores prs
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE prs.risk_score_id = ?`,
      [risk_score_id]
    );

    const scoreWithParsed = {
      ...newScore[0],
      risk_factors: typeof newScore[0].risk_factors === 'string' 
        ? JSON.parse(newScore[0].risk_factors) 
        : newScore[0].risk_factors,
      risk_level: riskLevel,
    };

    res.status(201).json({
      success: true,
      message: 'ARPA risk score calculated successfully',
      data: scoreWithParsed,
    });
  } catch (error) {
    console.error('Error calculating ARPA risk score:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate ARPA risk score',
      error: error.message 
    });
  }
});

// Add risk score (manual entry)
router.post('/:patientId/risk-scores', authenticateToken, async (req, res) => {
  try {
    const { score, risk_factors, recommendations } = req.body;
    const calculated_by = req.user.user_id;

    if (!score) {
      return res.status(400).json({
        success: false,
        message: 'Risk score is required',
      });
    }

    const risk_score_id = crypto.randomUUID();
    const riskFactorsJson = risk_factors ? JSON.stringify(risk_factors) : null;

    await db.query(
      `INSERT INTO patient_risk_scores 
      (risk_score_id, patient_id, score, risk_factors, recommendations, calculated_by, calculated_on)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
      [risk_score_id, req.params.patientId, score, riskFactorsJson, recommendations || null, calculated_by]
    );

    // Update patient's ARPA risk score if this is the latest
    await db.query(
      `UPDATE patients 
      SET arpa_risk_score = ?, arpa_last_calculated = CURRENT_DATE
      WHERE patient_id = ?`,
      [score, req.params.patientId]
    );

    const [newScore] = await db.query(
      `SELECT prs.*, u.username as calculated_by_name
       FROM patient_risk_scores prs
       LEFT JOIN users u ON prs.calculated_by = u.user_id
       WHERE prs.risk_score_id = ?`,
      [risk_score_id]
    );

    const scoreWithParsed = {
      ...newScore[0],
      risk_factors: typeof newScore[0].risk_factors === 'string' 
        ? JSON.parse(newScore[0].risk_factors) 
        : newScore[0].risk_factors,
    };

    res.status(201).json({
      success: true,
      message: 'Risk score added successfully',
      data: scoreWithParsed,
    });
  } catch (error) {
    console.error('Error adding risk score:', error);
    res.status(500).json({ success: false, message: 'Failed to add risk score' });
  }
});

// ==================== PATIENT DOCUMENTS ====================

// Get all documents for a patient
router.get('/:patientId/documents', async (req, res) => {
  try {
    const { document_type } = req.query;

    let query = `SELECT pd.*, u.username as uploaded_by_name
                 FROM patient_documents pd
                 LEFT JOIN users u ON pd.uploaded_by = u.user_id
                 WHERE pd.patient_id = ?`;
    const params = [req.params.patientId];

    if (document_type) {
      query += ' AND pd.document_type = ?';
      params.push(document_type);
    }

    query += ' ORDER BY pd.uploaded_at DESC';

    const [documents] = await db.query(query, params);

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// Add document
router.post('/:patientId/documents', async (req, res) => {
  try {
    const { document_type, file_name, file_path, file_size, mime_type, uploaded_by } = req.body;

    if (!document_type || !file_name || !file_path) {
      return res.status(400).json({
        success: false,
        message: 'Document type, file name, and file path are required',
      });
    }

    const document_id = crypto.randomUUID();

    await db.query(
      `INSERT INTO patient_documents 
      (document_id, patient_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [document_id, req.params.patientId, document_type, file_name, file_path, file_size || null, mime_type || null, uploaded_by || null]
    );

    const [newDocument] = await db.query(
      `SELECT pd.*, u.username as uploaded_by_name
       FROM patient_documents pd
       LEFT JOIN users u ON pd.uploaded_by = u.user_id
       WHERE pd.document_id = ?`,
      [document_id]
    );

    res.status(201).json({
      success: true,
      message: 'Document added successfully',
      data: newDocument[0],
    });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ success: false, message: 'Failed to add document' });
  }
});

// Delete document
router.delete('/documents/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM patient_documents WHERE document_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

export default router;


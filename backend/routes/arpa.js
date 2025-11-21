import express from 'express';
import { authenticateToken } from './auth.js';
import { calculateARPARiskScore, getARPAHistory, getCurrentARPAScore } from '../services/arpaService.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { db } from '../db.js';

const router = express.Router();

// GET /api/arpa/patient/:patientId - Get current ARPA score for a patient
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check permissions
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // If patient role, verify they can only access their own score
    if (req.user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, patientId]
      );
      
      if (patients.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own risk score.',
        });
      }
    }

    const score = await getCurrentARPAScore(patientId);

    if (!score) {
      return res.json({
        success: true,
        message: 'No ARPA score calculated yet',
        data: null,
      });
    }

    // Determine risk level
    let riskLevel = 'LOW';
    if (score.score >= 70) riskLevel = 'HIGH';
    else if (score.score >= 50) riskLevel = 'MEDIUM-HIGH';
    else if (score.score >= 40) riskLevel = 'MEDIUM';
    else if (score.score >= 20) riskLevel = 'LOW-MEDIUM';

    res.json({
      success: true,
      data: {
        ...score,
        risk_level: riskLevel,
      },
    });
  } catch (error) {
    console.error('Get ARPA score error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET /api/arpa/patient/:patientId/history - Get ARPA score history
router.get('/patient/:patientId/history', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Check permissions
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // If patient role, verify they can only access their own history
    if (req.user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, patientId]
      );
      
      if (patients.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own risk score history.',
        });
      }
    }

    const history = await getARPAHistory(patientId, limit);

    // Add risk level to each record
    const historyWithLevels = history.map(score => {
      let riskLevel = 'LOW';
      if (score.score >= 70) riskLevel = 'HIGH';
      else if (score.score >= 50) riskLevel = 'MEDIUM-HIGH';
      else if (score.score >= 40) riskLevel = 'MEDIUM';
      else if (score.score >= 20) riskLevel = 'LOW-MEDIUM';

      return {
        ...score,
        risk_level: riskLevel,
      };
    });

    res.json({
      success: true,
      data: historyWithLevels,
    });
  } catch (error) {
    console.error('Get ARPA history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// POST /api/arpa/patient/:patientId/calculate - Manually trigger ARPA calculation
router.post('/patient/:patientId/calculate', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const calculatedBy = req.user.user_id;

    // Check permissions - only staff can manually trigger calculation
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only staff can manually calculate ARPA scores.',
      });
    }

    // Verify patient exists
    const [patients] = await db.query(
      'SELECT patient_id, first_name, last_name, uic FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const result = await calculateARPARiskScore(patientId, calculatedBy);

    res.status(201).json({
      success: true,
      message: 'ARPA risk score calculated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Calculate ARPA score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate ARPA risk score',
      error: error.message,
    });
  }
});

// GET /api/arpa/high-risk - Get all high-risk patients
router.get('/high-risk', authenticateToken, async (req, res) => {
  try {
    // Check permissions - only staff can view high-risk patients
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const threshold = parseFloat(req.query.threshold) || 50; // Default medium-high risk threshold

    const [patients] = await db.query(
      `SELECT 
        p.patient_id,
        p.uic,
        p.first_name,
        p.last_name,
        p.arpa_risk_score,
        p.arpa_last_calculated,
        f.facility_name
       FROM patients p
       LEFT JOIN facilities f ON p.facility_id = f.facility_id
       WHERE p.arpa_risk_score >= ? AND p.status = 'active'
       ORDER BY p.arpa_risk_score DESC, p.arpa_last_calculated DESC
       LIMIT 100`,
      [threshold]
    );

    const patientsWithLevels = patients.map(patient => {
      let riskLevel = 'LOW';
      if (patient.arpa_risk_score >= 70) riskLevel = 'HIGH';
      else if (patient.arpa_risk_score >= 50) riskLevel = 'MEDIUM-HIGH';
      else if (patient.arpa_risk_score >= 40) riskLevel = 'MEDIUM';
      else if (patient.arpa_risk_score >= 20) riskLevel = 'LOW-MEDIUM';

      return {
        ...patient,
        risk_level: riskLevel,
      };
    });

    res.json({
      success: true,
      data: patientsWithLevels,
      count: patientsWithLevels.length,
      threshold,
    });
  } catch (error) {
    console.error('Get high-risk patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

export default router;


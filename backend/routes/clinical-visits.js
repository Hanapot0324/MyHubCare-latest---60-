import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { calculateARPARiskScore } from '../services/arpaService.js';

const router = express.Router();

/* ---------------- HELPERS ---------------- */
function clean(obj) {
  const cleaned = {};
  for (const key in obj) {
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  }
  return cleaned;
}

const validVisitTypes = [
  'initial',
  'follow_up',
  'emergency',
  'routine',
  'art_pickup',
];
const validWhoStages = [
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Stage 4',
  'Not Applicable',
];
const validDiagnosisTypes = [
  'primary',
  'secondary',
  'differential',
  'rule_out',
];

/* ---------------- GET ALL VISITS ---------------- */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cv.*, CONCAT(p.first_name,' ',p.last_name) AS patientName
      FROM clinical_visits cv
      JOIN patients p ON cv.patient_id = p.patient_id
      ORDER BY cv.visit_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

/* ---------------- GET SINGLE VISIT + RELATED ---------------- */
router.get('/:id', async (req, res) => {
  try {
    const visitId = req.params.id;

    const [visitRows] = await db.query(
      `
      SELECT cv.*, 
             CONCAT(p.first_name,' ',p.last_name) AS patientName,
             u.full_name AS providerName,
             f.facility_name AS facilityName
      FROM clinical_visits cv
      JOIN patients p ON cv.patient_id = p.patient_id
      JOIN users u ON cv.provider_id = u.user_id
      JOIN facilities f ON cv.facility_id = f.facility_id
      WHERE cv.visit_id = ?
    `,
      [visitId]
    );

    if (!visitRows.length)
      return res.status(404).json({ error: 'Visit not found' });
    const visit = visitRows[0];

    const [vitals] = await db.query(
      'SELECT * FROM vital_signs WHERE visit_id = ?',
      [visitId]
    );
    const [diagnoses] = await db.query(
      'SELECT * FROM diagnoses WHERE visit_id = ?',
      [visitId]
    );
    const [procedures] = await db.query(
      'SELECT * FROM procedures WHERE visit_id = ?',
      [visitId]
    );

    visit.vital_signs = vitals;
    visit.diagnoses = diagnoses;
    visit.procedures = procedures;

    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

/* ---------------- CREATE VISIT ---------------- */
router.post('/', authenticateToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const body = clean(req.body);
    const visit_id = uuidv4();
    const provider_id = req.user.user_id; // Get from authenticated token

    // VALIDATE
    if (!body.patient_id) throw new Error('patient_id is required');
    if (!body.facility_id) throw new Error('facility_id is required');
    if (!validVisitTypes.includes(body.visit_type))
      throw new Error('Invalid visit_type');
    if (body.who_stage && !validWhoStages.includes(body.who_stage))
      throw new Error('Invalid who_stage');

    // INSERT VISIT
    const visitData = clean({
      patient_id: body.patient_id,
      provider_id: provider_id,
      facility_id: body.facility_id,
      visit_date: body.visit_date,
      visit_type: body.visit_type,
      who_stage: body.who_stage,
      chief_complaint: body.chief_complaint,
      clinical_notes: body.clinical_notes,
      assessment: body.assessment,
      plan: body.plan,
      follow_up_date: body.follow_up_date,
      follow_up_reason: body.follow_up_reason,
    });

    await conn.execute(
      `
      INSERT INTO clinical_visits (
        visit_id, patient_id, provider_id, facility_id, visit_date,
        visit_type, who_stage, chief_complaint, clinical_notes,
        assessment, plan, follow_up_date, follow_up_reason
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      [
        visit_id,
        visitData.patient_id,
        visitData.provider_id,
        visitData.facility_id,
        visitData.visit_date,
        visitData.visit_type,
        visitData.who_stage,
        visitData.chief_complaint,
        visitData.clinical_notes,
        visitData.assessment,
        visitData.plan,
        visitData.follow_up_date,
        visitData.follow_up_reason,
      ]
    );

    // INSERT VITAL SIGNS (optional)
    if (body.vital_signs) {
      const vs = clean(body.vital_signs);
      
      // Ensure all values are numbers or null (not undefined)
      const height_cm = vs.height_cm != null ? parseFloat(vs.height_cm) : null;
      const weight_kg = vs.weight_kg != null ? parseFloat(vs.weight_kg) : null;
      const systolic_bp = vs.systolic_bp != null ? parseInt(vs.systolic_bp) : null;
      const diastolic_bp = vs.diastolic_bp != null ? parseInt(vs.diastolic_bp) : null;
      const pulse_rate = vs.pulse_rate != null ? parseInt(vs.pulse_rate) : null;
      const temperature_c = vs.temperature_c != null ? parseFloat(vs.temperature_c) : null;
      const respiratory_rate = vs.respiratory_rate != null ? parseInt(vs.respiratory_rate) : null;
      const oxygen_saturation = vs.oxygen_saturation != null ? parseFloat(vs.oxygen_saturation) : null;
      
      // Calculate BMI: bmi = weight_kg / (height_cm/100)²
      let bmi = null;
      if (weight_kg != null && height_cm != null && height_cm > 0 && !isNaN(weight_kg) && !isNaN(height_cm)) {
        const heightInMeters = height_cm / 100;
        bmi = weight_kg / (heightInMeters * heightInMeters);
        bmi = Math.round(bmi * 100) / 100; // Round to 2 decimal places
      }

      await conn.execute(
        `
        INSERT INTO vital_signs (
          vital_id, visit_id, height_cm, weight_kg, bmi,
          systolic_bp, diastolic_bp, pulse_rate, temperature_c,
          respiratory_rate, oxygen_saturation, recorded_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `,
        [
          uuidv4(),
          visit_id,
          height_cm,
          weight_kg,
          bmi,
          systolic_bp,
          diastolic_bp,
          pulse_rate,
          temperature_c,
          respiratory_rate,
          oxygen_saturation,
          provider_id,
        ]
      );
    }

    // INSERT DIAGNOSES (optional array)
    if (Array.isArray(body.diagnoses)) {
      for (let d of body.diagnoses) {
        if (d.diagnosis_type && !validDiagnosisTypes.includes(d.diagnosis_type))
          throw new Error('Invalid diagnosis_type');
        const diag = clean(d);
        // Ensure boolean is properly handled (null/undefined -> false)
        const is_chronic = diag.is_chronic === true || diag.is_chronic === 1 || diag.is_chronic === '1';
        await conn.execute(
          `
          INSERT INTO diagnoses (
            diagnosis_id, visit_id, icd10_code, diagnosis_description,
            diagnosis_type, is_chronic, onset_date, resolved_date
          ) VALUES (?,?,?,?,?,?,?,?)
        `,
          [
            uuidv4(),
            visit_id,
            diag.icd10_code,
            diag.diagnosis_description,
            diag.diagnosis_type || 'primary',
            is_chronic ? 1 : 0, // Convert to 1/0 for MySQL boolean
            diag.onset_date,
            diag.resolved_date,
          ]
        );
      }
    }

    // INSERT PROCEDURES (optional array)
    if (Array.isArray(body.procedures)) {
      for (let p of body.procedures) {
        const proc = clean(p);
        await conn.execute(
          `
          INSERT INTO procedures (
            procedure_id, visit_id, cpt_code, procedure_name,
            procedure_description, outcome, performed_at
          ) VALUES (?,?,?,?,?,?,?)
        `,
          [
            uuidv4(),
            visit_id,
            proc.cpt_code,
            proc.procedure_name,
            proc.procedure_description,
            proc.outcome,
            proc.performed_at,
          ]
        );
      }
    }

    await conn.commit();

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(provider_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'CREATE',
      module: 'Clinical Visits',
      entity_type: 'clinical_visit',
      entity_id: visit_id,
      record_id: visit_id,
      new_value: {
        visit_id,
        patient_id: body.patient_id,
        visit_type: body.visit_type,
        visit_date: body.visit_date,
      },
      change_summary: `Created clinical visit for patient ${body.patient_id}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Auto-calculate ARPA risk score after visit creation
    try {
      await calculateARPARiskScore(body.patient_id, provider_id, { skipAudit: false });
    } catch (arpaError) {
      console.error('ARPA auto-calculation error after visit creation:', arpaError);
      // Don't fail the request if ARPA calculation fails
    }

    const [result] = await conn.query(
      `
      SELECT * FROM clinical_visits WHERE visit_id = ?
    `,
      [visit_id]
    );

    res.status(201).json(result[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create visit' });
  } finally {
    conn.release();
  }
});

/* ---------------- UPDATE VISIT ---------------- */
router.put('/:id', authenticateToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const body = clean(req.body);
    const visitId = req.params.id;
    const provider_id = req.user.user_id; // Get from authenticated token

    // Get old values for audit log
    const [oldVisitRows] = await conn.query(
      'SELECT * FROM clinical_visits WHERE visit_id=?',
      [visitId]
    );
    if (oldVisitRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Visit not found' });
    }
    const oldVisit = oldVisitRows[0];

    if (body.visit_type && !validVisitTypes.includes(body.visit_type)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid visit_type' });
    }
    if (body.who_stage && !validWhoStages.includes(body.who_stage)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid who_stage' });
    }

    await conn.execute(
      `
      UPDATE clinical_visits SET
        provider_id=?, facility_id=?, visit_date=?, visit_type=?, who_stage=?,
        chief_complaint=?, clinical_notes=?, assessment=?, plan=?,
        follow_up_date=?, follow_up_reason=?, updated_at=CURRENT_TIMESTAMP
      WHERE visit_id=?
    `,
      [
        provider_id,
        body.facility_id,
        body.visit_date,
        body.visit_type,
        body.who_stage,
        body.chief_complaint,
        body.clinical_notes,
        body.assessment,
        body.plan,
        body.follow_up_date,
        body.follow_up_reason,
        visitId,
      ]
    );

    // Handle diagnoses if provided
    if (Array.isArray(body.diagnoses)) {
      // Delete existing diagnoses for this visit
      await conn.execute('DELETE FROM diagnoses WHERE visit_id = ?', [visitId]);
      
      // Insert new diagnoses
      for (let d of body.diagnoses) {
        if (d.diagnosis_type && !validDiagnosisTypes.includes(d.diagnosis_type))
          throw new Error('Invalid diagnosis_type');
        const diag = clean(d);
        const is_chronic = diag.is_chronic === true || diag.is_chronic === 1 || diag.is_chronic === '1';
        await conn.execute(
          `
          INSERT INTO diagnoses (
            diagnosis_id, visit_id, icd10_code, diagnosis_description,
            diagnosis_type, is_chronic, onset_date, resolved_date
          ) VALUES (?,?,?,?,?,?,?,?)
        `,
          [
            diag.diagnosis_id || uuidv4(),
            visitId,
            diag.icd10_code,
            diag.diagnosis_description,
            diag.diagnosis_type || 'primary',
            is_chronic ? 1 : 0,
            diag.onset_date,
            diag.resolved_date,
          ]
        );
      }
    }

    // Handle procedures if provided
    if (Array.isArray(body.procedures)) {
      // Delete existing procedures for this visit
      await conn.execute('DELETE FROM procedures WHERE visit_id = ?', [visitId]);
      
      // Insert new procedures
      for (let p of body.procedures) {
        const proc = clean(p);
        await conn.execute(
          `
          INSERT INTO procedures (
            procedure_id, visit_id, cpt_code, procedure_name,
            procedure_description, outcome, performed_at
          ) VALUES (?,?,?,?,?,?,?)
        `,
          [
            proc.procedure_id || uuidv4(),
            visitId,
            proc.cpt_code,
            proc.procedure_name,
            proc.procedure_description,
            proc.outcome,
            proc.performed_at,
          ]
        );
      }
    }

    // Get updated values for audit log
    const [newVisitRows] = await conn.query(
      `SELECT cv.*, 
             CONCAT(p.first_name,' ',p.last_name) AS patientName,
             u.full_name AS providerName,
             f.facility_name AS facilityName
      FROM clinical_visits cv
      JOIN patients p ON cv.patient_id = p.patient_id
      JOIN users u ON cv.provider_id = u.user_id
      JOIN facilities f ON cv.facility_id = f.facility_id
      WHERE cv.visit_id = ?`,
      [visitId]
    );
    const newVisit = newVisitRows[0];

    // Get diagnoses and procedures
    const [diagnoses] = await conn.query(
      'SELECT * FROM diagnoses WHERE visit_id = ?',
      [visitId]
    );
    const [procedures] = await conn.query(
      'SELECT * FROM procedures WHERE visit_id = ?',
      [visitId]
    );

    newVisit.diagnoses = diagnoses;
    newVisit.procedures = procedures;

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(provider_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'UPDATE',
      module: 'Clinical Visits',
      entity_type: 'clinical_visit',
      entity_id: visitId,
      record_id: visitId,
      old_value: oldVisit,
      new_value: newVisit,
      change_summary: `Updated clinical visit ${visitId}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    await conn.commit();
    res.json(newVisit);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update visit' });
  } finally {
    conn.release();
  }
});

/* ---------------- DELETE VISIT ---------------- */
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM clinical_visits WHERE visit_id=?', [
      req.params.id,
    ]);
    res.json({ message: 'Visit deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

export default router;

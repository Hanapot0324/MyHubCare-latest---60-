import express from 'express';
import { db } from '../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';

const router = express.Router();

// GET /api/patients - Get all patients (for staff only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (
      !['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { search, sex, status = 'active' } = req.query;

    let query = `
      SELECT p.*, f.facility_name, u.username 
      FROM patients p
      LEFT JOIN facilities f ON p.facility_id = f.facility_id
      LEFT JOIN users u ON p.created_by = u.user_id
      WHERE p.status = ?
    `;

    const params = [status];

    if (search) {
      query += ` AND (
        CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
        p.uic LIKE ? OR
        p.contact_phone LIKE ? OR
        p.email LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (sex) {
      query += ' AND p.sex = ?';
      params.push(sex);
    }

    query += ' ORDER BY p.created_at DESC';

    const [patients] = await db.query(query, params);

    res.json({ success: true, patients });
  } catch (err) {
    console.error('Fetch patients error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patients/:id - Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [patients] = await db.query(
      `SELECT p.*, f.facility_name, f.facility_type
       FROM patients p
       LEFT JOIN facilities f ON p.facility_id = f.facility_id
       WHERE p.patient_id = ?`,
      [req.params.id]
    );

    if (patients.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    // Check if user has permission to view this patient
    const patient = patients[0];
    if (
      req.user.role === 'patient' &&
      patient.created_by !== req.user.user_id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, patient });
  } catch (err) {
    console.error('Fetch patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// POST /api/patients/register - Register a new patient (P2.1)
router.post('/register', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if user has permission (Admin/Physician only)
    if (!['admin', 'physician'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and physicians can register patients.',
      });
    }

    const {
      // Required fields (P2.1)
      firstName,
      middleName,
      lastName,
      suffix,
      birthDate,
      sex,
      motherName,
      fatherName,
      birthOrder,
      branch, // facility_id

      // Optional fields
      civilStatus,
      nationality,
      contactPhone,
      email,
      currentCity,
      currentProvince,
      philhealthNo,
    } = req.body;

    // Validate required fields (P2.1)
    if (
      !firstName ||
      !lastName ||
      !birthDate ||
      !sex ||
      !motherName ||
      !fatherName ||
      birthOrder === undefined || birthOrder === null ||
      !branch
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: first_name, last_name, birth_date, sex, mother_name, father_name, birth_order, facility_id',
      });
    }

    // Validate facility_id exists
    const [facilities] = await connection.query(
      'SELECT facility_id FROM facilities WHERE facility_id = ? AND is_active = TRUE',
      [branch]
    );

    if (facilities.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid facility/branch selected',
      });
    }

    const facility_id = facilities[0].facility_id;

    // Generate UIC (P2.1): Mother's first 2 letters + Father's first 2 letters + Birth order + DOB
    const generateUIC = (motherName, fatherName, birthOrder, birthDate) => {
      const date = new Date(birthDate);
      const motherLetters = (motherName ? motherName.substring(0, 2) : 'XX').toUpperCase();
      const fatherLetters = (fatherName ? fatherName.substring(0, 2) : 'XX').toUpperCase();
      const birthOrderStr = String(birthOrder || 1).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${motherLetters}${fatherLetters}${birthOrderStr}${month}-${day}-${year}`;
    };

    const uic = generateUIC(motherName, fatherName, birthOrder, birthDate);

    // Check for duplicate UIC in patients table (D2) (P2.1)
    const [existingPatients] = await connection.query(
      'SELECT patient_id FROM patients WHERE uic = ?',
      [uic]
    );

    if (existingPatients.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Patient with this UIC already exists. Please check mother\'s name, father\'s name, birth order, and date of birth.',
      });
    }

    try {
      // Generate UUIDs
      const patientId = crypto.randomUUID();

      // Create patient record (P2.1)
      const currentAddress = JSON.stringify({
        city: currentCity || null,
        province: currentProvince || null,
      });

      await connection.query(
        `INSERT INTO patients 
        (patient_id, uic, first_name, middle_name, last_name, suffix, 
         birth_date, sex, civil_status, nationality, contact_phone, email, 
         current_address, current_city, current_province, philhealth_no, 
         mother_name, father_name, birth_order,
         facility_id, created_by, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          patientId,
          uic,
          firstName,
          middleName || null,
          lastName,
          suffix || null,
          birthDate,
          sex,
          civilStatus || null,
          nationality || 'Filipino',
          contactPhone || null,
          email || null,
          currentAddress,
          currentCity || null,
          currentProvince || null,
          philhealthNo || null,
          motherName,
          fatherName,
          birthOrder,
          facility_id,
          req.user.user_id, // Created by admin/physician
        ]
      );

      // Commit transaction
      await connection.commit();

      // Get user info for audit log
      const userInfo = await getUserInfoForAudit(req.user.user_id);

      // Log audit entry for patient creation (P2.1 - Log to audit_log D8)
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Patients',
        entity_type: 'patient',
        entity_id: patientId,
        record_id: patientId,
        new_value: {
          patient_id: patientId,
          uic,
          first_name: firstName,
          last_name: lastName,
          email,
          facility_id,
        },
        change_summary: `New patient registered: ${firstName} ${lastName} (UIC: ${uic})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'success',
      });

      // Fetch the created patient
      const [newPatient] = await connection.query(
        'SELECT * FROM patients WHERE patient_id = ?',
        [patientId]
      );

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: {
          patient: newPatient[0],
          uic,
        },
      });
    } catch (error) {
      // Rollback transaction if error occurs
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Patient registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: err.message,
    });
  }
});

// PUT /api/patients/:id - Update patient (P2.2)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      // Personal information
      first_name,
      middle_name,
      last_name,
      suffix,
      birth_date,
      sex,
      civil_status,
      nationality,

      // Contact information
      contact_phone,
      email,
      current_city,
      current_province,
      philhealth_no,
      mother_name,
      father_name,
      birth_order,
      guardian_name,
      guardian_relationship,
    } = req.body;

    const [patients] = await db.query(
      'SELECT * FROM patients WHERE patient_id = ?',
      [req.params.id]
    );

    if (patients.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    // Check permissions
    const patient = patients[0];
    if (
      req.user.role === 'patient' &&
      patient.created_by !== req.user.user_id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const currentAddress = JSON.stringify({
      city: current_city,
      province: current_province,
    });

    // Build the update query dynamically based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }

    if (middle_name !== undefined) {
      updateFields.push('middle_name = ?');
      updateValues.push(middle_name);
    }

    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }

    if (suffix !== undefined) {
      updateFields.push('suffix = ?');
      updateValues.push(suffix);
    }

    if (birth_date !== undefined) {
      updateFields.push('birth_date = ?');
      updateValues.push(birth_date);
    }

    if (sex !== undefined) {
      updateFields.push('sex = ?');
      updateValues.push(sex);
    }

    if (civil_status !== undefined) {
      updateFields.push('civil_status = ?');
      updateValues.push(civil_status);
    }

    if (nationality !== undefined) {
      updateFields.push('nationality = ?');
      updateValues.push(nationality);
    }

    if (contact_phone !== undefined) {
      updateFields.push('contact_phone = ?');
      updateValues.push(contact_phone);
    }

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (current_city !== undefined) {
      updateFields.push('current_city = ?');
      updateValues.push(current_city);
    }

    if (current_province !== undefined) {
      updateFields.push('current_province = ?');
      updateValues.push(current_province);
    }

    if (philhealth_no !== undefined) {
      updateFields.push('philhealth_no = ?');
      updateValues.push(philhealth_no);
    }

    if (mother_name !== undefined) {
      updateFields.push('mother_name = ?');
      updateValues.push(mother_name);
    }

    if (father_name !== undefined) {
      updateFields.push('father_name = ?');
      updateValues.push(father_name);
    }

    if (birth_order !== undefined) {
      updateFields.push('birth_order = ?');
      updateValues.push(birth_order);
    }

    updateFields.push('current_address = ?');
    updateValues.push(currentAddress);

    if (guardian_name !== undefined) {
      updateFields.push('guardian_name = ?');
      updateValues.push(guardian_name);
    }

    if (guardian_relationship !== undefined) {
      updateFields.push('guardian_relationship = ?');
      updateValues.push(guardian_relationship);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(req.params.id);

    await db.query(
      `UPDATE patients SET ${updateFields.join(', ')} WHERE patient_id = ?`,
      updateValues
    );

    // Get updated patient data
    const [updatedPatients] = await db.query(
      `SELECT p.*, f.facility_name 
       FROM patients p
       LEFT JOIN facilities f ON p.facility_id = f.facility_id
       WHERE p.patient_id = ?`,
      [req.params.id]
    );

    const updatedPatient = updatedPatients[0];

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry for patient update
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'UPDATE',
      module: 'Patients',
      entity_type: 'patient',
      entity_id: req.params.id,
      record_id: req.params.id,
      old_value: patient,
      new_value: updatedPatient,
      change_summary: `Patient updated: ${updatedPatient.first_name} ${updatedPatient.last_name} (UIC: ${updatedPatient.uic})`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient: updatedPatient,
    });
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/patients/:id - Soft delete patient (change status to inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Only admins and physicians can delete patients
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. Only administrators and physicians can delete patients.',
      });
    }

    const [patients] = await db.query(
      'SELECT * FROM patients WHERE patient_id = ?',
      [req.params.id]
    );

    if (patients.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Patient not found' });
    }

    const patient = patients[0];

    // Soft delete - change status to inactive
    await db.query(
      "UPDATE patients SET status = 'inactive', updated_at = NOW() WHERE patient_id = ?",
      [req.params.id]
    );

    // Also deactivate associated user account
    await db.query(
      "UPDATE users SET status = 'inactive' WHERE user_id = (SELECT created_by FROM patients WHERE patient_id = ?)",
      [req.params.id]
    );

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry for patient deletion
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'DELETE',
      module: 'Patients',
      entity_type: 'patient',
      entity_id: req.params.id,
      record_id: req.params.id,
      old_value: patient,
      change_summary: `Patient deactivated: ${patient.first_name} ${patient.last_name} (UIC: ${patient.uic})`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Patient deactivated successfully',
    });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patients/stats/overview - Get patient statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Total active patients
    const [totalCount] = await db.query(
      "SELECT COUNT(*) as total FROM patients WHERE status = 'active'"
    );

    // By gender
    const [byGender] = await db.query(
      "SELECT sex, COUNT(*) as count FROM patients WHERE status = 'active' GROUP BY sex"
    );

    // By facility
    const [byFacility] = await db.query(
      `SELECT f.facility_name, COUNT(p.patient_id) as count
       FROM facilities f
       LEFT JOIN patients p ON f.facility_id = p.facility_id AND p.status = 'active'
       WHERE f.is_active = 1
       GROUP BY f.facility_id
       ORDER BY count DESC
       LIMIT 10`
    );

    // New patients this month
    const [newThisMonth] = await db.query(
      `SELECT COUNT(*) as count 
       FROM patients 
       WHERE status = 'active' 
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       AND YEAR(created_at) = YEAR(CURRENT_DATE())`
    );

    res.json({
      success: true,
      data: {
        total: totalCount[0].total,
        byGender: byGender,
        byFacility: byFacility,
        newThisMonth: newThisMonth[0].count,
      },
    });
  } catch (err) {
    console.error('Fetch patient stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

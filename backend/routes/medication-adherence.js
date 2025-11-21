import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { calculateARPARiskScore } from '../services/arpaService.js';

const router = express.Router();

// Track medication adherence (P4.6)
// Patient reports medication taken/missed → save to medication_adherence (D4)
router.post('/', async (req, res) => {
  let userInfo = null;

  try {
    const {
      prescription_id,
      patient_id,
      adherence_date,
      taken,
      missed_reason,
    } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Validate required fields
    if (!prescription_id || !patient_id || adherence_date === undefined || taken === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: prescription_id, patient_id, adherence_date, and taken',
      });
    }

    // Check if prescription exists
    const [prescriptionCheck] = await db.query(
      `SELECT p.prescription_id, p.prescription_number, p.start_date, p.end_date,
              pa.first_name, pa.last_name
       FROM prescriptions p
       JOIN patients pa ON p.patient_id = pa.patient_id
       WHERE p.prescription_id = ? AND p.patient_id = ?`,
      [prescription_id, patient_id]
    );

    if (prescriptionCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found for this patient',
      });
    }

    const prescription = prescriptionCheck[0];

    // Get prescription items to calculate total expected doses
    const [prescriptionItems] = await db.query(
      `SELECT pi.*, m.medication_name
       FROM prescription_items pi
       JOIN medications m ON pi.medication_id = m.medication_id
       WHERE pi.prescription_id = ?`,
      [prescription_id]
    );

    if (prescriptionItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No prescription items found',
      });
    }

    // Calculate total expected doses based on frequency and duration
    // This is a simplified calculation - you may need to adjust based on your frequency format
    let totalExpectedDoses = 0;
    const adherenceDate = new Date(adherence_date);
    const startDate = new Date(prescription.start_date);
    const endDate = prescription.end_date ? new Date(prescription.end_date) : null;

    // Check if adherence date is within prescription period
    if (adherenceDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'Adherence date is before prescription start date',
      });
    }

    if (endDate && adherenceDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Adherence date is after prescription end date',
      });
    }

    // Calculate days since start
    const daysSinceStart = Math.floor((adherenceDate - startDate) / (1000 * 60 * 60 * 24));

    // Calculate expected doses for each medication based on frequency
    for (const item of prescriptionItems) {
      let dosesPerDay = 1; // Default

      // Parse frequency to determine doses per day
      const frequency = item.frequency.toLowerCase();
      if (frequency.includes('once daily') || frequency.includes('once a day') || frequency.includes('daily')) {
        dosesPerDay = 1;
      } else if (frequency.includes('twice daily') || frequency.includes('twice a day') || frequency.includes('bid')) {
        dosesPerDay = 2;
      } else if (frequency.includes('three times') || frequency.includes('tid')) {
        dosesPerDay = 3;
      } else if (frequency.includes('four times') || frequency.includes('qid')) {
        dosesPerDay = 4;
      } else if (frequency.includes('every 12 hours')) {
        dosesPerDay = 2;
      } else if (frequency.includes('every 8 hours')) {
        dosesPerDay = 3;
      } else if (frequency.includes('every 6 hours')) {
        dosesPerDay = 4;
      }

      totalExpectedDoses += dosesPerDay * (daysSinceStart + 1);
    }

    // Get existing adherence records for this prescription
    const [existingAdherence] = await db.query(
      `SELECT COUNT(*) as total_records,
              SUM(CASE WHEN taken = TRUE THEN 1 ELSE 0 END) as taken_doses
       FROM medication_adherence
       WHERE prescription_id = ? AND adherence_date <= ?`,
      [prescription_id, adherence_date]
    );

    const existingTakenDoses = existingAdherence[0]?.taken_doses || 0;
    const existingTotalRecords = existingAdherence[0]?.total_records || 0;

    // Calculate new adherence percentage
    const newTakenDoses = taken ? existingTakenDoses + 1 : existingTakenDoses;
    const adherencePercentage = totalExpectedDoses > 0
      ? ((newTakenDoses / totalExpectedDoses) * 100).toFixed(2)
      : 0;

    // Check if adherence record already exists for this date
    const [existingRecord] = await db.query(
      'SELECT adherence_id FROM medication_adherence WHERE prescription_id = ? AND adherence_date = ?',
      [prescription_id, adherence_date]
    );

    let adherence_id;
    if (existingRecord.length > 0) {
      // Update existing record
      adherence_id = existingRecord[0].adherence_id;
      await db.query(
        `UPDATE medication_adherence SET
         taken = ?, missed_reason = ?, adherence_percentage = ?, recorded_at = NOW()
         WHERE adherence_id = ?`,
        [taken, missed_reason || null, adherencePercentage, adherence_id]
      );
    } else {
      // Create new record
      adherence_id = uuidv4();
      await db.query(
        `INSERT INTO medication_adherence (
          adherence_id, prescription_id, patient_id, adherence_date,
          taken, missed_reason, adherence_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          adherence_id,
          prescription_id,
          patient_id,
          adherence_date,
          taken,
          missed_reason || null,
          adherencePercentage,
        ]
      );
    }

    // Update medication_reminders.missed_doses if missed
    if (!taken) {
      // Get all reminders for this prescription
      const [reminders] = await db.query(
        'SELECT reminder_id, missed_doses FROM medication_reminders WHERE prescription_id = ?',
        [prescription_id]
      );

      for (const reminder of reminders) {
        const newMissedDoses = (reminder.missed_doses || 0) + 1;
        await db.query(
          'UPDATE medication_reminders SET missed_doses = ?, updated_at = NOW() WHERE reminder_id = ?',
          [newMissedDoses, reminder.reminder_id]
        );
      }
    }

    // Auto-calculate ARPA risk score after adherence update
    try {
      const userId = userInfo?.user_id || req.user?.user_id || null;
      if (userId) {
        await calculateARPARiskScore(patient_id, userId, { skipAudit: false });
      }
    } catch (arpaError) {
      console.error('ARPA auto-calculation error after adherence update:', arpaError);
      // Don't fail the request if ARPA calculation fails
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: taken ? 'ADHERENCE_RECORDED' : 'ADHERENCE_MISSED',
        module: 'Medication Adherence',
        entity_type: 'medication_adherence',
        entity_id: adherence_id,
        record_id: adherence_id,
        new_value: {
          prescription_id,
          patient_id,
          adherence_date,
          taken,
          adherence_percentage: parseFloat(adherencePercentage),
        },
        change_summary: `${taken ? 'Recorded' : 'Missed'} medication adherence for prescription ${prescription.prescription_number}. Adherence: ${adherencePercentage}%`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.status(201).json({
      success: true,
      message: `Medication adherence ${taken ? 'recorded' : 'marked as missed'} successfully`,
      data: {
        adherence_id,
        prescription_id,
        adherence_date,
        taken,
        adherence_percentage: parseFloat(adherencePercentage),
        total_expected_doses: totalExpectedDoses,
        taken_doses: newTakenDoses,
      },
    });
  } catch (error) {
    console.error('Error recording medication adherence:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'ADHERENCE_RECORD',
        module: 'Medication Adherence',
        entity_type: 'medication_adherence',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to record medication adherence',
      error: error.message,
    });
  }
});

// Get all adherence records (with optional filters)
// This must come BEFORE the specific routes like /prescription/:id and /patient/:id
router.get('/', async (req, res) => {
  try {
    const { patient_id, prescription_id, start_date, end_date } = req.query;

    let query = `
      SELECT ma.*, p.prescription_number, p.start_date as prescription_start_date, p.end_date as prescription_end_date,
             CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
      FROM medication_adherence ma
      JOIN prescriptions p ON ma.prescription_id = p.prescription_id
      JOIN patients pa ON ma.patient_id = pa.patient_id
      WHERE 1=1
    `;

    const params = [];

    if (patient_id) {
      query += ' AND ma.patient_id = ?';
      params.push(patient_id);
    }

    if (prescription_id) {
      query += ' AND ma.prescription_id = ?';
      params.push(prescription_id);
    }

    if (start_date) {
      query += ' AND ma.adherence_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND ma.adherence_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ma.adherence_date DESC';

    const [adherenceRecords] = await db.query(query, params);

    // Ensure adherence_percentage is a number
    const processedRecords = adherenceRecords.map(record => ({
      ...record,
      adherence_percentage: record.adherence_percentage !== null && record.adherence_percentage !== undefined
        ? parseFloat(record.adherence_percentage)
        : null,
    }));

    // Calculate overall adherence percentage
    let totalRecords = 0;
    let takenRecords = 0;

    processedRecords.forEach((record) => {
      totalRecords++;
      if (record.taken) {
        takenRecords++;
      }
    });

    const overallAdherence = totalRecords > 0 ? ((takenRecords / totalRecords) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: processedRecords,
      summary: {
        total_records: totalRecords,
        taken_records: takenRecords,
        missed_records: totalRecords - takenRecords,
        overall_adherence_percentage: parseFloat(overallAdherence),
      },
    });
  } catch (error) {
    console.error('Error fetching adherence records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch adherence records',
      error: error.message,
    });
  }
});

// Get adherence records for a prescription
router.get('/prescription/:prescription_id', async (req, res) => {
  try {
    const { prescription_id } = req.params;

    const [adherenceRecords] = await db.query(
      `SELECT ma.*, p.prescription_number, pa.first_name, pa.last_name
       FROM medication_adherence ma
       JOIN prescriptions p ON ma.prescription_id = p.prescription_id
       JOIN patients pa ON ma.patient_id = pa.patient_id
       WHERE ma.prescription_id = ?
       ORDER BY ma.adherence_date DESC`,
      [prescription_id]
    );

    res.json({
      success: true,
      data: adherenceRecords,
    });
  } catch (error) {
    console.error('Error fetching adherence records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch adherence records',
      error: error.message,
    });
  }
});

// Get adherence records for a patient
router.get('/patient/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT ma.*, p.prescription_number, p.start_date, p.end_date
      FROM medication_adherence ma
      JOIN prescriptions p ON ma.prescription_id = p.prescription_id
      WHERE ma.patient_id = ?
    `;

    const params = [patient_id];

    if (start_date) {
      query += ' AND ma.adherence_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND ma.adherence_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ma.adherence_date DESC';

    const [adherenceRecords] = await db.query(query, params);

    // Calculate overall adherence percentage
    let totalRecords = 0;
    let takenRecords = 0;

    adherenceRecords.forEach((record) => {
      totalRecords++;
      if (record.taken) {
        takenRecords++;
      }
    });

    const overallAdherence = totalRecords > 0 ? ((takenRecords / totalRecords) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: adherenceRecords,
      summary: {
        total_records: totalRecords,
        taken_records: takenRecords,
        missed_records: totalRecords - takenRecords,
        overall_adherence_percentage: parseFloat(overallAdherence),
      },
    });
  } catch (error) {
    console.error('Error fetching patient adherence records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient adherence records',
      error: error.message,
    });
  }
});

// Get adherence statistics for a prescription
router.get('/prescription/:prescription_id/statistics', async (req, res) => {
  try {
    const { prescription_id } = req.params;

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN taken = TRUE THEN 1 ELSE 0 END) as taken_doses,
        SUM(CASE WHEN taken = FALSE THEN 1 ELSE 0 END) as missed_doses,
        AVG(adherence_percentage) as average_adherence
       FROM medication_adherence
       WHERE prescription_id = ?`,
      [prescription_id]
    );

    const statistics = stats[0];
    const adherencePercentage = statistics.total_records > 0
      ? ((statistics.taken_doses / statistics.total_records) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        total_records: statistics.total_records || 0,
        taken_doses: statistics.taken_doses || 0,
        missed_doses: statistics.missed_doses || 0,
        adherence_percentage: parseFloat(adherencePercentage),
        average_adherence: parseFloat(statistics.average_adherence || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching adherence statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch adherence statistics',
      error: error.message,
    });
  }
});

// Get medication reminders
// This route must come BEFORE /prescription/:id routes to avoid conflicts
router.get('/reminders', async (req, res) => {
  try {
    const { patient_id, prescription_id, active } = req.query;

    let query = `
      SELECT 
        mr.*,
        p.prescription_number,
        CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
      FROM medication_reminders mr
      LEFT JOIN prescriptions p ON mr.prescription_id = p.prescription_id
      LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
      WHERE 1=1
    `;

    const params = [];

    if (patient_id) {
      query += ' AND mr.patient_id = ?';
      params.push(patient_id);
    }

    if (prescription_id) {
      query += ' AND mr.prescription_id = ?';
      params.push(prescription_id);
    }

    if (active !== undefined) {
      query += ' AND mr.active = ?';
      params.push(active === 'true' || active === true);
    }

    query += ' ORDER BY mr.reminder_time ASC, mr.created_at DESC';

    const [reminders] = await db.query(query, params);

    res.json({
      success: true,
      data: reminders,
      reminders: reminders, // Alias for compatibility
    });
  } catch (error) {
    console.error('Error fetching medication reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medication reminders',
      error: error.message,
    });
  }
});

// Create medication reminder
router.post('/reminders', async (req, res) => {
  let userInfo = null;

  try {
    const {
      patient_id,
      prescription_id,
      medication_name,
      dosage,
      frequency,
      reminder_time,
      active = true,
      browser_notifications = true,
      sound_preference = 'default',
      special_instructions,
    } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Validate required fields
    if (!patient_id || !medication_name || !frequency || !reminder_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, medication_name, frequency, and reminder_time',
      });
    }

    // Validate patient exists
    const [patientCheck] = await db.query(
      'SELECT patient_id FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // If prescription_id is provided, validate it
    if (prescription_id) {
      const [prescriptionCheck] = await db.query(
        'SELECT prescription_id FROM prescriptions WHERE prescription_id = ? AND patient_id = ?',
        [prescription_id, patient_id]
      );

      if (prescriptionCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found for this patient',
        });
      }
    }

    // Format reminder_time to HH:MM:SS if needed
    let formattedTime = reminder_time;
    if (reminder_time && !reminder_time.includes(':')) {
      formattedTime = `${reminder_time}:00`;
    } else if (reminder_time && reminder_time.split(':').length === 2) {
      formattedTime = `${reminder_time}:00`;
    }

    const reminder_id = uuidv4();

    // Insert reminder using all available columns from SQL structure
    await db.query(
      `INSERT INTO medication_reminders (
        reminder_id, prescription_id, patient_id, medication_name,
        dosage, frequency, reminder_time, sound_preference, 
        browser_notifications, special_instructions, active, missed_doses
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        reminder_id,
        prescription_id || null,
        patient_id,
        medication_name,
        dosage || null,
        frequency,
        formattedTime,
        sound_preference || 'default',
        browser_notifications !== false ? 1 : 0,
        special_instructions || null,
        active !== false ? 1 : 0,
      ]
    );

    // Fetch the created reminder
    const [createdReminder] = await db.query(
      `SELECT 
        mr.*,
        p.prescription_number,
        CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
      FROM medication_reminders mr
      LEFT JOIN prescriptions p ON mr.prescription_id = p.prescription_id
      LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
      WHERE mr.reminder_id = ?`,
      [reminder_id]
    );

    // Log audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'MEDICATION_REMINDER_CREATED',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: reminder_id,
        record_id: reminder_id,
        new_value: {
          reminder_id,
          patient_id,
          prescription_id,
          medication_name,
          frequency,
          reminder_time: formattedTime,
        },
        change_summary: `Created medication reminder for ${medication_name} at ${formattedTime}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Medication reminder created successfully',
      data: createdReminder[0],
    });
  } catch (error) {
    console.error('Error creating medication reminder:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'MEDICATION_REMINDER_CREATE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create medication reminder',
      error: error.message,
    });
  }
});

// Update medication reminder
router.put('/reminders/:id', async (req, res) => {
  let userInfo = null;

  try {
    const { id } = req.params;
    const {
      medication_name,
      dosage,
      frequency,
      reminder_time,
      active,
      browser_notifications,
      sound_preference,
      special_instructions,
    } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Check if reminder exists and get old values
    const [oldReminder] = await db.query(
      `SELECT mr.*, 
              CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
       FROM medication_reminders mr
       LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
       WHERE mr.reminder_id = ?`,
      [id]
    );

    if (oldReminder.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication reminder not found',
      });
    }

    const oldValue = oldReminder[0];

    // Format reminder_time to HH:MM:SS if needed
    let formattedTime = reminder_time || oldValue.reminder_time;
    if (reminder_time && !reminder_time.includes(':')) {
      formattedTime = `${reminder_time}:00`;
    } else if (reminder_time && reminder_time.split(':').length === 2) {
      formattedTime = `${reminder_time}:00`;
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (medication_name !== undefined) {
      updates.push('medication_name = ?');
      params.push(medication_name);
    }
    if (dosage !== undefined) {
      updates.push('dosage = ?');
      params.push(dosage);
    }
    if (frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(frequency);
    }
    if (reminder_time !== undefined) {
      updates.push('reminder_time = ?');
      params.push(formattedTime);
    }
    if (sound_preference !== undefined) {
      updates.push('sound_preference = ?');
      params.push(sound_preference);
    }
    if (browser_notifications !== undefined) {
      updates.push('browser_notifications = ?');
      params.push(browser_notifications ? 1 : 0);
    }
    if (special_instructions !== undefined) {
      updates.push('special_instructions = ?');
      params.push(special_instructions || null);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update',
      });
    }

    // Always update updated_at timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE medication_reminders SET ${updates.join(', ')} WHERE reminder_id = ?`;
    await db.query(query, params);

    // Fetch updated reminder
    const [updatedReminder] = await db.query(
      `SELECT mr.*, 
              p.prescription_number,
              CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
       FROM medication_reminders mr
       LEFT JOIN prescriptions p ON mr.prescription_id = p.prescription_id
       LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
       WHERE mr.reminder_id = ?`,
      [id]
    );

    // Log audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: id,
        record_id: id,
        old_value: {
          medication_name: oldValue.medication_name,
          dosage: oldValue.dosage,
          frequency: oldValue.frequency,
          reminder_time: oldValue.reminder_time,
          active: oldValue.active,
        },
        new_value: {
          medication_name: medication_name !== undefined ? medication_name : oldValue.medication_name,
          dosage: dosage !== undefined ? dosage : oldValue.dosage,
          frequency: frequency !== undefined ? frequency : oldValue.frequency,
          reminder_time: formattedTime,
          active: active !== undefined ? active : oldValue.active,
        },
        change_summary: `Updated medication reminder for ${updatedReminder[0].medication_name || oldValue.medication_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: 'Medication reminder updated successfully',
      data: updatedReminder[0],
    });
  } catch (error) {
    console.error('Error updating medication reminder:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update medication reminder',
      error: error.message,
    });
  }
});

// Delete medication reminder
router.delete('/reminders/:id', async (req, res) => {
  let userInfo = null;

  try {
    const { id } = req.params;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Check if reminder exists and get details
    const [reminderCheck] = await db.query(
      `SELECT mr.*, 
              CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
       FROM medication_reminders mr
       LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
       WHERE mr.reminder_id = ?`,
      [id]
    );

    if (reminderCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication reminder not found',
      });
    }

    const reminder = reminderCheck[0];

    // Delete reminder
    await db.query('DELETE FROM medication_reminders WHERE reminder_id = ?', [id]);

    // Log audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: id,
        record_id: id,
        old_value: reminder,
        change_summary: `Deleted medication reminder for ${reminder.medication_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: 'Medication reminder deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting medication reminder:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete medication reminder',
      error: error.message,
    });
  }
});

// Toggle medication reminder active status
router.put('/reminders/:id/toggle', async (req, res) => {
  let userInfo = null;

  try {
    const { id } = req.params;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Check if reminder exists and get current status
    const [reminderCheck] = await db.query(
      `SELECT mr.*, 
              CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
       FROM medication_reminders mr
       LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
       WHERE mr.reminder_id = ?`,
      [id]
    );

    if (reminderCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication reminder not found',
      });
    }

    const reminder = reminderCheck[0];
    const newActiveStatus = !reminder.active;

    // Toggle active status
    await db.query(
      'UPDATE medication_reminders SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE reminder_id = ?',
      [newActiveStatus ? 1 : 0, id]
    );

    // Fetch updated reminder
    const [updatedReminder] = await db.query(
      `SELECT mr.*, 
              p.prescription_number,
              CONCAT(pa.first_name, ' ', pa.last_name) as patient_name
       FROM medication_reminders mr
       LEFT JOIN prescriptions p ON mr.prescription_id = p.prescription_id
       LEFT JOIN patients pa ON mr.patient_id = pa.patient_id
       WHERE mr.reminder_id = ?`,
      [id]
    );

    // Log audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: id,
        record_id: id,
        old_value: {
          active: reminder.active,
        },
        new_value: {
          active: newActiveStatus,
        },
        change_summary: `${newActiveStatus ? 'Activated' : 'Deactivated'} medication reminder for ${reminder.medication_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: `Medication reminder ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
      data: updatedReminder[0],
    });
  } catch (error) {
    console.error('Error toggling medication reminder:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Medication Adherence',
        entity_type: 'medication_reminder',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to toggle medication reminder',
      error: error.message,
    });
  }
});

export default router;









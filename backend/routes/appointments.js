import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { notifyAppointmentCreated } from './notifications.js';

const router = express.Router();

// Socket.IO instance (will be set by server.js)
let io = null;

// Function to set Socket.IO instance
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Helper function to clean undefined values
function clean(obj) {
  const cleaned = {};
  for (const key in obj) {
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  }
  return cleaned;
}

// GET /api/appointments - Get all appointments with filters
router.get('/', authenticateToken, async (req, res) => {
  console.log('=== GET /api/appointments ===');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request query:', JSON.stringify(req.query, null, 2));
  console.log('Request user:', JSON.stringify(req.user, null, 2));
  
  try {
    const { 
      patient_id, 
      provider_id, 
      facility_id, 
      status, 
      date_from, 
      date_to,
      appointment_type 
    } = req.query;

    console.log('Query parameters:', {
      patient_id,
      provider_id,
      facility_id,
      status,
      date_from,
      date_to,
      appointment_type
    });

    let query = `
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name,
        u2.full_name AS booked_by_name,
        u3.full_name AS cancelled_by_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u2 ON a.booked_by = u2.user_id
      LEFT JOIN users u3 ON a.cancelled_by = u3.user_id
      WHERE 1=1
    `;

    const params = [];

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    if (provider_id) {
      query += ' AND a.provider_id = ?';
      params.push(provider_id);
    }

    if (facility_id) {
      query += ' AND a.facility_id = ?';
      params.push(facility_id);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (appointment_type) {
      query += ' AND a.appointment_type = ?';
      params.push(appointment_type);
    }

    if (date_from) {
      query += ' AND DATE(a.scheduled_start) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(a.scheduled_start) <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY a.scheduled_start ASC';

    console.log('Executing query:', query);
    console.log('Query params:', params);

    const [appointments] = await db.query(query, params);

    console.log('Query successful. Found', appointments.length, 'appointments');

    res.json({ 
      success: true, 
      data: appointments 
    });
  } catch (error) {
    console.error('=== ERROR fetching appointments ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointments',
      error: error.message 
    });
  }
});

// GET /api/appointments/date/:date - Get appointments for a specific date
// NOTE: This route must come BEFORE /:id to avoid route conflicts
router.get('/date/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;

    const [appointments] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name,
        u2.full_name AS booked_by_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u2 ON a.booked_by = u2.user_id
      WHERE DATE(a.scheduled_start) = ?
      ORDER BY a.scheduled_start ASC
    `, [date]);

    res.json({ 
      success: true, 
      data: appointments 
    });
  } catch (error) {
    console.error('Error fetching appointments by date:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointments',
      error: error.message 
    });
  }
});

// GET /api/appointments/:id - Get single appointment
// NOTE: This route must come AFTER /date/:date to avoid route conflicts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [appointments] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name,
        u2.full_name AS booked_by_name,
        u3.full_name AS cancelled_by_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u2 ON a.booked_by = u2.user_id
      LEFT JOIN users u3 ON a.cancelled_by = u3.user_id
      WHERE a.appointment_id = ?
    `, [id]);

    if (appointments.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment not found' 
      });
    }

    res.json({ 
      success: true, 
      data: appointments[0] 
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointment',
      error: error.message 
    });
  }
});

// GET /api/appointments/availability/check - Check availability for a specific time slot
router.get('/availability/check', authenticateToken, async (req, res) => {
  try {
    const { provider_id, facility_id, scheduled_start, scheduled_end, duration_minutes = 30 } = req.query;

    if (!facility_id || !scheduled_start || !scheduled_end) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: facility_id, scheduled_start, scheduled_end'
      });
    }

    const startDate = new Date(scheduled_start);
    const endDate = new Date(scheduled_end);
    const slotDate = startDate.toISOString().split('T')[0];
    const startTime = startDate.toTimeString().slice(0, 8);
    const endTime = endDate.toTimeString().slice(0, 8);

    // Check availability slots
    let availabilityQuery = `
      SELECT slot_id, slot_status, appointment_id
      FROM availability_slots
      WHERE facility_id = ? 
        AND slot_date = ?
        AND start_time <= ?
        AND end_time >= ?
        AND slot_status = 'available'
    `;
    const availabilityParams = [facility_id, slotDate, endTime, startTime];

    if (provider_id) {
      availabilityQuery += ' AND provider_id = ?';
      availabilityParams.push(provider_id);
    }

    const [availableSlots] = await db.query(availabilityQuery, availabilityParams);

    // Check if any slots exist for this facility/provider (to determine if slot system is in use)
    let slotCheckQuery = `
      SELECT COUNT(*) as slot_count
      FROM availability_slots
      WHERE facility_id = ?
    `;
    const slotCheckParams = [facility_id];
    
    if (provider_id) {
      slotCheckQuery += ' AND provider_id = ?';
      slotCheckParams.push(provider_id);
    }
    
    const [slotCountResult] = await db.query(slotCheckQuery, slotCheckParams);
    const hasSlotsDefined = slotCountResult[0].slot_count > 0;

    // Check for conflicting appointments
    let conflictQuery = `
      SELECT appointment_id
      FROM appointments
      WHERE facility_id = ?
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (scheduled_start < ? AND scheduled_end > ?) OR
          (scheduled_start < ? AND scheduled_end > ?) OR
          (scheduled_start >= ? AND scheduled_end <= ?)
        )
    `;
    const conflictParams = [
      facility_id,
      scheduled_start, scheduled_start,
      scheduled_end, scheduled_end,
      scheduled_start, scheduled_end
    ];

    if (provider_id) {
      conflictQuery += ' AND provider_id = ?';
      conflictParams.push(provider_id);
    }

    const [conflicts] = await db.query(conflictQuery, conflictParams);

    // If slots are defined, require an available slot. If no slots exist, allow booking (slots not set up yet)
    const isAvailable = conflicts.length === 0 && (!hasSlotsDefined || availableSlots.length > 0);

    res.json({
      success: true,
      data: {
        available: isAvailable,
        available_slots: availableSlots,
        conflicts: conflicts,
        slot_id: isAvailable ? availableSlots[0].slot_id : null
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', authenticateToken, async (req, res) => {
  console.log('=== POST /api/appointments ===');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request user:', JSON.stringify(req.user, null, 2));
  
  try {
    const {
      patient_id,
      provider_id,
      facility_id,
      appointment_type,
      scheduled_start,
      scheduled_end,
      duration_minutes = 30,
      reason,
      notes,
      slot_id // Optional: if provided, use this specific slot
    } = req.body;

    console.log('Parsed body fields:', {
      patient_id,
      provider_id,
      facility_id,
      appointment_type,
      scheduled_start,
      scheduled_end,
      duration_minutes,
      reason,
      notes,
      slot_id
    });

    // Auto-populate patient_id if user is a patient and patient_id is not provided
    let finalPatientId = patient_id;
    if (!finalPatientId && req.user.role === 'patient') {
      console.log('Patient ID not provided, but user is a patient. Looking up patient record...');
      
      // Try to find patient by user_id (created_by)
      let [patients] = await db.query(
        'SELECT patient_id FROM patients WHERE created_by = ? AND status = "active"',
        [req.user.user_id]
      );
      
      // If not found, try by email
      if (patients.length === 0) {
        const [users] = await db.query('SELECT email FROM users WHERE user_id = ?', [req.user.user_id]);
        if (users.length > 0 && users[0].email) {
          [patients] = await db.query(
            'SELECT patient_id FROM patients WHERE email = ? AND status = "active"',
            [users[0].email]
          );
        }
      }
      
      if (patients.length > 0) {
        finalPatientId = patients[0].patient_id;
        console.log('Found patient_id from user profile:', finalPatientId);
      } else {
        console.error('=== ERROR: Could not find patient record for user ===');
        console.error('User ID:', req.user.user_id);
        return res.status(400).json({
          success: false,
          message: 'Patient record not found. Please ensure your account is linked to a patient profile.'
        });
      }
    }

    // Validation
    if (!finalPatientId || !facility_id || !appointment_type || !scheduled_start || !scheduled_end) {
      console.error('=== VALIDATION ERROR ===');
      console.error('Missing fields:', {
        patient_id: !finalPatientId,
        facility_id: !facility_id,
        appointment_type: !appointment_type,
        scheduled_start: !scheduled_start,
        scheduled_end: !scheduled_end
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, facility_id, appointment_type, scheduled_start, scheduled_end'
      });
    }

    // Validate appointment type
    const validTypes = ['follow_up', 'art_pickup', 'lab_test', 'counseling', 'general', 'initial'];
    if (!validTypes.includes(appointment_type)) {
      console.error('=== VALIDATION ERROR: Invalid appointment_type ===');
      console.error('Received appointment_type:', appointment_type);
      console.error('Valid types:', validTypes);
      return res.status(400).json({
        success: false,
        message: `Invalid appointment_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check if patient exists
    const [patients] = await db.query('SELECT patient_id FROM patients WHERE patient_id = ?', [finalPatientId]);
    if (patients.length === 0) {
      console.error('=== ERROR: Patient not found ===');
      console.error('Patient ID:', finalPatientId);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if facility exists
    const [facilities] = await db.query('SELECT facility_id FROM facilities WHERE facility_id = ?', [facility_id]);
    if (facilities.length === 0) {
      console.error('=== ERROR: Facility not found ===');
      console.error('Facility ID:', facility_id);
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if provider exists (if provided)
    if (provider_id) {
      const [providers] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [provider_id]);
      if (providers.length === 0) {
        console.error('=== ERROR: Provider not found ===');
        console.error('Provider ID:', provider_id);
        return res.status(404).json({
          success: false,
          message: 'Provider not found'
        });
      }
    }

    // Check availability
    const startDate = new Date(scheduled_start);
    const endDate = new Date(scheduled_end);
    const slotDate = startDate.toISOString().split('T')[0];
    const startTime = startDate.toTimeString().slice(0, 8);
    const endTime = endDate.toTimeString().slice(0, 8);

    // Check for conflicting appointments
    let conflictQuery = `
      SELECT appointment_id
      FROM appointments
      WHERE facility_id = ?
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (scheduled_start < ? AND scheduled_end > ?) OR
          (scheduled_start < ? AND scheduled_end > ?) OR
          (scheduled_start >= ? AND scheduled_end <= ?)
        )
    `;
    const conflictParams = [
      facility_id,
      scheduled_start, scheduled_start,
      scheduled_end, scheduled_end,
      scheduled_start, scheduled_end
    ];

    if (provider_id) {
      conflictQuery += ' AND provider_id = ?';
      conflictParams.push(provider_id);
    }

    const [conflicts] = await db.query(conflictQuery, conflictParams);

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is not available. There is a conflicting appointment.'
      });
    }

    // Check if availability slots system is in use for this facility/provider
    let slotCheckQuery = `
      SELECT COUNT(*) as slot_count
      FROM availability_slots
      WHERE facility_id = ?
    `;
    const slotCheckParams = [facility_id];
    
    if (provider_id) {
      slotCheckQuery += ' AND provider_id = ?';
      slotCheckParams.push(provider_id);
    }
    
    const [slotCountResult] = await db.query(slotCheckQuery, slotCheckParams);
    const hasSlotsDefined = slotCountResult[0].slot_count > 0;

    // Check availability slots if slot_id is provided, otherwise find available slot
    let selectedSlotId = slot_id;
    if (hasSlotsDefined) {
      // Only enforce slot checking if slots are defined
      if (!selectedSlotId) {
        let availabilityQuery = `
          SELECT slot_id
          FROM availability_slots
          WHERE facility_id = ? 
            AND slot_date = ?
            AND start_time <= ?
            AND end_time >= ?
            AND slot_status = 'available'
        `;
        const availabilityParams = [facility_id, slotDate, endTime, startTime];

        if (provider_id) {
          availabilityQuery += ' AND provider_id = ?';
          availabilityParams.push(provider_id);
        }

        availabilityQuery += ' LIMIT 1';
        const [availableSlots] = await db.query(availabilityQuery, availabilityParams);

        if (availableSlots.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No available slots found for the selected time.'
          });
        }

        selectedSlotId = availableSlots[0].slot_id;
      } else {
        // Verify the provided slot is available
        const [slotCheck] = await db.query(`
          SELECT slot_id, slot_status
          FROM availability_slots
          WHERE slot_id = ? AND slot_status = 'available'
        `, [selectedSlotId]);

        if (slotCheck.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'The selected slot is not available.'
          });
        }
      }
    }
    // If no slots are defined, allow booking without slot assignment (selectedSlotId remains null)

    const appointment_id = uuidv4();
    const booked_by = req.user.user_id;

    const appointmentData = clean({
      appointment_id,
      patient_id: finalPatientId,
      provider_id: provider_id || null,
      facility_id,
      appointment_type,
      scheduled_start,
      scheduled_end,
      duration_minutes,
      status: 'scheduled', // Set to scheduled - provider can accept/decline via notifications
      reason: reason || null,
      notes: notes || null,
      booked_by,
      booked_at: new Date()
    });

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Insert appointment
      await db.query(`
        INSERT INTO appointments (
          appointment_id, patient_id, provider_id, facility_id, appointment_type,
          scheduled_start, scheduled_end, duration_minutes, status, reason, notes,
          booked_by, booked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        appointmentData.appointment_id,
        appointmentData.patient_id,
        appointmentData.provider_id,
        appointmentData.facility_id,
        appointmentData.appointment_type,
        appointmentData.scheduled_start,
        appointmentData.scheduled_end,
        appointmentData.duration_minutes,
        appointmentData.status,
        appointmentData.reason,
        appointmentData.notes,
        appointmentData.booked_by,
        appointmentData.booked_at
      ]);

      // Update availability slot only if a slot was assigned
      if (selectedSlotId) {
        await db.query(`
          UPDATE availability_slots
          SET slot_status = 'booked',
              appointment_id = ?
          WHERE slot_id = ?
        `, [appointment_id, selectedSlotId]);
      }

      // Commit transaction first
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    // Create appointment reminders (24 hours before appointment) - outside transaction
    // Don't fail appointment creation if reminder creation fails
    try {
      const { createAppointmentReminders } = await import('../services/reminderService.js');
      const reminderResult = await createAppointmentReminders(appointment_id, scheduledStart);
      if (!reminderResult.success) {
        console.warn('Warning: Failed to create appointment reminders:', reminderResult.error);
        // Don't throw - appointment was created successfully
      }
    } catch (reminderError) {
      console.error('Error creating appointment reminders (non-fatal):', reminderError);
      // Don't throw - appointment was created successfully
    }

    // Log audit
    const userInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      action: 'CREATE',
      table_name: 'appointments',
      record_id: appointment_id,
      user_id: req.user.user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify(appointmentData)
    });

    // Fetch the created appointment with joins
    const [created] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name,
        f.address AS facility_address,
        u2.full_name AS booked_by_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u2 ON a.booked_by = u2.user_id
      WHERE a.appointment_id = ?
    `, [appointment_id]);

    const createdAppointment = created[0];

    // Create in-app notifications for provider and case managers (informational only)
    // Don't fail appointment creation if notification creation fails
    let notificationResult = { success: false, notifications: [] };
    try {
      notificationResult = await notifyAppointmentCreated(createdAppointment);
      console.log('=== Notification Result ===');
      console.log('Success:', notificationResult.success);
      console.log('Notifications created:', notificationResult.notifications?.length || 0);
    } catch (notificationError) {
      console.error('Error creating notifications (non-fatal):', notificationError);
      // Don't throw - appointment was created successfully
    }
    
    // Emit socket events to notify users in real-time
    if (io) {
      // Get ALL STAFF (admin, physician, nurse, case_manager, lab_personnel) and notify them
      const [allStaff] = await db.query(`
        SELECT user_id, role FROM users 
        WHERE role IN ('admin', 'physician', 'nurse', 'case_manager', 'lab_personnel')
          AND status = 'active'
      `);
      
      console.log('=== Emitting real-time notifications to staff ===');
      console.log('Staff count:', allStaff.length);
      
      // Emit to all staff members
      allStaff.forEach(staff => {
        console.log(`Emitting notification to ${staff.role} (${staff.user_id})`);
        io.to(`user_${staff.user_id}`).emit('newNotification', {
          type: 'appointment_created',
          title: 'New Appointment Scheduled',
          message: `A new appointment has been scheduled for ${createdAppointment.patient_name} on ${new Date(createdAppointment.scheduled_start).toLocaleDateString()}`,
          appointment_id: appointment_id,
          patient_id: finalPatientId,
          timestamp: new Date().toISOString()
        });
      });
      
      // Also emit to patient about their appointment
      const [patientUsers] = await db.query(`
        SELECT u.user_id 
        FROM patients p
        LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
        WHERE p.patient_id = ?
        LIMIT 1
      `, [finalPatientId]);
      
      if (patientUsers.length > 0) {
        const patientUserId = patientUsers[0].user_id;
        console.log(`Emitting notification to patient (${patientUserId})`);
        // Emit to patient's user room to trigger notification refresh
        io.to(`user_${patientUserId}`).emit('newNotification', {
          type: 'appointment_created',
          title: 'Appointment Scheduled',
          message: `Your appointment has been scheduled for ${new Date(createdAppointment.scheduled_start).toLocaleDateString()} at ${createdAppointment.facility_name}`,
          appointment_id: appointment_id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.warn('Socket.IO not available - real-time notifications will not be sent');
    }

    console.log('=== Appointment created successfully ===');
    console.log('Appointment ID:', appointment_id);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: createdAppointment
    });
  } catch (error) {
    console.error('=== ERROR creating appointment ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message
    });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      provider_id,
      facility_id,
      appointment_type,
      scheduled_start,
      scheduled_end,
      duration_minutes,
      status,
      reason,
      notes
    } = req.body;

    // Check if appointment exists
    const [existing] = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const oldData = existing[0];

    // Validate appointment type if provided
    if (appointment_type) {
      const validTypes = ['follow_up', 'art_pickup', 'lab_test', 'counseling', 'general', 'initial'];
      if (!validTypes.includes(appointment_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid appointment_type. Must be one of: ${validTypes.join(', ')}`
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['pending_provider_confirmation', 'pending_patient_confirmation', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (provider_id !== undefined) {
      updates.push('provider_id = ?');
      params.push(provider_id);
    }
    if (facility_id !== undefined) {
      updates.push('facility_id = ?');
      params.push(facility_id);
    }
    if (appointment_type !== undefined) {
      updates.push('appointment_type = ?');
      params.push(appointment_type);
    }
    if (scheduled_start !== undefined) {
      updates.push('scheduled_start = ?');
      params.push(scheduled_start);
    }
    if (scheduled_end !== undefined) {
      updates.push('scheduled_end = ?');
      params.push(scheduled_end);
    }
    if (duration_minutes !== undefined) {
      updates.push('duration_minutes = ?');
      params.push(duration_minutes);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await db.query(`
      UPDATE appointments 
      SET ${updates.join(', ')}
      WHERE appointment_id = ?
    `, params);

    // Log audit
    const userInfo = await getUserInfoForAudit(req.user.user_id);
    const newData = { ...oldData, ...req.body };
    await logAudit({
      action: 'UPDATE',
      table_name: 'appointments',
      record_id: id,
      user_id: req.user.user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify({ old: oldData, new: newData })
    });

    // Fetch updated appointment
    const [updated] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name,
        u2.full_name AS booked_by_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u2 ON a.booked_by = u2.user_id
      WHERE a.appointment_id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
});

// DELETE /api/appointments/:id - Cancel/Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // Check if appointment exists
    const [existing] = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update appointment status to cancelled instead of deleting
    await db.query(`
      UPDATE appointments 
      SET status = 'cancelled',
          cancelled_at = ?,
          cancelled_by = ?,
          cancellation_reason = ?
      WHERE appointment_id = ?
    `, [
      new Date(),
      req.user.user_id,
      cancellation_reason || null,
      id
    ]);

    // Log audit
    const userInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      action: 'DELETE',
      table_name: 'appointments',
      record_id: id,
      user_id: req.user.user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify({ cancellation_reason })
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
});

// POST /api/appointments/:id/accept - Physician accepts appointment
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const user_role = req.user.role;

    // Only physicians can accept appointments
    if (user_role !== 'physician' && user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only physicians can accept appointments'
      });
    }

    // Check if appointment exists
    const [existing] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointment = existing[0];

    // Check if provider matches (unless admin)
    if (user_role === 'physician' && appointment.provider_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept appointments assigned to you'
      });
    }

    // Update appointment status to 'confirmed' (provider has accepted)
    // Note: Database enum doesn't have 'pending_patient_confirmation', so we use 'confirmed'
    await db.query(`
      UPDATE appointments 
      SET status = 'confirmed'
      WHERE appointment_id = ?
    `, [id]);

    // Fetch updated appointment
    const [updated] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ?
    `, [id]);

    // Notify patient that provider accepted
    const { notifyAppointmentProviderAccepted } = await import('./notifications.js');
    await notifyAppointmentProviderAccepted(updated[0]);

    // Log audit
    const userInfo = await getUserInfoForAudit(user_id);
    await logAudit({
      action: 'UPDATE',
      table_name: 'appointments',
      record_id: id,
      user_id: user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify({ status: 'pending_patient_confirmation', action: 'accepted' })
    });

    // Emit socket event
    if (io) {
      io.to(`user_${appointment.patient_id}`).emit('newNotification', {
        title: 'Appointment Accepted',
        message: `Your appointment has been accepted by ${appointment.provider_name || 'the provider'}`,
        appointment_id: id
      });
    }

    res.json({
      success: true,
      message: 'Appointment accepted successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error accepting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept appointment',
      error: error.message
    });
  }
});

// POST /api/appointments/:id/decline - Physician declines appointment
router.post('/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user_id = req.user.user_id;
    const user_role = req.user.role;

    // Only physicians can decline appointments
    if (user_role !== 'physician' && user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only physicians can decline appointments'
      });
    }

    // Check if appointment exists
    const [existing] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointment = existing[0];

    // Check if provider matches (unless admin)
    if (user_role === 'physician' && appointment.provider_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only decline appointments assigned to you'
      });
    }

    // Update appointment status
    await db.query(`
      UPDATE appointments 
      SET status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = NOW(),
          cancelled_by = ?
      WHERE appointment_id = ?
    `, [reason || 'Declined by provider', user_id, id]);

    // Fetch updated appointment
    const [updated] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ?
    `, [id]);

    // Notify patient that provider declined
    const { notifyAppointmentProviderDeclined } = await import('./notifications.js');
    await notifyAppointmentProviderDeclined(updated[0], reason);

    // Log audit
    const userInfo = await getUserInfoForAudit(user_id);
    await logAudit({
      action: 'UPDATE',
      table_name: 'appointments',
      record_id: id,
      user_id: user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify({ status: 'cancelled', action: 'declined', reason })
    });

    // Emit socket event
    if (io) {
      io.to(`user_${appointment.patient_id}`).emit('newNotification', {
        title: 'Appointment Declined',
        message: `Your appointment has been declined. ${reason ? `Reason: ${reason}` : ''}`,
        appointment_id: id
      });
    }

    res.json({
      success: true,
      message: 'Appointment declined successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error declining appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline appointment',
      error: error.message
    });
  }
});

// POST /api/appointments/:id/confirm - Patient confirms appointment
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const user_role = req.user.role;

    // Only patients can confirm appointments
    if (user_role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can confirm appointments'
      });
    }

    // Get patient_id
    const [patientRows] = await db.query(`
      SELECT patient_id FROM patients 
      WHERE created_by = ? OR email IN (SELECT email FROM users WHERE user_id = ?)
      LIMIT 1
    `, [user_id, user_id]);

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    const patient_id = patientRows[0].patient_id;

    // Check if appointment exists and belongs to patient
    const [existing] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ? AND a.patient_id = ?
    `, [id, patient_id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or access denied'
      });
    }

    const appointment = existing[0];

    // Check if appointment is in correct status (scheduled or confirmed)
    if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Appointment cannot be confirmed. Current status: ${appointment.status}`
      });
    }

    // Update appointment status
    await db.query(`
      UPDATE appointments 
      SET status = 'confirmed'
      WHERE appointment_id = ?
    `, [id]);

    // Fetch updated appointment
    const [updated] = await db.query(`
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.full_name AS provider_name,
        f.facility_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      WHERE a.appointment_id = ?
    `, [id]);

    // Notify provider that patient confirmed
    const { notifyAppointmentPatientConfirmed } = await import('./notifications.js');
    await notifyAppointmentPatientConfirmed(updated[0]);

    // Log audit
    const userInfo = await getUserInfoForAudit(user_id);
    await logAudit({
      action: 'UPDATE',
      table_name: 'appointments',
      record_id: id,
      user_id: user_id,
      user_name: userInfo?.username || 'Unknown',
      ip_address: getClientIp(req),
      changes: JSON.stringify({ status: 'confirmed', action: 'confirmed_by_patient' })
    });

    // Emit socket event
    if (io && appointment.provider_id) {
      io.to(`user_${appointment.provider_id}`).emit('newNotification', {
        title: 'Appointment Confirmed',
        message: `${appointment.patient_name} has confirmed the appointment`,
        appointment_id: id
      });
    }

    res.json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm appointment',
      error: error.message
    });
  }
});

// GET /api/appointments/availability/slots - Get availability slots
router.get('/availability/slots', authenticateToken, async (req, res) => {
  try {
    const { provider_id, facility_id, date, date_from, date_to } = req.query;

    let query = `
      SELECT 
        s.*,
        u.full_name AS provider_name,
        f.facility_name
      FROM availability_slots s
      LEFT JOIN users u ON s.provider_id = u.user_id
      LEFT JOIN facilities f ON s.facility_id = f.facility_id
      WHERE s.slot_status = 'available'
    `;

    const params = [];

    if (provider_id) {
      query += ' AND s.provider_id = ?';
      params.push(provider_id);
    }

    if (facility_id) {
      query += ' AND s.facility_id = ?';
      params.push(facility_id);
    }

    if (date) {
      query += ' AND s.slot_date = ?';
      params.push(date);
    } else if (date_from) {
      query += ' AND s.slot_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND s.slot_date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY s.slot_date ASC, s.start_time ASC';

    const [slots] = await db.query(query, params);

    // Filter out slots that have conflicting appointments
    const availableSlots = [];
    for (const slot of slots) {
      const slotDateTime = `${slot.slot_date} ${slot.start_time}`;
      const slotEndDateTime = `${slot.slot_date} ${slot.end_time}`;

      // Check for conflicts
      let conflictQuery = `
        SELECT appointment_id
        FROM appointments
        WHERE facility_id = ?
          AND status NOT IN ('cancelled', 'no_show')
          AND (
            (scheduled_start < ? AND scheduled_end > ?) OR
            (scheduled_start < ? AND scheduled_end > ?) OR
            (scheduled_start >= ? AND scheduled_end <= ?)
          )
      `;
      const conflictParams = [
        slot.facility_id,
        slotDateTime, slotDateTime,
        slotEndDateTime, slotEndDateTime,
        slotDateTime, slotEndDateTime
      ];

      if (slot.provider_id) {
        conflictQuery += ' AND provider_id = ?';
        conflictParams.push(slot.provider_id);
      }

      const [conflicts] = await db.query(conflictQuery, conflictParams);

      if (conflicts.length === 0) {
        availableSlots.push(slot);
      }
    }

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    console.error('Error fetching availability slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability slots',
      error: error.message
    });
  }
});

export default router;


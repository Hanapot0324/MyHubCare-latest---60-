import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';

const router = express.Router();

// Helper function to create notification in notifications table
export async function createNotification({
  recipient_id,
  patient_id = null,
  title,
  message,
  type = 'system',
  payload = null
}) {
  try {
    const notification_id = uuidv4();
    
    // Determine notification type from payload if available
    let notificationType = type;
    if (payload) {
      try {
        const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (payloadObj && payloadObj.type) {
          // Map to valid ENUM values: 'system','reminder','alert','appointment','lab','custom'
          if (payloadObj.type.includes('appointment')) {
            notificationType = 'appointment'; // Use 'appointment' for appointment notifications
          } else if (payloadObj.type.includes('lab')) {
            notificationType = 'lab';
          } else if (payloadObj.type.includes('alert') || payloadObj.type.includes('critical')) {
            notificationType = 'alert'; // Use 'alert' for critical alerts
          } else if (payloadObj.type.includes('reminder')) {
            notificationType = 'reminder';
          } else {
            notificationType = 'system'; // Default to 'system'
          }
        }
        // Extract patient_id from payload if available
        if (payloadObj && payloadObj.patient_id && !patient_id) {
          patient_id = payloadObj.patient_id;
        }
      } catch (parseError) {
        // If payload parsing fails, use the default type
        console.warn('Failed to parse payload for notification type detection:', parseError);
      }
    }
    
    console.log('Creating notification:', {
      notification_id,
      recipient_id,
      title,
      message: message.substring(0, 50) + '...',
      type: notificationType
    });

    const [result] = await db.query(`
      INSERT INTO notifications (
        notification_id, recipient_id, title, message, type
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      notification_id,
      recipient_id,
      title,
      message,
      notificationType
    ]);

    console.log('Notification created successfully:', {
      notification_id,
      affectedRows: result.affectedRows,
      insertId: result.insertId
    });

    return { success: true, notification_id };
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sql: error.sql
    });
    return { success: false, error: error.message };
  }
}

// Helper function to create in-app message
export async function createInAppMessage({
  sender_id,
  recipient_id,
  recipient_type = 'user',
  subject,
  body,
  payload = null,
  priority = 'normal'
}) {
  try {
    const message_id = uuidv4();
    
    await db.query(`
      INSERT INTO in_app_messages (
        message_id, sender_id, recipient_id, recipient_type,
        subject, body, payload, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      message_id,
      sender_id,
      recipient_id,
      recipient_type,
      subject,
      body,
      payload ? JSON.stringify(payload) : null,
      priority
    ]);

    // Also create entry in notifications table if recipient is a user
    if (recipient_type === 'user') {
      const notificationResult = await createNotification({
        recipient_id,
        title: subject,
        message: body,
        type: 'system',
        payload
      });

      if (!notificationResult.success) {
        console.error('Failed to create notification entry for in-app message:', notificationResult.error);
        // Don't fail the in-app message creation if notification table insert fails
      }
    }

    return { success: true, message_id };
  } catch (error) {
    console.error('Error creating in-app message:', error);
    return { success: false, error: error.message };
  }
}

// Removed createPushNotification - using notifications table only

// Helper function to notify physician and case managers about appointment
export async function notifyAppointmentCreated(appointment) {
  try {
    const { appointment_id, patient_id, provider_id, facility_id, scheduled_start, appointment_type } = appointment;
    
    // Get patient name
    const [patients] = await db.query(
      'SELECT first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    const patientName = patients.length > 0 
      ? `${patients[0].first_name} ${patients[0].last_name}`
      : 'Patient';

    // Get facility name
    const [facilities] = await db.query(
      'SELECT facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    const facilityName = facilities.length > 0 ? facilities[0].facility_name : 'Facility';

    const appointmentDate = new Date(scheduled_start);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `New Appointment Scheduled: ${patientName}`;
    // Message without provider info
    const body = `A new ${appointment_type.replace('_', ' ')} appointment has been scheduled for ${patientName} at ${facilityName} on ${formattedDate}.`;
    
    const payload = {
      type: 'appointment_created',
      appointment_id,
      patient_id,
      provider_id,
      facility_id,
      scheduled_start,
      appointment_type,
      requires_confirmation: false // Patients should not see Accept/Decline buttons
    };

    const notifications = [];
    
    // NOTIFICATION 1: For ALL STAFF (admin, physician, nurse, case_manager, lab_personnel) - NOT patients
    // Get all active staff users to notify them
    const [allStaff] = await db.query(`
      SELECT user_id, role FROM users 
      WHERE role IN ('admin', 'physician', 'nurse', 'case_manager', 'lab_personnel')
        AND status = 'active'
    `);
    
    console.log('=== Creating notifications for staff ===');
    console.log('Staff count:', allStaff.length);
    
    for (const staff of allStaff) {
      // Create notification entry in notifications table
      // Include patient_id so patients can be excluded from seeing these notifications
      // For staff, set requires_confirmation to true so they see Accept/Decline buttons
      const staffPayload = { ...payload, requires_confirmation: true };
      const notificationResult = await createNotification({
        recipient_id: staff.user_id,
        patient_id: patient_id, // Include patient_id to exclude patient from seeing this
        title: subject,
        message: body,
        type: 'appointment', // Use 'appointment' type for appointment notifications
        payload: JSON.stringify(staffPayload)
      });
      
      if (notificationResult.success) {
        notifications.push({ 
          type: 'notification', 
          user_id: staff.user_id, 
          role: staff.role,
          notification_id: notificationResult.notification_id 
        });
        console.log(`✅ Notification created for ${staff.role} (${staff.user_id}): ${notificationResult.notification_id}`);
      } else {
        console.error(`❌ Failed to create notification for ${staff.role} (${staff.user_id}):`, notificationResult.error);
      }
    }

    // NOTIFICATION 2: For PATIENTS ONLY
    // Get patient's user_id if they have an account
    const [patientUsers] = await db.query(`
      SELECT u.user_id 
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
      WHERE p.patient_id = ?
      LIMIT 1
    `, [patient_id]);

    if (patientUsers.length > 0) {
      const patientUserId = patientUsers[0].user_id;
      const patientSubject = `Appointment Request Submitted`;
      const patientBody = `Your ${appointment_type.replace('_', ' ')} appointment request for ${formattedDate} at ${facilityName} has been submitted. Waiting for provider confirmation.`;
      
      // Create notification in notifications table for patient
      // Set patient_id to NULL so this notification is only visible to the patient
      const patientNotificationResult = await createNotification({
        recipient_id: patientUserId,
        patient_id: null, // NULL so this is only for the patient
        title: patientSubject,
        message: patientBody,
        type: 'appointment', // Use 'appointment' type for appointment notifications
        payload: JSON.stringify(payload)
      });
      
      if (patientNotificationResult.success) {
        notifications.push({ 
          type: 'notification', 
          user_id: patientUserId, 
          role: 'patient',
          notification_id: patientNotificationResult.notification_id 
        });
        console.log(`✅ Notification created for patient (${patientUserId}): ${patientNotificationResult.notification_id}`);
      } else {
        console.error(`❌ Failed to create notification for patient (${patientUserId}):`, patientNotificationResult.error);
      }
      
      // Also create in-app message for backward compatibility
      // Ensure payload doesn't have requires_confirmation for patients
      const patientPayload = { ...payload, requires_confirmation: false };
      const patientMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: patientUserId,
        recipient_type: 'user',
        subject: patientSubject,
        body: patientBody,
        payload: patientPayload,
        priority: 'normal'
      });
      if (patientMessage.success) {
        notifications.push(patientMessage);
      }
    }

    // Notify provider (physician) if assigned - Request confirmation
    if (provider_id) {
      console.log('=== Notifying Provider ===');
      console.log('Provider ID:', provider_id);
      
      const providerSubject = `Appointment Confirmation Required: ${patientName}`;
      // Message without provider info
      const providerBody = `A new ${appointment_type.replace('_', ' ')} appointment has been scheduled for ${patientName} at ${facilityName} on ${formattedDate}. Please accept or decline this appointment.`;
      
      // In-app message for provider
      const providerMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: provider_id,
        recipient_type: 'user',
        subject: providerSubject,
        body: providerBody,
        payload: { ...payload, requires_confirmation: true },
        priority: 'high'
      });
      
      if (providerMessage.success) {
        console.log('Provider notification created successfully:', provider_id);
        notifications.push(providerMessage);
      } else {
        console.error('Failed to create provider notification:', providerMessage.error);
      }
    }

    // Notify all case managers in the facility
    const [caseManagers] = await db.query(`
      SELECT user_id FROM users 
      WHERE role = 'case_manager' 
      AND (facility_id = ? OR facility_id IS NULL)
      AND status = 'active'
    `, [facility_id]);

    console.log('=== Notifying Case Managers ===');
    console.log('Facility ID:', facility_id);
    console.log('Case managers found:', caseManagers.length);

    for (const caseManager of caseManagers) {
      const cmSubject = `Appointment Confirmation Required: ${patientName}`;
      // Message without provider info
      const cmBody = `A new ${appointment_type.replace('_', ' ')} appointment has been scheduled for ${patientName} at ${facilityName} on ${formattedDate}. Please accept or decline this appointment.`;
      
      console.log('Creating notification for case manager:', caseManager.user_id);
      
      // In-app message for case manager
      const cmMessage = await createInAppMessage({
        sender_id: null,
        recipient_id: caseManager.user_id,
        recipient_type: 'user',
        subject: cmSubject,
        body: cmBody,
        payload: { ...payload, requires_confirmation: true },
        priority: 'normal'
      });
      
      if (cmMessage.success) {
        console.log('Case manager notification created successfully:', caseManager.user_id);
        notifications.push(cmMessage);
      } else {
        console.error('Failed to create case manager notification:', cmMessage.error);
      }
    }
    
    // Also notify all physicians in the facility if no provider is assigned
    if (!provider_id) {
      const [physicians] = await db.query(`
        SELECT user_id FROM users 
        WHERE role = 'physician' 
        AND (facility_id = ? OR facility_id IS NULL)
        AND status = 'active'
      `, [facility_id]);
      
      console.log('=== Notifying Physicians (no provider assigned) ===');
      console.log('Physicians found:', physicians.length);
      
      for (const physician of physicians) {
        const physicianSubject = `Appointment Confirmation Required: ${patientName}`;
        // Message without provider info
        const physicianBody = `A new ${appointment_type.replace('_', ' ')} appointment has been scheduled for ${patientName} at ${facilityName} on ${formattedDate}. Please accept or decline this appointment.`;
        
        console.log('Creating notification for physician:', physician.user_id);
        
        // In-app message for physician
        const physicianMessage = await createInAppMessage({
          sender_id: null,
          recipient_id: physician.user_id,
          recipient_type: 'user',
          subject: physicianSubject,
          body: physicianBody,
          payload: { ...payload, requires_confirmation: true },
          priority: 'high'
        });
        
        if (physicianMessage.success) {
          console.log('Physician notification created successfully:', physician.user_id);
          notifications.push(physicianMessage);
        } else {
          console.error('Failed to create physician notification:', physicianMessage.error);
        }
      }
    }

    return { success: true, notifications };
  } catch (error) {
    console.error('Error notifying appointment creation:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to notify patient that provider accepted
export async function notifyAppointmentProviderAccepted(appointment) {
  try {
    const { appointment_id, patient_id, provider_id, facility_id, scheduled_start, appointment_type } = appointment;
    
    // Get patient name
    const [patients] = await db.query(
      'SELECT first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    const patientName = patients.length > 0 
      ? `${patients[0].first_name} ${patients[0].last_name}`
      : 'Patient';

    // Get facility name
    const [facilities] = await db.query(
      'SELECT facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    const facilityName = facilities.length > 0 ? facilities[0].facility_name : 'Facility';

    // Get provider name
    let providerName = 'Provider';
    if (provider_id) {
      const [providers] = await db.query(
        'SELECT full_name FROM users WHERE user_id = ?',
        [provider_id]
      );
      if (providers.length > 0) {
        providerName = providers[0].full_name;
      }
    }

    const appointmentDate = new Date(scheduled_start);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `Appointment Confirmation Required`;
    const body = `Your ${appointment_type.replace('_', ' ')} appointment with ${providerName} at ${facilityName} on ${formattedDate} has been accepted. Please confirm to finalize your appointment.`;
    
    const payload = {
      type: 'appointment_pending_confirmation',
      appointment_id,
      patient_id,
      provider_id,
      facility_id,
      scheduled_start,
      appointment_type,
      requires_confirmation: true
    };

    const notifications = [];

    // Get patient's user_id if they have an account
    const [patientUsers] = await db.query(`
      SELECT u.user_id 
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
      WHERE p.patient_id = ?
      LIMIT 1
    `, [patient_id]);

    if (patientUsers.length > 0) {
      const patientUserId = patientUsers[0].user_id;
      
      // In-app message for patient
      const patientMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: patientUserId,
        recipient_type: 'user',
        subject,
        body,
        payload,
        priority: 'high'
      });
      notifications.push(patientMessage);

      // Create notification entry for patient
      const patientNotification = await createNotification({
        recipient_id: patientUserId,
        patient_id: null, // NULL so this is only for the patient
        title: 'Appointment Confirmation Required',
        message: `Your appointment has been accepted. Please confirm.`,
        type: 'alert',
        payload: JSON.stringify(payload)
      });
      if (patientNotification.success) {
        notifications.push(patientNotification);
      }
    }

    return { success: true, notifications };
  } catch (error) {
    console.error('Error notifying appointment provider acceptance:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to notify patient that provider declined
export async function notifyAppointmentProviderDeclined(appointment, reason = null) {
  try {
    const { appointment_id, patient_id, provider_id, facility_id, scheduled_start, appointment_type } = appointment;
    
    // Get patient name
    const [patients] = await db.query(
      'SELECT first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    const patientName = patients.length > 0 
      ? `${patients[0].first_name} ${patients[0].last_name}`
      : 'Patient';

    // Get facility name
    const [facilities] = await db.query(
      'SELECT facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    const facilityName = facilities.length > 0 ? facilities[0].facility_name : 'Facility';

    // Get provider name
    let providerName = 'Provider';
    if (provider_id) {
      const [providers] = await db.query(
        'SELECT full_name FROM users WHERE user_id = ?',
        [provider_id]
      );
      if (providers.length > 0) {
        providerName = providers[0].full_name;
      }
    }

    const appointmentDate = new Date(scheduled_start);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `Appointment Declined`;
    let body = `Your ${appointment_type.replace('_', ' ')} appointment with ${providerName} at ${facilityName} on ${formattedDate} has been declined.`;
    
    if (reason) {
      body += ` Reason: ${reason}`;
    } else {
      body += ` Please contact the facility to reschedule.`;
    }
    
    const payload = {
      type: 'appointment_declined',
      appointment_id,
      patient_id,
      provider_id,
      facility_id,
      scheduled_start,
      appointment_type,
      decline_reason: reason || null
    };

    const notifications = [];

    // Get patient's user_id if they have an account
    const [patientUsers] = await db.query(`
      SELECT u.user_id 
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
      WHERE p.patient_id = ?
      LIMIT 1
    `, [patient_id]);

    if (patientUsers.length > 0) {
      const patientUserId = patientUsers[0].user_id;
      
      // In-app message for patient
      const patientMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: patientUserId,
        recipient_type: 'user',
        subject,
        body,
        payload,
        priority: 'high'
      });
      notifications.push(patientMessage);

      // Create notification entry for patient
      const patientNotification = await createNotification({
        recipient_id: patientUserId,
        patient_id: null, // NULL so this is only for the patient
        title: 'Appointment Declined',
        message: reason ? `Your appointment has been declined. Reason: ${reason}` : `Your appointment has been declined. Please contact the facility to reschedule.`,
        type: 'appointment',
        payload: JSON.stringify(payload)
      });
      if (patientNotification.success) {
        notifications.push(patientNotification);
      }
    }

    return { success: true, notifications };
  } catch (error) {
    console.error('Error notifying appointment provider decline:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to notify provider and patient that appointment was confirmed
export async function notifyAppointmentPatientConfirmed(appointment) {
  try {
    const { appointment_id, patient_id, provider_id, facility_id, scheduled_start, appointment_type } = appointment;
    
    // Get patient name
    const [patients] = await db.query(
      'SELECT first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    const patientName = patients.length > 0 
      ? `${patients[0].first_name} ${patients[0].last_name}`
      : 'Patient';

    // Get facility name
    const [facilities] = await db.query(
      'SELECT facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    const facilityName = facilities.length > 0 ? facilities[0].facility_name : 'Facility';

    // Get provider name
    let providerName = 'Provider';
    if (provider_id) {
      const [providers] = await db.query(
        'SELECT full_name FROM users WHERE user_id = ?',
        [provider_id]
      );
      if (providers.length > 0) {
        providerName = providers[0].full_name;
      }
    }

    const appointmentDate = new Date(scheduled_start);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const payload = {
      type: 'appointment_confirmed',
      appointment_id,
      patient_id,
      provider_id,
      facility_id,
      scheduled_start,
      appointment_type
    };

    const notifications = [];

    // Notify provider that patient confirmed
    if (provider_id) {
      const providerSubject = `Appointment Confirmed: ${patientName}`;
      const providerBody = `${patientName} has confirmed their ${appointment_type.replace('_', ' ')} appointment at ${facilityName} on ${formattedDate}.`;
      
      // In-app message for provider
      const providerMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: provider_id,
        recipient_type: 'user',
        subject: providerSubject,
        body: providerBody,
        payload,
        priority: 'normal'
      });
      notifications.push(providerMessage);

      // Create notification entry for provider
      const providerNotification = await createNotification({
        recipient_id: provider_id,
        patient_id: patient_id, // Include patient_id so staff can see this
        title: 'Appointment Confirmed',
        message: `${patientName} has confirmed the appointment`,
        type: 'appointment',
        payload: JSON.stringify(payload)
      });
      if (providerNotification.success) {
        notifications.push(providerNotification);
      }
    }

    // Notify patient that their confirmation was successful
    const [patientUsers] = await db.query(`
      SELECT u.user_id 
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
      WHERE p.patient_id = ?
      LIMIT 1
    `, [patient_id]);

    if (patientUsers.length > 0) {
      const patientUserId = patientUsers[0].user_id;
      const patientSubject = `Appointment Confirmed`;
      const patientBody = `Your ${appointment_type.replace('_', ' ')} appointment with ${providerName} at ${facilityName} on ${formattedDate} has been confirmed.`;
      
      // In-app message for patient
      const patientMessage = await createInAppMessage({
        sender_id: null, // System message
        recipient_id: patientUserId,
        recipient_type: 'user',
        subject: patientSubject,
        body: patientBody,
        payload,
        priority: 'normal'
      });
      notifications.push(patientMessage);

      // Create notification entry for patient
      const patientNotification = await createNotification({
        recipient_id: patientUserId,
        patient_id: null, // NULL so this is only for the patient
        title: 'Appointment Confirmed',
        message: `Your appointment has been confirmed successfully`,
        type: 'appointment',
        payload: JSON.stringify(payload)
      });
      if (patientNotification.success) {
        notifications.push(patientNotification);
      }
    }

    return { success: true, notifications };
  } catch (error) {
    console.error('Error notifying appointment patient confirmation:', error);
    return { success: false, error: error.message };
  }
}

// GET /api/notifications - Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', unread_only = false } = req.query;
    const user_id = req.user.user_id;
    const user_role = req.user.role;

    let inAppMessages = [];
    let notifications = [];

    // Get notifications from notifications table
    if (type === 'all' || type === 'notifications') {
      // Get patient_id if user is a patient
      let patient_id = null;
      if (user_role === 'patient') {
        const [patientRows] = await db.query(`
          SELECT patient_id FROM patients 
          WHERE created_by = ? OR email IN (SELECT email FROM users WHERE user_id = ?)
          LIMIT 1
        `, [user_id, user_id]);
        if (patientRows.length > 0) {
          patient_id = patientRows[0].patient_id;
        }
      }

      let query = `
        SELECT n.*
        FROM notifications n
        WHERE n.recipient_id = ?
      `;
      const params = [user_id];
      
      if (unread_only === 'true') {
        query += ' AND n.is_read = FALSE';
      }
      
      query += ' ORDER BY n.created_at DESC LIMIT 100';
      
      console.log('Fetching notifications with query:', query);
      console.log('Query params:', params);
      
      const [notifs] = await db.query(query, params);
      
      console.log(`Found ${notifs.length} notifications for user ${user_id}`);
      
      // Try to extract appointment_id from notification message/payload if available
      // Note: Since notifications table doesn't have patient_id column, we can't match by patient
      // Appointments will be linked via in_app_messages payload instead
      
      notifications = notifs;
    }

    // Get in-app messages
    if (type === 'all' || type === 'in_app') {
      let query = `
        SELECT m.*, 
               u.full_name AS sender_name
        FROM in_app_messages m
        LEFT JOIN users u ON m.sender_id = u.user_id
        WHERE m.recipient_id = ? AND m.recipient_type = 'user'
      `;
      
      if (unread_only === 'true') {
        query += ' AND m.is_read = FALSE';
      }
      
      query += ' ORDER BY m.sent_at DESC LIMIT 100';
      
      const [messages] = await db.query(query, [user_id]);
      inAppMessages = messages;
    }

    res.json({
      success: true,
      data: {
        notifications: notifications,
        in_app_messages: inAppMessages
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read/unread
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_read = true } = req.body; // Default to marking as read, but allow unread
    const user_id = req.user.user_id;

    // Try to update in notifications table first
    let [result] = await db.query(`
      UPDATE notifications 
      SET is_read = ?
      WHERE notification_id = ? AND recipient_id = ?
    `, [is_read, id, user_id]);

    // If not found in notifications table, try in_app_messages
    if (result.affectedRows === 0) {
      [result] = await db.query(`
        UPDATE in_app_messages 
        SET is_read = ?, read_at = ${is_read ? 'NOW()' : 'NULL'}
        WHERE message_id = ? AND recipient_id = ?
      `, [is_read, id, user_id]);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: `Notification marked as ${is_read ? 'read' : 'unread'}`
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Update all unread notifications in the notifications table
    const [result] = await db.query(`
      UPDATE notifications 
      SET is_read = TRUE
      WHERE recipient_id = ? AND is_read = FALSE
    `, [user_id]);

    // Also update in_app_messages for consistency (these use recipient_id)
    await db.query(`
      UPDATE in_app_messages 
      SET is_read = TRUE, read_at = NOW()
      WHERE recipient_id = ? AND recipient_type = 'user' AND is_read = FALSE
    `, [user_id]);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updated_count: result.affectedRows
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const user_role = req.user.role;

    // Count from notifications table
    let patient_id = null;
    if (user_role === 'patient') {
      const [patientRows] = await db.query(`
        SELECT patient_id FROM patients 
        WHERE created_by = ? OR email IN (SELECT email FROM users WHERE user_id = ?)
        LIMIT 1
      `, [user_id, user_id]);
      if (patientRows.length > 0) {
        patient_id = patientRows[0].patient_id;
      }
    }

    let query = `
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_id = ?
        AND is_read = FALSE
    `;
    const params = [user_id];
    
    const [notifs] = await db.query(query, params);
    const notificationsCount = notifs[0].count || 0;

    // Count from in_app_messages
    const [messages] = await db.query(`
      SELECT COUNT(*) as count FROM in_app_messages
      WHERE recipient_id = ? AND recipient_type = 'user' AND is_read = FALSE
    `, [user_id]);
    const messagesCount = messages[0].count || 0;

    res.json({
      success: true,
      count: notificationsCount + messagesCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

export default router;


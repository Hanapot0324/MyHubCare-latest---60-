import { db } from '../db.js';
import { createNotification } from '../routes/notifications.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Process appointment reminders that are due to be sent
 * This should be called periodically (e.g., every minute via cron job)
 */
export async function processAppointmentReminders() {
  try {
    // Get all pending reminders that are due
    const [reminders] = await db.query(`
      SELECT 
        ar.*,
        a.patient_id,
        a.provider_id,
        a.facility_id,
        a.scheduled_start,
        a.appointment_type,
        a.status,
        p.first_name,
        p.last_name,
        p.contact_phone AS phone_number,
        p.email,
        f.facility_name,
        u.full_name AS provider_name,
        u2.user_id AS patient_user_id
      FROM appointment_reminders ar
      INNER JOIN appointments a ON ar.appointment_id = a.appointment_id
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN facilities f ON a.facility_id = f.facility_id
      LEFT JOIN users u ON a.provider_id = u.user_id
      LEFT JOIN users u2 ON p.created_by = u2.user_id OR p.email = u2.email
      WHERE ar.status = 'pending'
        AND ar.reminder_scheduled_at <= NOW()
        AND a.status NOT IN ('cancelled', 'no_show')
    `);

    console.log(`Processing ${reminders.length} appointment reminders...`);

    for (const reminder of reminders) {
      try {
        await sendReminder(reminder);
        
        // Update reminder status
        await db.query(`
          UPDATE appointment_reminders
          SET status = 'sent',
              reminder_sent_at = NOW()
          WHERE reminder_id = ?
        `, [reminder.reminder_id]);
        
        console.log(`Reminder sent successfully: ${reminder.reminder_id}`);
      } catch (error) {
        console.error(`Error sending reminder ${reminder.reminder_id}:`, error);
        
        // Mark as failed
        await db.query(`
          UPDATE appointment_reminders
          SET status = 'failed'
          WHERE reminder_id = ?
        `, [reminder.reminder_id]);
      }
    }

    return { success: true, processed: reminders.length };
  } catch (error) {
    console.error('Error processing appointment reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a reminder via the specified channel
 */
async function sendReminder(reminder) {
  const {
    reminder_type,
    appointment_id,
    patient_id,
    scheduled_start,
    appointment_type,
    facility_name,
    provider_name,
    first_name,
    last_name,
    phone_number,
    email
  } = reminder;

  const appointmentDate = new Date(scheduled_start);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const patientName = `${first_name || ''} ${last_name || ''}`.trim() || 'Patient';
  const appointmentTypeFormatted = appointment_type?.replace('_', ' ').toUpperCase() || 'APPOINTMENT';

  switch (reminder_type) {
    case 'sms':
      if (phone_number) {
        await sendSMSReminder(phone_number, patientName, formattedDate, appointmentTypeFormatted, facility_name, provider_name, reminder);
      } else {
        console.warn(`No phone number for patient ${patient_id}, skipping SMS reminder`);
      }
      break;

    case 'email':
      if (email) {
        await sendEmailReminder(email, patientName, formattedDate, appointmentTypeFormatted, facility_name, provider_name, reminder);
      } else {
        console.warn(`No email for patient ${patient_id}, skipping email reminder`);
      }
      break;

    case 'in_app':
      await sendInAppReminder(patient_id, appointment_id, formattedDate, appointmentTypeFormatted, facility_name, provider_name);
      break;

    case 'push':
      // Push notifications would be handled by a push notification service
      // For now, we'll create an in-app notification
      await sendInAppReminder(patient_id, appointment_id, formattedDate, appointmentTypeFormatted, facility_name, provider_name);
      break;

    default:
      console.warn(`Unknown reminder type: ${reminder_type}`);
  }
}

/**
 * Send SMS reminder
 */
async function sendSMSReminder(phoneNumber, patientName, formattedDate, appointmentType, facilityName, providerName, reminder) {
  try {
    const message = `Reminder: You have a ${appointmentType} appointment on ${formattedDate} at ${facilityName}${providerName ? ` with ${providerName}` : ''}. Please arrive on time.`;

    // Get patient_id from reminder data if available
    const patientId = reminder.patient_id || null;
    
    // Log SMS to sms_logs table
    const sms_id = uuidv4();
    await db.query(`
      INSERT INTO sms_logs (
        sms_id, patient_id, phone_number, message, status, sent_at
      ) VALUES (?, ?, ?, ?, 'sent', NOW())
    `, [sms_id, patientId, phoneNumber, message]);

    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS sent to ${phoneNumber}: ${message}`);
    
    return { success: true, sms_id };
  } catch (error) {
    console.error('Error sending SMS reminder:', error);
    throw error;
  }
}

/**
 * Send Email reminder
 */
async function sendEmailReminder(email, patientName, formattedDate, appointmentType, facilityName, providerName, reminder) {
  try {
    const subject = `Appointment Reminder: ${appointmentType} on ${formattedDate}`;
    const message = `
      Dear ${patientName},

      This is a reminder that you have a ${appointmentType} appointment scheduled for:
      
      Date & Time: ${formattedDate}
      Facility: ${facilityName}
      ${providerName ? `Provider: ${providerName}` : ''}
      
      Please arrive 10-15 minutes before your scheduled time.
      
      If you need to reschedule or cancel, please contact the facility as soon as possible.
      
      Thank you,
      ${facilityName}
    `.trim();

    // Get patient_id and user_id from reminder data if available
    const patientId = reminder.patient_id || null;
    const userId = reminder.patient_user_id || null;
    
    // Log email to email_logs table
    const email_id = uuidv4();
    await db.query(`
      INSERT INTO email_logs (
        email_id, user_id, patient_id, subject, message, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, 'sent', NOW())
    `, [email_id, userId, patientId, subject, message]);

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`Email sent to ${email}: ${subject}`);
    
    return { success: true, email_id };
  } catch (error) {
    console.error('Error sending email reminder:', error);
    throw error;
  }
}

/**
 * Send In-App reminder
 */
async function sendInAppReminder(patientId, appointmentId, formattedDate, appointmentType, facilityName, providerName) {
  try {
    // Get patient's user_id if they have an account
    const [patientUsers] = await db.query(`
      SELECT u.user_id 
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.user_id OR p.email = u.email
      WHERE p.patient_id = ?
      LIMIT 1
    `, [patientId]);

    if (patientUsers.length > 0) {
      const patientUserId = patientUsers[0].user_id;
      
      const title = `Appointment Reminder: ${appointmentType}`;
      const message = `You have a ${appointmentType} appointment on ${formattedDate} at ${facilityName}${providerName ? ` with ${providerName}` : ''}. Please arrive on time.`;

      const payload = {
        type: 'appointment_reminder',
        appointment_id: appointmentId,
        scheduled_start: formattedDate
      };

      // Create notification
      await createNotification({
        recipient_id: patientUserId,
        patient_id: null, // NULL so this is only for the patient
        title,
        message,
        type: 'reminder',
        payload: JSON.stringify(payload)
      });

      console.log(`In-app reminder sent to patient ${patientId}`);
    } else {
      console.warn(`No user account found for patient ${patientId}, skipping in-app reminder`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending in-app reminder:', error);
    throw error;
  }
}

/**
 * Create appointment reminders when an appointment is created
 * Creates reminders for 24 hours before the appointment
 */
export async function createAppointmentReminders(appointmentId, scheduledStart) {
  try {
    const scheduledDate = new Date(scheduledStart);
    
    // Create reminders for different channels
    const reminderTypes = ['in_app', 'sms', 'email']; // You can configure which types to create
    
    for (const reminderType of reminderTypes) {
      // Schedule reminder 24 hours before appointment
      const reminderScheduledAt = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
      
      // Only create reminder if it's in the future
      if (reminderScheduledAt > new Date()) {
        const reminderId = uuidv4();
        
        // Format date for MySQL (YYYY-MM-DD HH:MM:SS)
        const formattedDate = reminderScheduledAt.toISOString().slice(0, 19).replace('T', ' ');
        
        await db.query(`
          INSERT INTO appointment_reminders (
            reminder_id, appointment_id, reminder_type, reminder_scheduled_at, status
          ) VALUES (?, ?, ?, ?, 'pending')
        `, [reminderId, appointmentId, reminderType, formattedDate]);
        
        console.log(`Created ${reminderType} reminder for appointment ${appointmentId} scheduled for ${reminderScheduledAt}`);
      } else {
        console.log(`Skipping ${reminderType} reminder for appointment ${appointmentId} - scheduled time is in the past`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating appointment reminders:', error);
    return { success: false, error: error.message };
  }
}


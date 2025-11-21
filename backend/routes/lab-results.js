import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { calculateARPARiskScore } from '../services/arpaService.js';
import { createNotification } from './notifications.js';
import crypto from 'crypto';

const router = express.Router();

// Helper function to clean undefined values
function clean(obj) {
  const cleaned = {};
  for (const key in obj) {
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  }
  return cleaned;
}

// GET /api/lab-results - Get all lab results
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, patient_id, order_id, test_name, is_critical } = req.query;

    let query = `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        lo.test_panel AS order_test_panel,
        lo.order_date
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (
        CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
        lr.test_name LIKE ? OR
        lr.test_code LIKE ? OR
        lr.result_value LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (patient_id) {
      query += ' AND lr.patient_id = ?';
      params.push(patient_id);
    }

    if (order_id) {
      query += ' AND lr.order_id = ?';
      params.push(order_id);
    }

    if (test_name) {
      query += ' AND lr.test_name = ?';
      params.push(test_name);
    }

    if (is_critical !== undefined && is_critical !== 'all') {
      query += ' AND lr.is_critical = ?';
      params.push(is_critical === 'true' ? 1 : 0);
    }

    query += ' ORDER BY lr.reported_at DESC, lr.created_at DESC';

    const [results] = await db.query(query, params);

    // Format the response to match frontend expectations
    const formattedResults = results.map(result => ({
      id: result.result_id,
      result_id: result.result_id,
      order_id: result.order_id,
      patient: result.patient_name || 'Unknown Patient',
      patient_id: result.patient_id,
      testName: result.test_name,
      test_code: result.test_code,
      result: result.unit 
        ? `${result.result_value} ${result.unit}`
        : result.result_value,
      result_value: result.result_value,
      unit: result.unit,
      date: result.reported_at ? new Date(result.reported_at).toLocaleDateString() : '',
      reported_at: result.reported_at,
      collected_at: result.collected_at,
      labCode: `LAB-${result.reported_at ? new Date(result.reported_at).getFullYear() : '2025'}-${result.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed', // Lab results are always completed
      priority: 'routine', // Default, can be derived from order if needed
      notes: result.notes,
      performedBy: result.created_by_name || 'Unknown',
      created_by: result.created_by,
      reviewer: result.reviewer_name,
      reviewer_id: result.reviewer_id,
      reviewed_at: result.reviewed_at,
      is_critical: result.is_critical === 1 || result.is_critical === true,
      critical_alert_sent: result.critical_alert_sent === 1 || result.critical_alert_sent === true,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      reference_range_text: result.reference_range_text,
      created_at: result.created_at
    }));

    res.json({ success: true, data: formattedResults });
  } catch (err) {
    console.error('Fetch lab results error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-results/:id - Get single lab result
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        lo.test_panel AS order_test_panel,
        lo.order_date
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      WHERE lr.result_id = ?
      `,
      [req.params.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab result not found' });
    }

    const result = results[0];
    const formattedResult = {
      id: result.result_id,
      result_id: result.result_id,
      order_id: result.order_id,
      patient: result.patient_name || 'Unknown Patient',
      patient_id: result.patient_id,
      testName: result.test_name,
      test_code: result.test_code,
      result: result.unit 
        ? `${result.result_value} ${result.unit}`
        : result.result_value,
      result_value: result.result_value,
      unit: result.unit,
      date: result.reported_at ? new Date(result.reported_at).toLocaleDateString() : '',
      reported_at: result.reported_at,
      collected_at: result.collected_at,
      labCode: `LAB-${result.reported_at ? new Date(result.reported_at).getFullYear() : '2025'}-${result.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed',
      priority: 'routine',
      notes: result.notes,
      performedBy: result.created_by_name || 'Unknown',
      created_by: result.created_by,
      reviewer: result.reviewer_name,
      reviewer_id: result.reviewer_id,
      reviewed_at: result.reviewed_at,
      is_critical: result.is_critical === 1 || result.is_critical === true,
      critical_alert_sent: result.critical_alert_sent === 1 || result.critical_alert_sent === true,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      reference_range_text: result.reference_range_text,
      created_at: result.created_at
    };

    res.json({ success: true, data: formattedResult });
  } catch (err) {
    console.error('Fetch lab result error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-results/patient/:patient_id - Get lab results for a specific patient
router.get('/patient/:patient_id', authenticateToken, async (req, res) => {
  try {
    const { test_name, is_critical } = req.query;

    let query = `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        lo.test_panel AS order_test_panel,
        lo.order_date
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      WHERE lr.patient_id = ?
    `;

    const params = [req.params.patient_id];

    if (test_name) {
      query += ' AND lr.test_name = ?';
      params.push(test_name);
    }

    if (is_critical !== undefined && is_critical !== 'all') {
      query += ' AND lr.is_critical = ?';
      params.push(is_critical === 'true' ? 1 : 0);
    }

    query += ' ORDER BY lr.reported_at DESC, lr.created_at DESC';

    const [results] = await db.query(query, params);

    const formattedResults = results.map(result => ({
      id: result.result_id,
      result_id: result.result_id,
      order_id: result.order_id,
      patient: result.patient_name || 'Unknown Patient',
      patient_id: result.patient_id,
      testName: result.test_name,
      test_code: result.test_code,
      result: result.unit 
        ? `${result.result_value} ${result.unit}`
        : result.result_value,
      result_value: result.result_value,
      unit: result.unit,
      date: result.reported_at ? new Date(result.reported_at).toLocaleDateString() : '',
      reported_at: result.reported_at,
      collected_at: result.collected_at,
      labCode: `LAB-${result.reported_at ? new Date(result.reported_at).getFullYear() : '2025'}-${result.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed',
      priority: 'routine',
      notes: result.notes,
      performedBy: result.created_by_name || 'Unknown',
      created_by: result.created_by,
      reviewer: result.reviewer_name,
      reviewer_id: result.reviewer_id,
      reviewed_at: result.reviewed_at,
      is_critical: result.is_critical === 1 || result.is_critical === true,
      critical_alert_sent: result.critical_alert_sent === 1 || result.critical_alert_sent === true,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      reference_range_text: result.reference_range_text,
      created_at: result.created_at
    }));

    res.json({ success: true, data: formattedResults });
  } catch (err) {
    console.error('Fetch patient lab results error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/lab-results - Create new lab result
router.post('/', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - lab personnel, physicians, and admins can create results
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and lab personnel can create lab results.',
      });
    }

    const {
      order_id,
      patient_id,
      test_code,
      test_name,
      result_value,
      unit,
      reference_range_min,
      reference_range_max,
      reference_range_text,
      collected_at,
      reported_at,
      notes
    } = req.body;

    // Validate required fields
    if (!order_id || !patient_id || !test_code || !test_name || !result_value) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_id, patient_id, test_code, test_name, result_value',
      });
    }

    // Validate order exists
    const [orders] = await connection.query(
      'SELECT order_id, patient_id FROM lab_orders WHERE order_id = ?',
      [order_id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid lab order selected',
      });
    }

    // Validate patient matches order
    if (orders[0].patient_id !== patient_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Patient ID does not match the lab order',
      });
    }

    // Validate patient exists
    const [patients] = await connection.query(
      'SELECT patient_id FROM patients WHERE patient_id = ? AND status = "active"',
      [patient_id]
    );

    if (patients.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid patient selected',
      });
    }

    // Check if result value is critical (if reference ranges are provided)
    let is_critical = false;
    if (reference_range_min !== null && reference_range_max !== null && result_value) {
      const numericValue = parseFloat(result_value);
      if (!isNaN(numericValue)) {
        if (numericValue < reference_range_min || numericValue > reference_range_max) {
          is_critical = true;
        }
      }
    }

    // Generate result_id
    const result_id = crypto.randomUUID();

    // Use current user as creator
    const created_by = req.user.user_id;

    // Insert lab result
    await connection.query(
      `INSERT INTO lab_results (
        result_id, order_id, patient_id, test_code, test_name,
        result_value, unit, reference_range_min, reference_range_max,
        reference_range_text, is_critical, critical_alert_sent,
        collected_at, reported_at, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result_id,
        order_id,
        patient_id,
        test_code,
        test_name,
        result_value,
        unit || null,
        reference_range_min || null,
        reference_range_max || null,
        reference_range_text || null,
        is_critical ? 1 : 0,
        0, // critical_alert_sent starts as false
        collected_at || null,
        reported_at || new Date().toISOString().split('T')[0],
        notes || null,
        created_by
      ]
    );

    // Update lab order status to 'completed' if not already
    await connection.query(
      `UPDATE lab_orders 
       SET status = 'completed' 
       WHERE order_id = ? AND status != 'completed'`,
      [order_id]
    );

    await connection.commit();

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'CREATE',
      module: 'Lab Results',
      entity_type: 'lab_result',
      entity_id: result_id,
      record_id: result_id,
      new_value: {
        result_id,
        order_id,
        patient_id,
        test_name,
        result_value,
        is_critical
      },
      change_summary: `Created lab result: ${test_name} for patient ${patient_id}${is_critical ? ' (CRITICAL)' : ''}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Auto-calculate ARPA risk score after lab result creation
    try {
      await calculateARPARiskScore(patient_id, req.user.user_id, { skipAudit: false });
    } catch (arpaError) {
      console.error('ARPA auto-calculation error after lab result creation:', arpaError);
      // Don't fail the request if ARPA calculation fails
    }

    // If critical, trigger notification (P5.4)
    if (is_critical) {
      // Get ordering provider and patient info from lab order
      const [orderInfo] = await connection.query(
        `SELECT lo.ordering_provider_id, 
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                lo.test_panel
         FROM lab_orders lo
         LEFT JOIN patients p ON lo.patient_id = p.patient_id
         WHERE lo.order_id = ?`,
        [order_id]
      );

      if (orderInfo.length > 0 && orderInfo[0].ordering_provider_id) {
        const providerId = orderInfo[0].ordering_provider_id;
        const patientName = orderInfo[0].patient_name || 'Patient';
        const testPanel = orderInfo[0].test_panel || test_name;

        try {
          // Send critical alert notification to ordering provider
          const notificationResult = await createNotification({
            recipient_id: providerId,
            patient_id: patient_id,
            title: 'Critical Lab Value Alert',
            message: `CRITICAL: Lab result for ${test_name} (${testPanel}) for patient ${patientName} is outside normal range. Result: ${result_value}${unit ? ' ' + unit : ''}. Please review immediately.`,
            type: 'alert',
            payload: JSON.stringify({
              type: 'critical_lab_alert',
              result_id: result_id,
              order_id: order_id,
              patient_id: patient_id,
              test_name: test_name,
              result_value: result_value,
              unit: unit,
              reference_range_min: reference_range_min,
              reference_range_max: reference_range_max,
            })
          });

          if (notificationResult.success) {
            // Update critical_alert_sent flag to true
            await connection.query(
              'UPDATE lab_results SET critical_alert_sent = 1 WHERE result_id = ?',
              [result_id]
            );

            // Log notification to audit log
            const userInfo = await getUserInfoForAudit(req.user.user_id);
            await logAudit({
              user_id: userInfo.user_id,
              user_name: userInfo.user_name,
              user_role: userInfo.user_role,
              action: 'NOTIFY',
              module: 'Lab Results',
              entity_type: 'lab_result',
              entity_id: result_id,
              record_id: result_id,
              new_value: {
                result_id,
                critical_alert_sent: true,
                notified_provider: providerId,
              },
              change_summary: `Critical lab value alert sent to provider for ${test_name}`,
              ip_address: getClientIp(req),
              user_agent: req.headers['user-agent'] || 'unknown',
              status: 'success',
            });

            console.log(`Critical alert notification sent to provider ${providerId} for lab result ${result_id}`);
          } else {
            console.error('Failed to send critical alert notification:', notificationResult.error);
            // Don't fail the request if notification fails, but log it
          }
        } catch (notificationError) {
          console.error('Error sending critical alert notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }
    }

    // Fetch the created result
    const [newResult] = await connection.query(
      `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        lo.test_panel AS order_test_panel,
        lo.order_date
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      WHERE lr.result_id = ?
      `,
      [result_id]
    );

    const result = newResult[0];
    const formattedResult = {
      id: result.result_id,
      result_id: result.result_id,
      order_id: result.order_id,
      patient: result.patient_name || 'Unknown Patient',
      patient_id: result.patient_id,
      testName: result.test_name,
      test_code: result.test_code,
      result: result.unit 
        ? `${result.result_value} ${result.unit}`
        : result.result_value,
      result_value: result.result_value,
      unit: result.unit,
      date: result.reported_at ? new Date(result.reported_at).toLocaleDateString() : '',
      reported_at: result.reported_at,
      collected_at: result.collected_at,
      labCode: `LAB-${result.reported_at ? new Date(result.reported_at).getFullYear() : '2025'}-${result.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed',
      priority: 'routine',
      notes: result.notes,
      performedBy: result.created_by_name || 'Unknown',
      created_by: result.created_by,
      reviewer: result.reviewer_name,
      reviewer_id: result.reviewer_id,
      reviewed_at: result.reviewed_at,
      is_critical: result.is_critical === 1 || result.is_critical === true,
      critical_alert_sent: result.critical_alert_sent === 1 || result.critical_alert_sent === true,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      reference_range_text: result.reference_range_text,
      created_at: result.created_at
    };

    res.status(201).json({
      success: true,
      message: is_critical ? 'Lab result created successfully (CRITICAL VALUE DETECTED)' : 'Lab result created successfully',
      data: formattedResult,
      is_critical
    });
  } catch (err) {
    await connection.rollback();
    console.error('Create lab result error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during lab result creation',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// PUT /api/lab-results/:id - Update lab result
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result_id = req.params.id;

    // Get old result for audit log
    const [oldResults] = await connection.query(
      'SELECT * FROM lab_results WHERE result_id = ?',
      [result_id]
    );

    if (oldResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab result not found',
      });
    }

    const oldResult = oldResults[0];

    const {
      test_code,
      test_name,
      result_value,
      unit,
      reference_range_min,
      reference_range_max,
      reference_range_text,
      collected_at,
      reported_at,
      notes,
      reviewer_id,
      reviewed_at
    } = req.body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (test_code !== undefined) {
      updateFields.push('test_code = ?');
      updateValues.push(test_code);
    }

    if (test_name !== undefined) {
      updateFields.push('test_name = ?');
      updateValues.push(test_name);
    }

    if (result_value !== undefined) {
      updateFields.push('result_value = ?');
      updateValues.push(result_value);
    }

    if (unit !== undefined) {
      updateFields.push('unit = ?');
      updateValues.push(unit || null);
    }

    if (reference_range_min !== undefined) {
      updateFields.push('reference_range_min = ?');
      updateValues.push(reference_range_min || null);
    }

    if (reference_range_max !== undefined) {
      updateFields.push('reference_range_max = ?');
      updateValues.push(reference_range_max || null);
    }

    if (reference_range_text !== undefined) {
      updateFields.push('reference_range_text = ?');
      updateValues.push(reference_range_text || null);
    }

    if (collected_at !== undefined) {
      updateFields.push('collected_at = ?');
      updateValues.push(collected_at || null);
    }

    if (reported_at !== undefined) {
      updateFields.push('reported_at = ?');
      updateValues.push(reported_at || null);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes || null);
    }

    if (reviewer_id !== undefined) {
      updateFields.push('reviewer_id = ?');
      updateValues.push(reviewer_id || null);
    }

    if (reviewed_at !== undefined) {
      updateFields.push('reviewed_at = ?');
      updateValues.push(reviewed_at || null);
    }

    // Re-check critical value if result_value or reference ranges changed
    if (result_value !== undefined || reference_range_min !== undefined || reference_range_max !== undefined) {
      const finalResultValue = result_value !== undefined ? result_value : oldResult.result_value;
      const finalMin = reference_range_min !== undefined ? reference_range_min : oldResult.reference_range_min;
      const finalMax = reference_range_max !== undefined ? reference_range_max : oldResult.reference_range_max;

      let is_critical = false;
      if (finalMin !== null && finalMax !== null && finalResultValue) {
        const numericValue = parseFloat(finalResultValue);
        if (!isNaN(numericValue)) {
          if (numericValue < finalMin || numericValue > finalMax) {
            is_critical = true;
          }
        }
      }

      updateFields.push('is_critical = ?');
      updateValues.push(is_critical ? 1 : 0);

      // If result becomes critical and alert hasn't been sent, send notification
      if (is_critical && oldResult.critical_alert_sent === 0) {
        // Get ordering provider and patient info from lab order
        const [orderInfo] = await connection.query(
          `SELECT lo.ordering_provider_id, 
                  CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                  lo.test_panel
           FROM lab_orders lo
           LEFT JOIN patients p ON lo.patient_id = p.patient_id
           WHERE lo.order_id = ?`,
          [oldResult.order_id]
        );

        if (orderInfo.length > 0 && orderInfo[0].ordering_provider_id) {
          const providerId = orderInfo[0].ordering_provider_id;
          const patientName = orderInfo[0].patient_name || 'Patient';
          const testPanel = orderInfo[0].test_panel || oldResult.test_name;

          try {
            // Send critical alert notification to ordering provider
            const notificationResult = await createNotification({
              recipient_id: providerId,
              patient_id: oldResult.patient_id,
              title: 'Critical Lab Value Alert',
              message: `CRITICAL: Lab result for ${oldResult.test_name} (${testPanel}) for patient ${patientName} is outside normal range. Result: ${finalResultValue}${oldResult.unit ? ' ' + oldResult.unit : ''}. Please review immediately.`,
              type: 'alert',
              payload: JSON.stringify({
                type: 'critical_lab_alert',
                result_id: result_id,
                order_id: oldResult.order_id,
                patient_id: oldResult.patient_id,
                test_name: oldResult.test_name,
                result_value: finalResultValue,
                unit: oldResult.unit,
                reference_range_min: finalMin,
                reference_range_max: finalMax,
              })
            });

            if (notificationResult.success) {
              // Update critical_alert_sent flag to true
              updateFields.push('critical_alert_sent = 1');
              
              // Log notification to audit log
              const userInfo = await getUserInfoForAudit(req.user.user_id);
              await logAudit({
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                user_role: userInfo.user_role,
                action: 'NOTIFY',
                module: 'Lab Results',
                entity_type: 'lab_result',
                entity_id: result_id,
                record_id: result_id,
                new_value: {
                  result_id,
                  critical_alert_sent: true,
                  notified_provider: providerId,
                },
                change_summary: `Critical lab value alert sent to provider for ${oldResult.test_name}`,
                ip_address: getClientIp(req),
                user_agent: req.headers['user-agent'] || 'unknown',
                status: 'success',
              });

              console.log(`Critical alert notification sent to provider ${providerId} for lab result ${result_id}`);
            } else {
              console.error('Failed to send critical alert notification:', notificationResult.error);
            }
          } catch (notificationError) {
            console.error('Error sending critical alert notification:', notificationError);
            // Don't fail the request if notification fails
          }
        }
      }
    }

    if (updateFields.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updateValues.push(result_id);

    await connection.query(
      `UPDATE lab_results SET ${updateFields.join(', ')} WHERE result_id = ?`,
      updateValues
    );

    await connection.commit();

    // Auto-calculate ARPA risk score after lab result update
    try {
      const [patientCheck] = await connection.query(
        'SELECT patient_id FROM lab_results WHERE result_id = ?',
        [req.params.id]
      );
      if (patientCheck.length > 0) {
        await calculateARPARiskScore(patientCheck[0].patient_id, req.user.user_id, { skipAudit: false });
      }
    } catch (arpaError) {
      console.error('ARPA auto-calculation error after lab result update:', arpaError);
      // Don't fail the request if ARPA calculation fails
    }

    // Get updated result
    const [updatedResults] = await connection.query(
      `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        lo.test_panel AS order_test_panel,
        lo.order_date
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      WHERE lr.result_id = ?
      `,
      [result_id]
    );

    const updatedResult = updatedResults[0];

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'UPDATE',
      module: 'Lab Results',
      entity_type: 'lab_result',
      entity_id: result_id,
      record_id: result_id,
      old_value: oldResult,
      new_value: updatedResult,
      change_summary: `Updated lab result: ${updatedResult.test_name}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    const formattedResult = {
      id: updatedResult.result_id,
      result_id: updatedResult.result_id,
      order_id: updatedResult.order_id,
      patient: updatedResult.patient_name || 'Unknown Patient',
      patient_id: updatedResult.patient_id,
      testName: updatedResult.test_name,
      test_code: updatedResult.test_code,
      result: updatedResult.unit 
        ? `${updatedResult.result_value} ${updatedResult.unit}`
        : updatedResult.result_value,
      result_value: updatedResult.result_value,
      unit: updatedResult.unit,
      date: updatedResult.reported_at ? new Date(updatedResult.reported_at).toLocaleDateString() : '',
      reported_at: updatedResult.reported_at,
      collected_at: updatedResult.collected_at,
      labCode: `LAB-${updatedResult.reported_at ? new Date(updatedResult.reported_at).getFullYear() : '2025'}-${updatedResult.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed',
      priority: 'routine',
      notes: updatedResult.notes,
      performedBy: updatedResult.created_by_name || 'Unknown',
      created_by: updatedResult.created_by,
      reviewer: updatedResult.reviewer_name,
      reviewer_id: updatedResult.reviewer_id,
      reviewed_at: updatedResult.reviewed_at,
      is_critical: updatedResult.is_critical === 1 || updatedResult.is_critical === true,
      critical_alert_sent: updatedResult.critical_alert_sent === 1 || updatedResult.critical_alert_sent === true,
      reference_range_min: updatedResult.reference_range_min,
      reference_range_max: updatedResult.reference_range_max,
      reference_range_text: updatedResult.reference_range_text,
      created_at: updatedResult.created_at
    };

    res.json({
      success: true,
      message: 'Lab result updated successfully',
      data: formattedResult
    });
  } catch (err) {
    await connection.rollback();
    console.error('Update lab result error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/lab-results/:id - Delete lab result
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - only admins and physicians can delete
    if (!['admin', 'physician'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and physicians can delete lab results.',
      });
    }

    const result_id = req.params.id;

    // Get result for audit log
    const [results] = await connection.query(
      'SELECT * FROM lab_results WHERE result_id = ?',
      [result_id]
    );

    if (results.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab result not found',
      });
    }

    const result = results[0];

    // Delete the result
    await connection.query(
      'DELETE FROM lab_results WHERE result_id = ?',
      [result_id]
    );

    await connection.commit();

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'DELETE',
      module: 'Lab Results',
      entity_type: 'lab_result',
      entity_id: result_id,
      record_id: result_id,
      old_value: result,
      change_summary: `Deleted lab result: ${result.test_name}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Lab result deleted successfully',
    });
  } catch (err) {
    await connection.rollback();
    console.error('Delete lab result error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/lab-results/critical/pending - Get all pending critical alerts (P5.4)
router.get('/critical/pending', authenticateToken, async (req, res) => {
  try {
    // Check permissions - only admins, physicians, and lab personnel can view
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and lab personnel can view critical alerts.',
      });
    }

    const query = `
      SELECT 
        lr.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u1.full_name) AS created_by_name,
        CONCAT(u2.full_name) AS reviewer_name,
        CONCAT(u3.full_name) AS ordering_provider_name,
        lo.test_panel AS order_test_panel,
        lo.order_date,
        lo.ordering_provider_id
      FROM lab_results lr
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u1 ON lr.created_by = u1.user_id
      LEFT JOIN users u2 ON lr.reviewer_id = u2.user_id
      LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
      LEFT JOIN users u3 ON lo.ordering_provider_id = u3.user_id
      WHERE lr.is_critical = 1 AND lr.critical_alert_sent = 0
      ORDER BY lr.reported_at DESC, lr.created_at DESC
    `;

    const [results] = await db.query(query);

    const formattedResults = results.map(result => ({
      id: result.result_id,
      result_id: result.result_id,
      order_id: result.order_id,
      patient: result.patient_name || 'Unknown Patient',
      patient_id: result.patient_id,
      testName: result.test_name,
      test_code: result.test_code,
      result: result.unit 
        ? `${result.result_value} ${result.unit}`
        : result.result_value,
      result_value: result.result_value,
      unit: result.unit,
      date: result.reported_at ? new Date(result.reported_at).toLocaleDateString() : '',
      reported_at: result.reported_at,
      collected_at: result.collected_at,
      labCode: `LAB-${result.reported_at ? new Date(result.reported_at).getFullYear() : '2025'}-${result.result_id.substring(0, 8).toUpperCase()}`,
      status: 'completed',
      priority: 'routine',
      notes: result.notes,
      performedBy: result.created_by_name || 'Unknown',
      created_by: result.created_by,
      reviewer: result.reviewer_name,
      reviewer_id: result.reviewer_id,
      reviewed_at: result.reviewed_at,
      is_critical: true,
      critical_alert_sent: false,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      reference_range_text: result.reference_range_text,
      ordering_provider_id: result.ordering_provider_id,
      ordering_provider_name: result.ordering_provider_name || 'Unknown Provider',
      created_at: result.created_at
    }));

    res.json({ success: true, data: formattedResults });
  } catch (err) {
    console.error('Fetch pending critical alerts error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/lab-results/:id/send-critical-alert - Manually send critical alert (P5.4)
router.post('/:id/send-critical-alert', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - only admins, physicians, and lab personnel can send alerts
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and lab personnel can send critical alerts.',
      });
    }

    const result_id = req.params.id;

    // Get lab result and order info
    const [results] = await connection.query(
      `SELECT lr.*, 
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              lo.ordering_provider_id,
              lo.test_panel
       FROM lab_results lr
       LEFT JOIN patients p ON lr.patient_id = p.patient_id
       LEFT JOIN lab_orders lo ON lr.order_id = lo.order_id
       WHERE lr.result_id = ?`,
      [result_id]
    );

    if (results.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab result not found',
      });
    }

    const result = results[0];

    if (!result.is_critical) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This lab result is not marked as critical',
      });
    }

    if (result.critical_alert_sent) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Critical alert has already been sent for this result',
      });
    }

    if (!result.ordering_provider_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No ordering provider found for this lab result',
      });
    }

    const providerId = result.ordering_provider_id;
    const patientName = result.patient_name || 'Patient';
    const testPanel = result.test_panel || result.test_name;

    // Send critical alert notification to ordering provider
    const notificationResult = await createNotification({
      recipient_id: providerId,
      patient_id: result.patient_id,
      title: 'Critical Lab Value Alert',
      message: `CRITICAL: Lab result for ${result.test_name} (${testPanel}) for patient ${patientName} is outside normal range. Result: ${result.result_value}${result.unit ? ' ' + result.unit : ''}. Please review immediately.`,
      type: 'alert',
      payload: JSON.stringify({
        type: 'critical_lab_alert',
        result_id: result_id,
        order_id: result.order_id,
        patient_id: result.patient_id,
        test_name: result.test_name,
        result_value: result.result_value,
        unit: result.unit,
        reference_range_min: result.reference_range_min,
        reference_range_max: result.reference_range_max,
      })
    });

    if (!notificationResult.success) {
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: 'Failed to send critical alert notification',
        error: notificationResult.error,
      });
    }

    // Update critical_alert_sent flag to true
    await connection.query(
      'UPDATE lab_results SET critical_alert_sent = 1 WHERE result_id = ?',
      [result_id]
    );

    await connection.commit();

    // Log notification to audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'NOTIFY',
      module: 'Lab Results',
      entity_type: 'lab_result',
      entity_id: result_id,
      record_id: result_id,
      new_value: {
        result_id,
        critical_alert_sent: true,
        notified_provider: providerId,
      },
      change_summary: `Manually sent critical lab value alert to provider for ${result.test_name}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Critical alert notification sent successfully',
      data: {
        result_id,
        notification_id: notificationResult.notification_id,
        provider_id: providerId,
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Send critical alert error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

export default router;





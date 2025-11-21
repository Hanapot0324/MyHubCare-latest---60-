import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
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

// GET /api/lab-orders - Get all lab orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status, patient_id, priority } = req.query;

    let query = `
      SELECT 
        lo.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u.full_name) AS ordering_provider_name,
        f.facility_name
      FROM lab_orders lo
      LEFT JOIN patients p ON lo.patient_id = p.patient_id
      LEFT JOIN users u ON lo.ordering_provider_id = u.user_id
      LEFT JOIN facilities f ON lo.facility_id = f.facility_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (
        CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
        lo.test_panel LIKE ? OR
        lo.order_id LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'all') {
      query += ' AND lo.status = ?';
      params.push(status);
    }

    if (patient_id) {
      query += ' AND lo.patient_id = ?';
      params.push(patient_id);
    }

    if (priority && priority !== 'all') {
      query += ' AND lo.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY lo.order_date DESC, lo.created_at DESC';

    const [orders] = await db.query(query, params);

    // Format the response to match frontend expectations
    const formattedOrders = orders.map(order => ({
      id: order.order_id,
      order_id: order.order_id,
      patient: order.patient_name || 'Unknown Patient',
      patient_id: order.patient_id,
      testName: order.test_panel,
      date: order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
      labCode: `LAB-${order.order_date ? new Date(order.order_date).getFullYear() : '2025'}-${order.order_id.substring(0, 8).toUpperCase()}`,
      status: order.status,
      priority: order.priority,
      orderedBy: order.ordering_provider_name || 'Unknown Provider',
      ordering_provider_id: order.ordering_provider_id,
      facility_id: order.facility_id,
      facility_name: order.facility_name,
      collection_date: order.collection_date,
      notes: order.notes,
      created_at: order.created_at
    }));

    res.json({ success: true, data: formattedOrders });
  } catch (err) {
    console.error('Fetch lab orders error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-orders/:id - Get single lab order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `
      SELECT 
        lo.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u.full_name) AS ordering_provider_name,
        f.facility_name
      FROM lab_orders lo
      LEFT JOIN patients p ON lo.patient_id = p.patient_id
      LEFT JOIN users u ON lo.ordering_provider_id = u.user_id
      LEFT JOIN facilities f ON lo.facility_id = f.facility_id
      WHERE lo.order_id = ?
      `,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab order not found' });
    }

    const order = orders[0];
    const formattedOrder = {
      id: order.order_id,
      order_id: order.order_id,
      patient: order.patient_name || 'Unknown Patient',
      patient_id: order.patient_id,
      testName: order.test_panel,
      date: order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
      labCode: `LAB-${order.order_date ? new Date(order.order_date).getFullYear() : '2025'}-${order.order_id.substring(0, 8).toUpperCase()}`,
      status: order.status,
      priority: order.priority,
      orderedBy: order.ordering_provider_name || 'Unknown Provider',
      ordering_provider_id: order.ordering_provider_id,
      facility_id: order.facility_id,
      facility_name: order.facility_name,
      collection_date: order.collection_date,
      notes: order.notes,
      created_at: order.created_at
    };

    res.json({ success: true, data: formattedOrder });
  } catch (err) {
    console.error('Fetch lab order error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-orders/patient/:patient_id - Get lab orders for a specific patient
router.get('/patient/:patient_id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        lo.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u.full_name) AS ordering_provider_name,
        f.facility_name
      FROM lab_orders lo
      LEFT JOIN patients p ON lo.patient_id = p.patient_id
      LEFT JOIN users u ON lo.ordering_provider_id = u.user_id
      LEFT JOIN facilities f ON lo.facility_id = f.facility_id
      WHERE lo.patient_id = ?
    `;

    const params = [req.params.patient_id];

    if (status && status !== 'all') {
      query += ' AND lo.status = ?';
      params.push(status);
    }

    query += ' ORDER BY lo.order_date DESC, lo.created_at DESC';

    const [orders] = await db.query(query, params);

    const formattedOrders = orders.map(order => ({
      id: order.order_id,
      order_id: order.order_id,
      patient: order.patient_name || 'Unknown Patient',
      patient_id: order.patient_id,
      testName: order.test_panel,
      date: order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
      labCode: `LAB-${order.order_date ? new Date(order.order_date).getFullYear() : '2025'}-${order.order_id.substring(0, 8).toUpperCase()}`,
      status: order.status,
      priority: order.priority,
      orderedBy: order.ordering_provider_name || 'Unknown Provider',
      ordering_provider_id: order.ordering_provider_id,
      facility_id: order.facility_id,
      facility_name: order.facility_name,
      collection_date: order.collection_date,
      notes: order.notes,
      created_at: order.created_at
    }));

    res.json({ success: true, data: formattedOrders });
  } catch (err) {
    console.error('Fetch patient lab orders error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/lab-orders - Create new lab order
router.post('/', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - physicians, nurses, and admins can create orders
    if (!['admin', 'physician', 'nurse'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and nurses can create lab orders.',
      });
    }

    const {
      patient_id,
      test_panel,
      order_date,
      priority = 'routine',
      status = 'ordered',
      facility_id,
      collection_date,
      notes
    } = req.body;

    // Validate required fields
    if (!patient_id || !test_panel || !facility_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, test_panel, facility_id',
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

    // Validate facility exists
    const [facilities] = await connection.query(
      'SELECT facility_id FROM facilities WHERE facility_id = ? AND is_active = TRUE',
      [facility_id]
    );

    if (facilities.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid facility selected',
      });
    }

    // Validate priority
    if (!['routine', 'urgent', 'stat'].includes(priority)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be: routine, urgent, or stat',
      });
    }

    // Validate status
    if (!['ordered', 'collected', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: ordered, collected, in_progress, completed, or cancelled',
      });
    }

    // Generate order_id
    const order_id = crypto.randomUUID();

    // Use current user as ordering provider if not specified
    const ordering_provider_id = req.user.user_id;

    // Insert lab order
    await connection.query(
      `INSERT INTO lab_orders (
        order_id, patient_id, ordering_provider_id, facility_id,
        order_date, test_panel, priority, status, collection_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        patient_id,
        ordering_provider_id,
        facility_id,
        order_date || new Date().toISOString().split('T')[0],
        test_panel,
        priority,
        status,
        collection_date || null,
        notes || null
      ]
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
      module: 'Lab Orders',
      entity_type: 'lab_order',
      entity_id: order_id,
      record_id: order_id,
      new_value: {
        order_id,
        patient_id,
        test_panel,
        priority,
        status,
        facility_id
      },
      change_summary: `Created lab order: ${test_panel} for patient ${patient_id}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Fetch the created order
    const [newOrder] = await connection.query(
      `
      SELECT 
        lo.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u.full_name) AS ordering_provider_name,
        f.facility_name
      FROM lab_orders lo
      LEFT JOIN patients p ON lo.patient_id = p.patient_id
      LEFT JOIN users u ON lo.ordering_provider_id = u.user_id
      LEFT JOIN facilities f ON lo.facility_id = f.facility_id
      WHERE lo.order_id = ?
      `,
      [order_id]
    );

    const order = newOrder[0];
    const formattedOrder = {
      id: order.order_id,
      order_id: order.order_id,
      patient: order.patient_name || 'Unknown Patient',
      patient_id: order.patient_id,
      testName: order.test_panel,
      date: order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
      labCode: `LAB-${order.order_date ? new Date(order.order_date).getFullYear() : '2025'}-${order.order_id.substring(0, 8).toUpperCase()}`,
      status: order.status,
      priority: order.priority,
      orderedBy: order.ordering_provider_name || 'Unknown Provider',
      ordering_provider_id: order.ordering_provider_id,
      facility_id: order.facility_id,
      facility_name: order.facility_name,
      collection_date: order.collection_date,
      notes: order.notes,
      created_at: order.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Lab order created successfully',
      data: formattedOrder
    });
  } catch (err) {
    await connection.rollback();
    console.error('Create lab order error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during lab order creation',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// PUT /api/lab-orders/:id - Update lab order
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions
    if (!['admin', 'physician', 'nurse', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const order_id = req.params.id;

    // Get old order for audit log
    const [oldOrders] = await connection.query(
      'SELECT * FROM lab_orders WHERE order_id = ?',
      [order_id]
    );

    if (oldOrders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab order not found',
      });
    }

    const oldOrder = oldOrders[0];

    const {
      patient_id,
      test_panel,
      order_date,
      priority,
      status,
      facility_id,
      collection_date,
      notes
    } = req.body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (patient_id !== undefined) {
      updateFields.push('patient_id = ?');
      updateValues.push(patient_id);
    }

    if (test_panel !== undefined) {
      updateFields.push('test_panel = ?');
      updateValues.push(test_panel);
    }

    if (order_date !== undefined) {
      updateFields.push('order_date = ?');
      updateValues.push(order_date);
    }

    if (priority !== undefined) {
      if (!['routine', 'urgent', 'stat'].includes(priority)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid priority',
        });
      }
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }

    if (status !== undefined) {
      if (!['ordered', 'collected', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (facility_id !== undefined) {
      updateFields.push('facility_id = ?');
      updateValues.push(facility_id);
    }

    if (collection_date !== undefined) {
      updateFields.push('collection_date = ?');
      updateValues.push(collection_date || null);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes || null);
    }

    if (updateFields.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updateValues.push(order_id);

    await connection.query(
      `UPDATE lab_orders SET ${updateFields.join(', ')} WHERE order_id = ?`,
      updateValues
    );

    await connection.commit();

    // Get updated order
    const [updatedOrders] = await connection.query(
      `
      SELECT 
        lo.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        CONCAT(u.full_name) AS ordering_provider_name,
        f.facility_name
      FROM lab_orders lo
      LEFT JOIN patients p ON lo.patient_id = p.patient_id
      LEFT JOIN users u ON lo.ordering_provider_id = u.user_id
      LEFT JOIN facilities f ON lo.facility_id = f.facility_id
      WHERE lo.order_id = ?
      `,
      [order_id]
    );

    const updatedOrder = updatedOrders[0];

    // Get user info for audit log
    const userInfo = await getUserInfoForAudit(req.user.user_id);

    // Log audit entry
    await logAudit({
      user_id: userInfo.user_id,
      user_name: userInfo.user_name,
      user_role: userInfo.user_role,
      action: 'UPDATE',
      module: 'Lab Orders',
      entity_type: 'lab_order',
      entity_id: order_id,
      record_id: order_id,
      old_value: oldOrder,
      new_value: updatedOrder,
      change_summary: `Updated lab order: ${updatedOrder.test_panel}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    const formattedOrder = {
      id: updatedOrder.order_id,
      order_id: updatedOrder.order_id,
      patient: updatedOrder.patient_name || 'Unknown Patient',
      patient_id: updatedOrder.patient_id,
      testName: updatedOrder.test_panel,
      date: updatedOrder.order_date ? new Date(updatedOrder.order_date).toLocaleDateString() : '',
      labCode: `LAB-${updatedOrder.order_date ? new Date(updatedOrder.order_date).getFullYear() : '2025'}-${updatedOrder.order_id.substring(0, 8).toUpperCase()}`,
      status: updatedOrder.status,
      priority: updatedOrder.priority,
      orderedBy: updatedOrder.ordering_provider_name || 'Unknown Provider',
      ordering_provider_id: updatedOrder.ordering_provider_id,
      facility_id: updatedOrder.facility_id,
      facility_name: updatedOrder.facility_name,
      collection_date: updatedOrder.collection_date,
      notes: updatedOrder.notes,
      created_at: updatedOrder.created_at
    };

    res.json({
      success: true,
      message: 'Lab order updated successfully',
      data: formattedOrder
    });
  } catch (err) {
    await connection.rollback();
    console.error('Update lab order error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/lab-orders/:id - Delete lab order (soft delete by setting status to cancelled)
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - only admins and physicians can delete
    if (!['admin', 'physician'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and physicians can delete lab orders.',
      });
    }

    const order_id = req.params.id;

    // Get order for audit log
    const [orders] = await connection.query(
      'SELECT * FROM lab_orders WHERE order_id = ?',
      [order_id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab order not found',
      });
    }

    const order = orders[0];

    // Soft delete - set status to cancelled
    await connection.query(
      "UPDATE lab_orders SET status = 'cancelled' WHERE order_id = ?",
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
      action: 'DELETE',
      module: 'Lab Orders',
      entity_type: 'lab_order',
      entity_id: order_id,
      record_id: order_id,
      old_value: order,
      change_summary: `Cancelled lab order: ${order.test_panel}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Lab order cancelled successfully',
    });
  } catch (err) {
    await connection.rollback();
    console.error('Delete lab order error:', err);
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






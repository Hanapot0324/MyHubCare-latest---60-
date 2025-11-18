import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const { facility_id } = req.query;

    let query = `
      SELECT mi.*, m.medication_name, f.facility_name
      FROM medication_inventory mi
      JOIN medications m ON mi.medication_id = m.medication_id
      JOIN facilities f ON mi.facility_id = f.facility_id
    `;

    const params = [];

    if (facility_id) {
      query += ' WHERE mi.facility_id = ?';
      params.push(facility_id);
    }

    query += ' ORDER BY m.medication_name';

    const [results] = await db.query(query, params);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
});

// Get inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT mi.*, m.medication_name, f.facility_name
      FROM medication_inventory mi
      JOIN medications m ON mi.medication_id = m.medication_id
      JOIN facilities f ON mi.facility_id = f.facility_id
      WHERE mi.inventory_id = ?
    `;

    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message,
    });
  }
});

// Add new inventory item (P4.4)
router.post('/', authenticateToken, async (req, res) => {
  let userInfo = null;

  try {
    const {
      medication_id,
      batch_number,
      quantity_on_hand,
      unit,
      expiry_date,
      reorder_level,
      supplier,
      cost_per_unit,
    } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Get facility_id from authenticated user
    const facility_id = req.user?.facility_id;
    if (!facility_id) {
      return res.status(400).json({
        success: false,
        message: 'User facility not found. Please ensure you are assigned to a facility.',
      });
    }

    // Check if medication exists
    const [medCheck] = await db.query(
      'SELECT medication_id, medication_name FROM medications WHERE medication_id = ?',
      [medication_id]
    );
    if (medCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medication not found',
      });
    }

    // Check if facility exists
    const [facilityCheck] = await db.query(
      'SELECT facility_id, facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    if (facilityCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Facility not found',
      });
    }

    const inventory_id = uuidv4();

    const query = `
      INSERT INTO medication_inventory (
        inventory_id, medication_id, facility_id, batch_number,
        quantity_on_hand, unit, expiry_date, reorder_level, 
        supplier, cost_per_unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(query, [
      inventory_id,
      medication_id,
      facility_id,
      batch_number || null,
      quantity_on_hand,
      unit,
      expiry_date || null,
      reorder_level || 0,
      supplier || null,
      cost_per_unit || null,
    ]);

    // Check alerts
    const alerts = [];
    if (quantity_on_hand <= (reorder_level || 0)) {
      alerts.push({
        type: 'low_stock',
        message: `${medCheck[0].medication_name} is at or below reorder level. Current: ${quantity_on_hand}, Reorder level: ${reorder_level || 0}`,
      });
    }

    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      const today = new Date();
      const monthsUntilExpiry = (expiryDate - today) / (1000 * 60 * 60 * 24 * 30);
      if (monthsUntilExpiry < 3 && monthsUntilExpiry > 0) {
        alerts.push({
          type: 'expiring_soon',
          message: `${medCheck[0].medication_name} is expiring soon. Expiry date: ${expiry_date}`,
        });
      }
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        entity_id: inventory_id,
        record_id: inventory_id,
        new_value: {
          inventory_id,
          medication_id,
          facility_id,
          quantity_on_hand,
          reorder_level,
          expiry_date,
        },
        change_summary: `Added inventory for ${medCheck[0].medication_name} at ${facilityCheck[0].facility_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully',
      data: { inventory_id },
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    console.error('Error adding inventory item:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add inventory item',
      error: error.message,
    });
  }
});

// Update inventory item (P4.4)
router.put('/:id', async (req, res) => {
  let userInfo = null;

  try {
    const { id } = req.params;
    const {
      quantity_on_hand,
      unit,
      expiry_date,
      reorder_level,
      supplier,
      cost_per_unit,
    } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Check if inventory item exists and get old values (D4)
    const [oldItem] = await db.query(
      `SELECT mi.*, m.medication_name, f.facility_name
       FROM medication_inventory mi
       JOIN medications m ON mi.medication_id = m.medication_id
       JOIN facilities f ON mi.facility_id = f.facility_id
       WHERE mi.inventory_id = ?`,
      [id]
    );
    if (oldItem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    const oldValue = oldItem[0];

    const query = `
      UPDATE medication_inventory SET
        quantity_on_hand = ?, unit = ?, expiry_date = ?, 
        reorder_level = ?, supplier = ?, cost_per_unit = ?
      WHERE inventory_id = ?
    `;

    await db.query(query, [
      quantity_on_hand,
      unit,
      expiry_date,
      reorder_level,
      supplier,
      cost_per_unit,
      id,
    ]);

    // Check reorder_level alert: generate alert if quantity_on_hand <= reorder_level
    const alerts = [];
    if (quantity_on_hand <= reorder_level) {
      alerts.push({
        type: 'low_stock',
        message: `${oldValue.medication_name} is at or below reorder level. Current: ${quantity_on_hand}, Reorder level: ${reorder_level}`,
      });
    }

    // Check expiry_date alert: generate alert if expiring soon (within 3 months)
    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      const today = new Date();
      const monthsUntilExpiry = (expiryDate - today) / (1000 * 60 * 60 * 24 * 30);
      if (monthsUntilExpiry < 3 && monthsUntilExpiry > 0) {
        alerts.push({
          type: 'expiring_soon',
          message: `${oldValue.medication_name} is expiring soon. Expiry date: ${expiry_date}`,
        });
      } else if (monthsUntilExpiry < 0) {
        alerts.push({
          type: 'expired',
          message: `${oldValue.medication_name} has expired. Expiry date: ${expiry_date}`,
        });
      }
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        entity_id: id,
        record_id: id,
        old_value: {
          quantity_on_hand: oldValue.quantity_on_hand,
          reorder_level: oldValue.reorder_level,
          expiry_date: oldValue.expiry_date,
        },
        new_value: {
          quantity_on_hand,
          reorder_level,
          expiry_date,
        },
        change_summary: `Updated inventory for ${oldValue.medication_name} at ${oldValue.facility_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        entity_id: id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message,
    });
  }
});

// Restock inventory item (P4.4)
router.post('/:id/restock', async (req, res) => {
  let userInfo = null;

  try {
    const { id } = req.params;
    const { quantity, batch_number, cost_per_unit } = req.body;

    // Get user info for audit logging
    if (req.user?.user_id) {
      userInfo = await getUserInfoForAudit(req.user.user_id);
    }

    // Check if inventory item exists (D4)
    const [check] = await db.query(
      `SELECT mi.*, m.medication_name, f.facility_name
       FROM medication_inventory mi
       JOIN medications m ON mi.medication_id = m.medication_id
       JOIN facilities f ON mi.facility_id = f.facility_id
       WHERE mi.inventory_id = ?`,
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    const inventoryItem = check[0];
    const currentQuantity = inventoryItem.quantity_on_hand;
    const newQuantity = currentQuantity + parseInt(quantity);

    let query = `
      UPDATE medication_inventory SET
        quantity_on_hand = ?, last_restocked = CURDATE()
    `;

    const params = [newQuantity];

    if (batch_number) {
      query += ', batch_number = ?';
      params.push(batch_number);
    }

    if (cost_per_unit) {
      query += ', cost_per_unit = ?';
      params.push(cost_per_unit);
    }

    query += ' WHERE inventory_id = ?';
    params.push(id);

    await db.query(query, params);

    // Check alerts after restock
    const alerts = [];
    if (newQuantity <= inventoryItem.reorder_level) {
      alerts.push({
        type: 'low_stock',
        message: `Still at or below reorder level after restock. Current: ${newQuantity}, Reorder level: ${inventoryItem.reorder_level}`,
      });
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'RESTOCK',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        entity_id: id,
        record_id: id,
        old_value: {
          quantity_on_hand: currentQuantity,
        },
        new_value: {
          quantity_on_hand: newQuantity,
        },
        change_summary: `Restocked ${inventoryItem.medication_name} with ${quantity} units at ${inventoryItem.facility_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: 'Inventory item restocked successfully',
      data: {
        previousQuantity: currentQuantity,
        quantityAdded: parseInt(quantity),
        newQuantity,
      },
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    console.error('Error restocking inventory item:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'RESTOCK',
        module: 'Inventory',
        entity_type: 'medication_inventory',
        entity_id: id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to restock inventory item',
      error: error.message,
    });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if inventory item exists
    const [check] = await db.query(
      'SELECT inventory_id FROM medication_inventory WHERE inventory_id = ?',
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    await db.query('DELETE FROM medication_inventory WHERE inventory_id = ?', [
      id,
    ]);

    // Log to audit
    await db.query(
      'INSERT INTO audit_log (table_name, record_id, action, user_id, timestamp) VALUES (?, ?, ?, ?, NOW())',
      ['medication_inventory', id, 'DELETE', req.user?.user_id || null]
    );

    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message,
    });
  }
});

// Get low stock items
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const { facility_id } = req.query;

    let query = `
      SELECT mi.*, m.medication_name, f.facility_name
      FROM medication_inventory mi
      JOIN medications m ON mi.medication_id = m.medication_id
      JOIN facilities f ON mi.facility_id = f.facility_id
      WHERE mi.quantity_on_hand <= mi.reorder_level
    `;

    const params = [];

    if (facility_id) {
      query += ' AND mi.facility_id = ?';
      params.push(facility_id);
    }

    query += ' ORDER BY mi.quantity_on_hand ASC';

    const [results] = await db.query(query, params);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message,
    });
  }
});

// Get expiring items
router.get('/alerts/expiring', async (req, res) => {
  try {
    const { facility_id, months = 3 } = req.query;

    let query = `
      SELECT mi.*, m.medication_name, f.facility_name
      FROM medication_inventory mi
      JOIN medications m ON mi.medication_id = m.medication_id
      JOIN facilities f ON mi.facility_id = f.facility_id
      WHERE mi.expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ? MONTH)
    `;

    const params = [months];

    if (facility_id) {
      query += ' AND mi.facility_id = ?';
      params.push(facility_id);
    }

    query += ' ORDER BY mi.expiry_date ASC';

    const [results] = await db.query(query, params);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring items',
      error: error.message,
    });
  }
});

export default router;

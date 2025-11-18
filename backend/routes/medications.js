import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

const router = express.Router();

// Get all medications
router.get('/', async (req, res) => {
  try {
    const { search, is_art, is_controlled, active } = req.query;

    let query = 'SELECT * FROM medications WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (medication_name LIKE ? OR generic_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_art !== undefined) {
      query += ' AND is_art = ?';
      params.push(is_art === 'true');
    }

    if (is_controlled !== undefined) {
      query += ' AND is_controlled = ?';
      params.push(is_controlled === 'true');
    }

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    query += ' ORDER BY medication_name';

    const [results] = await db.query(query, params);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications',
      error: error.message,
    });
  }
});

// Get medication by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [results] = await db.query(
      'SELECT * FROM medications WHERE medication_id = ?',
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medication',
      error: error.message,
    });
  }
});

// Add new medication
router.post('/', async (req, res) => {
  try {
    const {
      medication_name,
      generic_name,
      form,
      strength,
      atc_code,
      is_art,
      is_controlled,
      active,
    } = req.body;

    if (!medication_name || !form) {
      return res.status(400).json({
        success: false,
        message: 'Medication name and form are required',
      });
    }

    const medication_id = uuidv4();

    const query = `
      INSERT INTO medications (
        medication_id, medication_name, generic_name, form,
        strength, atc_code, is_art, is_controlled, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(query, [
      medication_id,
      medication_name,
      generic_name || null,
      form,
      strength || null,
      atc_code || null,
      is_art || false,
      is_controlled || false,
      active !== false,
    ]);

    // Fetch the full inserted row
    const [results] = await db.query(
      'SELECT * FROM medications WHERE medication_id = ?',
      [medication_id]
    );

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: results[0],
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medication',
      error: error.message,
    });
  }
});

// In your inventory routes file
router.post('/with-medication', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      medication_name,
      generic_name,
      form,
      strength,
      atc_code,
      is_art,
      is_controlled,
      // Inventory fields
      facility_id,
      quantity_on_hand,
      unit,
      expiry_date,
      reorder_level,
      supplier,
      batch_number,
      cost_per_unit
    } = req.body;

    // Check if medication already exists
    const [existingMed] = await connection.query(
      'SELECT medication_id FROM medications WHERE medication_name = ? AND form = ? AND strength = ?',
      [medication_name, form, strength || null]
    );

    let medication_id;

    if (existingMed.length > 0) {
      // Use existing medication
      medication_id = existingMed[0].medication_id;
    } else {
      // Create new medication
      medication_id = uuidv4();
      await connection.query(
        `INSERT INTO medications (
          medication_id, medication_name, generic_name, form,
          strength, atc_code, is_art, is_controlled, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          medication_id,
          medication_name,
          generic_name || null,
          form,
          strength || null,
          atc_code || null,
          is_art || false,
          is_controlled || false,
          true
        ]
      );
    }

    // Create inventory item
    const inventory_id = uuidv4();
    await connection.query(
      `INSERT INTO medication_inventory (
        inventory_id, medication_id, facility_id, batch_number,
        quantity_on_hand, unit, expiry_date, reorder_level,
        last_restocked, supplier, cost_per_unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, ?)`,
      [
        inventory_id,
        medication_id,
        facility_id,
        batch_number || null,
        quantity_on_hand,
        unit,
        expiry_date,
        reorder_level,
        supplier || null,
        cost_per_unit || null
      ]
    );

    await connection.commit();

    // Fetch the created inventory with medication details
    const [result] = await connection.query(
      `SELECT mi.*, m.medication_name, f.facility_name 
       FROM medication_inventory mi
       JOIN medications m ON mi.medication_id = m.medication_id
       JOIN facilities f ON mi.facility_id = f.facility_id
       WHERE mi.inventory_id = ?`,
      [inventory_id]
    );

    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully',
      data: result[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error adding inventory with medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add inventory item',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Update medication
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      medication_name,
      generic_name,
      form,
      strength,
      atc_code,
      is_art,
      is_controlled,
      active,
    } = req.body;

    // Check if medication exists
    const [check] = await db.query(
      'SELECT medication_id FROM medications WHERE medication_id = ?',
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    const query = `
      UPDATE medications SET
        medication_name = ?, generic_name = ?, form = ?,
        strength = ?, atc_code = ?, is_art = ?, is_controlled = ?, active = ?
      WHERE medication_id = ?
    `;

    await db.query(query, [
      medication_name,
      generic_name || null,
      form,
      strength || null,
      atc_code || null,
      is_art || false,
      is_controlled || false,
      active !== false,
      id,
    ]);

    // Fetch updated row
    const [results] = await db.query(
      'SELECT * FROM medications WHERE medication_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Medication updated successfully',
      data: results[0],
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if medication exists
    const [check] = await db.query(
      'SELECT medication_id FROM medications WHERE medication_id = ?',
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    // Check if medication is used in prescriptions or inventory
    const [usageCheck] = await db.query(
      `
      SELECT COUNT(*) as count FROM (
        SELECT medication_id FROM prescription_items WHERE medication_id = ?
        UNION
        SELECT medication_id FROM medication_inventory WHERE medication_id = ?
      ) as med_usage
      `,
      [id, id]
    );

    if (usageCheck[0].count > 0) {
      // Instead of deleting, mark as inactive
      await db.query(
        'UPDATE medications SET active = FALSE WHERE medication_id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Medication deactivated successfully as it is in use',
      });
    } else {
      // Safe to delete
      await db.query('DELETE FROM medications WHERE medication_id = ?', [id]);

      res.json({
        success: true,
        message: 'Medication deleted successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medication',
      error: error.message,
    });
  }
});

export default router;

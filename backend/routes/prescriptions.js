import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all prescriptions
router.get('/', async (req, res) => {
  try {
    const { patient_id, prescriber_id, facility_id, status } = req.query;

    let query = `
      SELECT p.*, pa.first_name, pa.last_name, pa.birth_date, pa.sex as gender,
             u.full_name as prescriber_full_name,
             f.facility_name
      FROM prescriptions p
      LEFT JOIN patients pa ON p.patient_id = pa.patient_id
      LEFT JOIN users u ON p.prescriber_id = u.user_id
      LEFT JOIN facilities f ON p.facility_id = f.facility_id
    `;

    const params = [];
    const conditions = [];

    if (patient_id) {
      conditions.push('p.patient_id = ?');
      params.push(patient_id);
    }

    if (prescriber_id) {
      conditions.push('p.prescriber_id = ?');
      params.push(prescriber_id);
    }

    if (facility_id) {
      conditions.push('p.facility_id = ?');
      params.push(facility_id);
    }

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.prescription_date DESC';

    const [results] = await db.query(query, params);

    // Get prescription items for each prescription
    for (const prescription of results) {
      const [items] = await db.query(
        `
        SELECT pi.*, m.medication_name
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.medication_id
        WHERE pi.prescription_id = ?
      `,
        [prescription.prescription_id]
      );

      prescription.items = items;
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message,
    });
  }
});

// Get prescription by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, pa.first_name, pa.last_name, pa.birth_date, pa.sex as gender,
             u.full_name as prescriber_full_name,
             f.facility_name
      FROM prescriptions p
      LEFT JOIN patients pa ON p.patient_id = pa.patient_id
      LEFT JOIN users u ON p.prescriber_id = u.user_id
      LEFT JOIN facilities f ON p.facility_id = f.facility_id
      WHERE p.prescription_id = ?
    `;

    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    const prescription = results[0];

    // Get prescription items
    const [items] = await db.query(
      `
      SELECT pi.*, m.medication_name
      FROM prescription_items pi
      JOIN medications m ON pi.medication_id = m.medication_id
      WHERE pi.prescription_id = ?
    `,
      [id]
    );

    prescription.items = items;

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message,
    });
  }
});

// Create new prescription (P4.1)
router.post('/', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    const {
      patient_id,
      prescriber_id,
      facility_id,
      start_date,
      end_date,
      duration_days,
      notes,
      items,
    } = req.body;

    // Get authenticated user info
    const authenticatedUserId = req.user?.user_id;
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Use authenticated user as prescriber if not provided, or validate provided prescriber
    const finalPrescriberId = prescriber_id || authenticatedUserId;

    // Get user info for audit logging
    userInfo = await getUserInfoForAudit(authenticatedUserId);

    // Validate required fields
    if (
      !patient_id ||
      !facility_id ||
      !start_date ||
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, facility_id, start_date, and items are required',
      });
    }

    await connection.beginTransaction();

    // Check if patient exists (D2)
    const [patientCheck] = await connection.query(
      'SELECT patient_id, first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    if (patientCheck.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Check if prescriber exists and has appropriate role (physician or admin)
    const [prescriberCheck] = await connection.query(
      'SELECT user_id, full_name, role, status FROM users WHERE user_id = ?',
      [finalPrescriberId]
    );
    if (prescriberCheck.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Prescriber not found',
      });
    }

    const prescriber = prescriberCheck[0];
    
    // Validate prescriber role (must be physician or admin)
    if (!['physician', 'admin'].includes(prescriber.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only physicians and administrators can create prescriptions',
      });
    }

    // Validate prescriber status
    if (prescriber.status !== 'active') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Prescriber account is not active',
      });
    }

    // Check if facility exists
    const [facilityCheck] = await connection.query(
      'SELECT facility_id, facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );
    if (facilityCheck.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Facility not found',
      });
    }

    // Check inventory for each medication (D4)
    const inventoryWarnings = [];
    for (const item of items) {
      // Check if medication exists and get details
      const [medCheck] = await connection.query(
        'SELECT medication_id, medication_name FROM medications WHERE medication_id = ?',
        [item.medication_id]
      );
      if (medCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Medication with ID ${item.medication_id} not found`,
        });
      }

      // Check inventory availability at facility
      const [inventoryCheck] = await connection.query(
        `SELECT inventory_id, quantity_on_hand, reorder_level 
         FROM medication_inventory 
         WHERE medication_id = ? AND facility_id = ?`,
        [item.medication_id, facility_id]
      );

      if (inventoryCheck.length === 0) {
        inventoryWarnings.push({
          medication: medCheck[0].medication_name,
          message: 'No inventory found at this facility',
        });
      } else {
        const inventory = inventoryCheck[0];
        if (inventory.quantity_on_hand < item.quantity) {
          inventoryWarnings.push({
            medication: medCheck[0].medication_name,
            message: `Insufficient stock. Available: ${inventory.quantity_on_hand}, Required: ${item.quantity}`,
          });
        } else if (inventory.quantity_on_hand <= inventory.reorder_level) {
          inventoryWarnings.push({
            medication: medCheck[0].medication_name,
            message: `Low stock warning. Current: ${inventory.quantity_on_hand}, Reorder level: ${inventory.reorder_level}`,
          });
        }
      }
    }

    // If critical inventory issues, return warning but allow creation
    // (You can change this to block creation if needed)
    const criticalIssues = inventoryWarnings.filter(
      (w) => w.message.includes('Insufficient stock') || w.message.includes('No inventory')
    );
    if (criticalIssues.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot create prescription due to inventory issues',
        warnings: inventoryWarnings,
      });
    }

    // Generate prescription number
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM prescriptions WHERE DATE(prescription_date) = CURDATE()'
    );
    const count = countResult[0]?.count || 0;
    const prescription_number = `RX-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}${String(new Date().getDate()).padStart(
      2,
      '0'
    )}-${String(count + 1).padStart(4, '0')}`;

    const prescription_id = uuidv4();

    // Insert prescription (D4)
    await connection.query(
      `
      INSERT INTO prescriptions (
        prescription_id, patient_id, prescriber_id, facility_id,
        prescription_date, prescription_number, start_date, end_date,
        duration_days, notes, status
      ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, 'active')
    `,
      [
        prescription_id,
        patient_id,
        finalPrescriberId,
        facility_id,
        prescription_number,
        start_date,
        end_date,
        duration_days,
        notes,
      ]
    );

    // Insert prescription items (D4)
    const prescriptionItems = [];
    for (const item of items) {
      const prescription_item_id = uuidv4();

      await connection.query(
        `
        INSERT INTO prescription_items (
          prescription_item_id, prescription_id, medication_id,
          dosage, frequency, quantity, instructions, duration_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          prescription_item_id,
          prescription_id,
          item.medication_id,
          item.dosage,
          item.frequency,
          item.quantity,
          item.instructions || null,
          item.duration_days || null,
        ]
      );

      prescriptionItems.push({
        prescription_item_id,
        medication_id: item.medication_id,
        quantity: item.quantity,
      });
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Prescriptions',
        entity_type: 'prescription',
        entity_id: prescription_id,
        record_id: prescription_id,
        new_value: {
          prescription_id,
          prescription_number,
          patient_id,
          prescriber_id: finalPrescriberId,
          facility_id,
          items: prescriptionItems,
        },
        change_summary: `Created prescription ${prescription_number} for patient ${patientCheck[0].first_name} ${patientCheck[0].last_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: {
        prescription_id,
        prescription_number,
      },
      warnings: inventoryWarnings.length > 0 ? inventoryWarnings : undefined,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating prescription:', error);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Prescriptions',
        entity_type: 'prescription',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create prescription',
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// Update prescription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, duration_days, notes, status } = req.body;

    // Check if prescription exists
    const [check] = await db.query(
      'SELECT prescription_id FROM prescriptions WHERE prescription_id = ?',
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    const query = `
      UPDATE prescriptions SET
        start_date = ?, end_date = ?, duration_days = ?, notes = ?, status = ?
      WHERE prescription_id = ?
    `;

    await db.query(query, [
      start_date,
      end_date,
      duration_days,
      notes,
      status,
      id,
    ]);

    // Log to audit
    await db.query(
      'INSERT INTO audit_log (table_name, record_id, action, user_id, timestamp) VALUES (?, ?, ?, ?, NOW())',
      ['prescriptions', id, 'UPDATE', req.user?.user_id || null]
    );

    res.json({
      success: true,
      message: 'Prescription updated successfully',
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prescription',
      error: error.message,
    });
  }
});

// Cancel prescription
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if prescription exists
    const [check] = await db.query(
      'SELECT prescription_id, status FROM prescriptions WHERE prescription_id = ?',
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    if (check[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Prescription is already cancelled',
      });
    }

    await db.query(
      'UPDATE prescriptions SET status = ?, notes = CONCAT(IFNULL(notes, ""), "\n\nCancellation reason: ", ?) WHERE prescription_id = ?',
      ['cancelled', reason || 'No reason provided', id]
    );

    // Log to audit
    await db.query(
      'INSERT INTO audit_log (table_name, record_id, action, user_id, timestamp, details) VALUES (?, ?, ?, ?, NOW(), ?)',
      [
        'prescriptions',
        id,
        'CANCEL',
        req.user?.user_id || null,
        reason || 'No reason provided',
      ]
    );

    res.json({
      success: true,
      message: 'Prescription cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel prescription',
      error: error.message,
    });
  }
});

// Dispense medication from prescription (P4.3)
router.post('/:id/dispense', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    const { id } = req.params;
    const { nurse_id, facility_id, items } = req.body;

    // Validate required fields
    if (!nurse_id) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'nurse_id is required',
      });
    }

    if (!facility_id) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'facility_id is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'items array is required and must not be empty',
      });
    }

    // Verify nurse exists
    const [nurseCheck] = await connection.query(
      'SELECT user_id, full_name, role FROM users WHERE user_id = ?',
      [nurse_id]
    );

    if (nurseCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: `Nurse with ID ${nurse_id} not found`,
      });
    }

    // Verify facility exists
    const [facilityCheck] = await connection.query(
      'SELECT facility_id, facility_name FROM facilities WHERE facility_id = ?',
      [facility_id]
    );

    if (facilityCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: `Facility with ID ${facility_id} not found`,
      });
    }

    // Get user info for audit logging
    if (req.user?.user_id || nurse_id) {
      const userId = req.user?.user_id || nurse_id;
      userInfo = await getUserInfoForAudit(userId);
    }

    await connection.beginTransaction();

    // Check if prescription exists and get details (D4)
    const [prescriptionCheck] = await connection.query(
      `SELECT p.prescription_id, p.patient_id, p.status, p.prescription_number,
              pa.first_name, pa.last_name
       FROM prescriptions p
       JOIN patients pa ON p.patient_id = pa.patient_id
       WHERE p.prescription_id = ?`,
      [id]
    );

    if (prescriptionCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    const prescription = prescriptionCheck[0];

    if (prescription.status !== 'active') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Prescription is not active',
      });
    }

    // Validate required fields
    if (!nurse_id || !facility_id || !items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: nurse_id, facility_id, and items',
      });
    }

    const dispenseEvents = [];

    // Process each dispense item
    for (const item of items) {
      const {
        prescription_item_id,
        quantity_dispensed,
        batch_number,
        notes,
      } = item;

      // Validate required fields
      if (!prescription_item_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing prescription_item_id in dispense item',
          item: item,
        });
      }

      if (!quantity_dispensed || quantity_dispensed <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity_dispensed. Must be greater than 0',
          item: item,
        });
      }

      // Check if prescription item exists (D4)
      const [itemCheck] = await connection.query(
        `SELECT pi.prescription_item_id, pi.medication_id, pi.quantity, pi.dosage, pi.frequency,
                m.medication_name
         FROM prescription_items pi
         JOIN medications m ON pi.medication_id = m.medication_id
         WHERE pi.prescription_item_id = ? AND pi.prescription_id = ?`,
        [prescription_item_id, id]
      );

      if (itemCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Prescription item with ID ${prescription_item_id} not found for prescription ${id}`,
          prescription_item_id: prescription_item_id,
          prescription_id: id,
        });
      }

      const prescriptionItem = itemCheck[0];
      const medication_id = prescriptionItem.medication_id;

      // Check inventory availability (D4)
      const [inventoryCheck] = await connection.query(
        `SELECT inventory_id, quantity_on_hand, reorder_level
         FROM medication_inventory 
         WHERE medication_id = ? AND facility_id = ?`,
        [medication_id, facility_id]
      );

      if (inventoryCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `No inventory found for ${prescriptionItem.medication_name} at this facility`,
        });
      }

      const inventory = inventoryCheck[0];

      // Verify quantity_on_hand >= quantity_dispensed
      if (inventory.quantity_on_hand < quantity_dispensed) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${prescriptionItem.medication_name}. Available: ${inventory.quantity_on_hand}, Requested: ${quantity_dispensed}`,
        });
      }

      // Create dispense event (D4)
      const dispense_id = uuidv4();
      await connection.query(
        `
        INSERT INTO dispense_events (
          dispense_id, prescription_id, prescription_item_id, nurse_id,
          facility_id, dispensed_date, quantity_dispensed, batch_number, notes
        ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?)
      `,
        [
          dispense_id,
          id,
          prescription_item_id,
          nurse_id,
          facility_id,
          quantity_dispensed,
          batch_number || null,
          notes || null,
        ]
      );

      // Update inventory: quantity_on_hand = quantity_on_hand - quantity_dispensed (D4)
      await connection.query(
        'UPDATE medication_inventory SET quantity_on_hand = quantity_on_hand - ? WHERE inventory_id = ?',
        [quantity_dispensed, inventory.inventory_id]
      );

      // Trigger reminder creation - save to medication_reminders (D4)
      // Check if reminder already exists for this prescription item
      try {
      const [existingReminder] = await connection.query(
        'SELECT reminder_id FROM medication_reminders WHERE prescription_id = ? AND medication_name = ?',
        [id, prescriptionItem.medication_name]
      );

      if (existingReminder.length === 0) {
        const reminder_id = uuidv4();
        await connection.query(
          `
          INSERT INTO medication_reminders (
            reminder_id, prescription_id, patient_id, medication_name,
            dosage, frequency, reminder_time, active
          ) VALUES (?, ?, ?, ?, ?, ?, '09:00:00', TRUE)
        `,
          [
            reminder_id,
            id,
            prescription.patient_id,
            prescriptionItem.medication_name,
            prescriptionItem.dosage,
            prescriptionItem.frequency,
          ]
        );
        }
      } catch (reminderError) {
        // Log reminder creation error but don't fail the dispense
        console.warn('Warning: Failed to create medication reminder:', reminderError.message);
        // Continue with dispense even if reminder creation fails
      }

      dispenseEvents.push({
        dispense_id,
        medication_name: prescriptionItem.medication_name,
        quantity_dispensed,
      });
    }

    // Log audit entry (D8)
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DISPENSE',
        module: 'Prescriptions',
        entity_type: 'prescription',
        entity_id: id,
        record_id: id,
        new_value: {
          prescription_id: id,
          prescription_number: prescription.prescription_number,
          dispense_events: dispenseEvents,
        },
        change_summary: `Dispensed medication for prescription ${prescription.prescription_number}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Medication dispensed successfully',
      data: {
        dispense_events: dispenseEvents,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error dispensing medication:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Prescription ID:', req.params.id);

    // Log failed audit entry
    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DISPENSE',
        module: 'Prescriptions',
        entity_type: 'prescription',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    // Build detailed error message
    let errorMessage = error.message || 'Failed to dispense medication';
    
    // Check for SQL foreign key constraint violations
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
      if (error.sqlMessage?.includes('nurse_id')) {
        errorMessage = `Invalid nurse_id: ${req.body.nurse_id}. Nurse not found in database.`;
      } else if (error.sqlMessage?.includes('facility_id')) {
        errorMessage = `Invalid facility_id: ${req.body.facility_id}. Facility not found in database.`;
      } else if (error.sqlMessage?.includes('prescription_item_id')) {
        errorMessage = `Invalid prescription_item_id. Prescription item not found in database.`;
      } else if (error.sqlMessage?.includes('prescription_id')) {
        errorMessage = `Invalid prescription_id: ${req.params.id}. Prescription not found in database.`;
      } else {
        errorMessage = `Database constraint violation: ${error.sqlMessage || error.message}`;
      }
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = `Duplicate entry: ${error.sqlMessage || error.message}`;
    } else if (error.sqlMessage) {
      errorMessage = `${error.message}. SQL Error: ${error.sqlMessage}`;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      error_code: error.code,
      sql_state: error.sqlState,
      sql_message: error.sqlMessage,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        request_body: req.body,
        prescription_id: req.params.id,
      } : undefined,
    });
  } finally {
    connection.release();
  }
});

// Get dispense events for a prescription
router.get('/:id/dispense-events', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT de.*, u.full_name as nurse_name,
             f.facility_name
      FROM dispense_events de
      JOIN users u ON de.nurse_id = u.user_id
      JOIN facilities f ON de.facility_id = f.facility_id
      WHERE de.prescription_id = ?
      ORDER BY de.dispensed_date DESC
    `;

    const [results] = await db.query(query, [id]);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching dispense events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispense events',
      error: error.message,
    });
  }
});

export default router;

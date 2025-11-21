import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';

const router = express.Router();

// Helper function to clean undefined values
function clean(obj) {
  const cleaned = {};
  for (const key in obj) {
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  }
  return cleaned;
}

// GET /api/reports/queries - Get all report queries
router.get('/queries', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { report_type, is_public, owner_id } = req.query;

    let query = `
      SELECT 
        rq.*,
        u.full_name AS owner_name
      FROM report_queries rq
      LEFT JOIN users u ON rq.owner_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // Filter by report type
    if (report_type) {
      query += ' AND rq.report_type = ?';
      params.push(report_type);
    }

    // Filter by public/private
    if (is_public !== undefined) {
      query += ' AND rq.is_public = ?';
      params.push(is_public === 'true' ? 1 : 0);
    }

    // Filter by owner
    if (owner_id) {
      query += ' AND rq.owner_id = ?';
      params.push(owner_id);
    }

    // Non-admin users see only public reports or their own reports
    if (req.user.role !== 'admin') {
      query += ' AND (rq.is_public = 1 OR rq.owner_id = ?)';
      params.push(req.user.user_id);
    }

    query += ' ORDER BY rq.created_at DESC';

    const [reports] = await db.query(query, params);

    // Parse JSON fields
    const parsedReports = reports.map(report => ({
      ...report,
      query_definition: typeof report.query_definition === 'string' 
        ? JSON.parse(report.query_definition) 
        : report.query_definition,
      parameters: report.parameters 
        ? (typeof report.parameters === 'string' ? JSON.parse(report.parameters) : report.parameters)
        : null,
    }));

    res.json({ success: true, reports: parsedReports });
  } catch (err) {
    console.error('Fetch report queries error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/queries/:id - Get report query by ID
router.get('/queries/:id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [reports] = await db.query(
      `SELECT 
        rq.*,
        u.full_name AS owner_name
      FROM report_queries rq
      LEFT JOIN users u ON rq.owner_id = u.user_id
      WHERE rq.report_id = ?`,
      [req.params.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Report query not found' });
    }

    const report = reports[0];

    // Check access - non-admin users can only see public reports or their own
    if (req.user.role !== 'admin' && 
        report.is_public === 0 && 
        report.owner_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Parse JSON fields
    const parsedReport = {
      ...report,
      query_definition: typeof report.query_definition === 'string' 
        ? JSON.parse(report.query_definition) 
        : report.query_definition,
      parameters: report.parameters 
        ? (typeof report.parameters === 'string' ? JSON.parse(report.parameters) : report.parameters)
        : null,
    };

    res.json({ success: true, report: parsedReport });
  } catch (err) {
    console.error('Fetch report query error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/reports/queries - Create new report query
router.post('/queries', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      report_name,
      report_description,
      report_type,
      query_definition,
      parameters,
      schedule,
      is_public = false,
    } = req.body;

    // Validate required fields
    if (!report_name || !report_type || !query_definition) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: report_name, report_type, query_definition',
      });
    }

    // Generate UUID
    const report_id = uuidv4();

    // Insert report query
    await db.query(
      `INSERT INTO report_queries (
        report_id, report_name, report_description, report_type,
        query_definition, parameters, schedule, owner_id, is_public, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        report_id,
        report_name,
        report_description || null,
        report_type,
        JSON.stringify(query_definition),
        parameters ? JSON.stringify(parameters) : null,
        schedule || null,
        req.user.user_id,
        is_public ? 1 : 0,
      ]
    );

    // Log audit
    const auditInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      ...auditInfo,
      action: 'CREATE',
      module: 'Reports',
      entity_type: 'report_query',
      entity_id: report_id,
      record_id: report_id,
      new_value: { report_id, report_name, report_type },
      change_summary: `Created report query: ${report_name}`,
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Report query created successfully',
      report: { report_id, report_name, report_type },
    });
  } catch (err) {
    console.error('Create report query error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/reports/queries/:id - Update report query
router.put('/queries/:id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [reports] = await db.query(
      'SELECT * FROM report_queries WHERE report_id = ?',
      [req.params.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Report query not found' });
    }

    // Check access - non-admin users can only update their own reports
    if (req.user.role !== 'admin' && reports[0].owner_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      report_name,
      report_description,
      report_type,
      query_definition,
      parameters,
      schedule,
      is_public,
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (report_name !== undefined) {
      updateFields.push('report_name = ?');
      updateValues.push(report_name);
    }

    if (report_description !== undefined) {
      updateFields.push('report_description = ?');
      updateValues.push(report_description);
    }

    if (report_type !== undefined) {
      updateFields.push('report_type = ?');
      updateValues.push(report_type);
    }

    if (query_definition !== undefined) {
      updateFields.push('query_definition = ?');
      updateValues.push(JSON.stringify(query_definition));
    }

    if (parameters !== undefined) {
      updateFields.push('parameters = ?');
      updateValues.push(parameters ? JSON.stringify(parameters) : null);
    }

    if (schedule !== undefined) {
      updateFields.push('schedule = ?');
      updateValues.push(schedule);
    }

    if (is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(is_public ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    await db.query(
      `UPDATE report_queries SET ${updateFields.join(', ')} WHERE report_id = ?`,
      updateValues
    );

    // Log audit
    const auditInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      ...auditInfo,
      action: 'UPDATE',
      module: 'Reports',
      entity_type: 'report_query',
      entity_id: req.params.id,
      record_id: req.params.id,
      old_value: reports[0],
      new_value: req.body,
      change_summary: `Updated report query: ${reports[0].report_name}`,
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Report query updated successfully' });
  } catch (err) {
    console.error('Update report query error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// DELETE /api/reports/queries/:id - Delete report query
router.delete('/queries/:id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [reports] = await db.query(
      'SELECT * FROM report_queries WHERE report_id = ?',
      [req.params.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Report query not found' });
    }

    // Check access - non-admin users can only delete their own reports
    if (req.user.role !== 'admin' && reports[0].owner_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.query('DELETE FROM report_queries WHERE report_id = ?', [req.params.id]);

    // Log audit
    const auditInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      ...auditInfo,
      action: 'DELETE',
      module: 'Reports',
      entity_type: 'report_query',
      entity_id: req.params.id,
      record_id: req.params.id,
      old_value: reports[0],
      change_summary: `Deleted report query: ${reports[0].report_name}`,
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Report query deleted successfully' });
  } catch (err) {
    console.error('Delete report query error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/reports/queries/:id/run - Run a report query
router.post('/queries/:id/run', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    if (!['admin', 'physician'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get report query
    const [reports] = await connection.query(
      'SELECT * FROM report_queries WHERE report_id = ?',
      [req.params.id]
    );

    if (reports.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Report query not found' });
    }

    const report = reports[0];

    // Check access
    if (req.user.role !== 'admin' && 
        report.is_public === 0 && 
        report.owner_id !== req.user.user_id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Parse query definition
    const queryDefinition = typeof report.query_definition === 'string'
      ? JSON.parse(report.query_definition)
      : report.query_definition;

    // Merge parameters from request with default parameters
    const defaultParams = report.parameters
      ? (typeof report.parameters === 'string' ? JSON.parse(report.parameters) : report.parameters)
      : {};
    const runParams = { ...defaultParams, ...req.body.parameters };

    // Create report run record
    const run_id = uuidv4();
    await connection.query(
      `INSERT INTO report_runs (
        run_id, report_id, started_at, status, parameters_used, run_by
      ) VALUES (?, ?, NOW(), 'running', ?, ?)`,
      [
        run_id,
        req.params.id,
        JSON.stringify(runParams),
        req.user.user_id,
      ]
    );

    await connection.commit();

    // Execute report query (simplified - in production, this would execute the actual query)
    // For now, we'll return a placeholder response
    // In production, you would:
    // 1. Parse the query_definition to build the SQL query
    // 2. Execute the query with the parameters
    // 3. Process and format the results
    // 4. Update the report_runs record with results

    // Update run status to completed (simplified)
    setTimeout(async () => {
      try {
        await db.query(
          `UPDATE report_runs 
           SET status = 'completed', finished_at = NOW()
           WHERE run_id = ?`,
          [run_id]
        );
      } catch (err) {
        console.error('Error updating report run status:', err);
      }
    }, 100);

    // Log audit
    const auditInfo = await getUserInfoForAudit(req.user.user_id);
    await logAudit({
      ...auditInfo,
      action: 'EXPORT',
      module: 'Reports',
      entity_type: 'report_run',
      entity_id: run_id,
      record_id: run_id,
      new_value: { run_id, report_id: req.params.id },
      change_summary: `Ran report: ${report.report_name}`,
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Report run started',
      run: { run_id, report_id: req.params.id, status: 'running' },
    });
  } catch (err) {
    await connection.rollback();
    console.error('Run report error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/reports/runs - Get report runs
router.get('/runs', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { report_id, status, run_by } = req.query;

    let query = `
      SELECT 
        rr.*,
        rq.report_name,
        u.full_name AS run_by_name
      FROM report_runs rr
      LEFT JOIN report_queries rq ON rr.report_id = rq.report_id
      LEFT JOIN users u ON rr.run_by = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (report_id) {
      query += ' AND rr.report_id = ?';
      params.push(report_id);
    }

    if (status) {
      query += ' AND rr.status = ?';
      params.push(status);
    }

    if (run_by) {
      query += ' AND rr.run_by = ?';
      params.push(run_by);
    }

    // Non-admin users see only their own runs
    if (req.user.role !== 'admin') {
      query += ' AND rr.run_by = ?';
      params.push(req.user.user_id);
    }

    query += ' ORDER BY rr.started_at DESC LIMIT 100';

    const [runs] = await db.query(query, params);

    // Parse JSON fields
    const parsedRuns = runs.map(run => ({
      ...run,
      parameters_used: run.parameters_used
        ? (typeof run.parameters_used === 'string' ? JSON.parse(run.parameters_used) : run.parameters_used)
        : null,
    }));

    res.json({ success: true, runs: parsedRuns });
  } catch (err) {
    console.error('Fetch report runs error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/runs/:id - Get report run by ID
router.get('/runs/:id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [runs] = await db.query(
      `SELECT 
        rr.*,
        rq.report_name,
        u.full_name AS run_by_name
      FROM report_runs rr
      LEFT JOIN report_queries rq ON rr.report_id = rq.report_id
      LEFT JOIN users u ON rr.run_by = u.user_id
      WHERE rr.run_id = ?`,
      [req.params.id]
    );

    if (runs.length === 0) {
      return res.status(404).json({ success: false, message: 'Report run not found' });
    }

    // Check access - non-admin users can only see their own runs
    if (req.user.role !== 'admin' && runs[0].run_by !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const run = runs[0];
    const parsedRun = {
      ...run,
      parameters_used: run.parameters_used
        ? (typeof run.parameters_used === 'string' ? JSON.parse(run.parameters_used) : run.parameters_used)
        : null,
    };

    res.json({ success: true, run: parsedRun });
  } catch (err) {
    console.error('Fetch report run error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, date_from, date_to } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [];
    
    if (date_from) {
      dateFilter += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    // Get patient statistics
    let patientQuery = 'SELECT COUNT(*) as total FROM patients WHERE 1=1';
    if (facility_id) {
      patientQuery += ' AND facility_id = ?';
      params.push(facility_id);
    }
    const [patientStats] = await db.query(patientQuery, facility_id ? [facility_id] : []);

    // Get clinical visit statistics
    let visitQuery = `SELECT COUNT(*) as total FROM clinical_visits WHERE 1=1 ${dateFilter}`;
    const visitParams = [...params];
    if (facility_id) {
      visitQuery = visitQuery.replace('WHERE 1=1', 'WHERE facility_id = ?');
      visitParams.unshift(facility_id);
    }
    const [visitStats] = await db.query(visitQuery, visitParams);

    // Get prescription statistics
    let prescriptionQuery = `SELECT COUNT(*) as total FROM prescriptions WHERE 1=1 ${dateFilter}`;
    const prescriptionParams = [...params];
    if (facility_id) {
      prescriptionQuery = prescriptionQuery.replace('WHERE 1=1', 'WHERE facility_id = ?');
      prescriptionParams.unshift(facility_id);
    }
    const [prescriptionStats] = await db.query(prescriptionQuery, prescriptionParams);

    // Get lab result statistics
    let labQuery = `SELECT COUNT(*) as total FROM lab_results WHERE 1=1 ${dateFilter}`;
    const labParams = [...params];
    if (facility_id) {
      labQuery = labQuery.replace('WHERE 1=1', 'WHERE facility_id = ?');
      labParams.unshift(facility_id);
    }
    const [labStats] = await db.query(labQuery, labParams);

    // Get appointment statistics
    let appointmentQuery = `SELECT COUNT(*) as total FROM appointments WHERE 1=1 ${dateFilter}`;
    const appointmentParams = [...params];
    if (facility_id) {
      appointmentQuery = appointmentQuery.replace('WHERE 1=1', 'WHERE facility_id = ?');
      appointmentParams.unshift(facility_id);
    }
    const [appointmentStats] = await db.query(appointmentQuery, appointmentParams);

    // Get medication adherence statistics
    let adherenceQuery = `SELECT AVG(adherence_percentage) as avg_adherence FROM medication_adherence WHERE 1=1 ${dateFilter}`;
    const adherenceParams = [...params];
    if (facility_id) {
      // Note: medication_adherence doesn't have facility_id directly, would need to join with patients
      adherenceQuery = adherenceQuery.replace('WHERE 1=1', 'WHERE 1=1');
    }
    const [adherenceStats] = await db.query(adherenceQuery, adherenceParams);

    res.json({
      success: true,
      stats: {
        total_patients: patientStats[0]?.total || 0,
        total_visits: visitStats[0]?.total || 0,
        total_prescriptions: prescriptionStats[0]?.total || 0,
        total_lab_results: labStats[0]?.total || 0,
        total_appointments: appointmentStats[0]?.total || 0,
        avg_adherence: adherenceStats[0]?.avg_adherence || 0,
      },
    });
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/cache/:widget_id - Get cached dashboard data
router.get('/dashboard/cache/:widget_id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { widget_id } = req.params;
    const { parameters } = req.query;

    // Parse parameters if provided
    let parsedParams = {};
    if (parameters) {
      try {
        parsedParams = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
      } catch (e) {
        parsedParams = {};
      }
    }

    // Check cache
    const [cache] = await db.query(
      `SELECT * FROM dashboard_cache 
       WHERE widget_id = ? 
       AND parameters = ?
       AND expires_at > NOW()
       ORDER BY cached_at DESC
       LIMIT 1`,
      [
        widget_id,
        JSON.stringify(parsedParams),
      ]
    );

    if (cache.length > 0) {
      const cachedData = typeof cache[0].cached_data === 'string'
        ? JSON.parse(cache[0].cached_data)
        : cache[0].cached_data;

      return res.json({
        success: true,
        cached: true,
        data: cachedData,
        cached_at: cache[0].cached_at,
      });
    }

    res.json({ success: true, cached: false, data: null });
  } catch (err) {
    console.error('Fetch dashboard cache error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/reports/dashboard/cache - Cache dashboard data
router.post('/dashboard/cache', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { widget_id, parameters, cached_data, expires_in_hours = 24 } = req.body;

    if (!widget_id || !cached_data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: widget_id, cached_data',
      });
    }

    const cache_id = uuidv4();
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + expires_in_hours);

    await db.query(
      `INSERT INTO dashboard_cache (
        cache_id, widget_id, parameters, cached_data, cached_at, expires_at
      ) VALUES (?, ?, ?, ?, NOW(), ?)`,
      [
        cache_id,
        widget_id,
        JSON.stringify(parameters || {}),
        JSON.stringify(cached_data),
        expires_at,
      ]
    );

    res.json({
      success: true,
      message: 'Dashboard data cached successfully',
      cache: { cache_id, widget_id, expires_at },
    });
  } catch (err) {
    console.error('Cache dashboard data error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/charts/adherence-trends - Get adherence trends data for chart
router.get('/charts/adherence-trends', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, months = 6 } = req.query;
    const monthsBack = parseInt(months);

    // Get adherence data grouped by month
    let query = `
      SELECT 
        DATE_FORMAT(ma.recorded_at, '%Y-%m') as month,
        AVG(ma.adherence_percentage) as avg_adherence,
        COUNT(*) as record_count
      FROM medication_adherence ma
    `;

    const params = [];

    if (facility_id) {
      query += `
        INNER JOIN patients p ON ma.patient_id = p.patient_id
        WHERE p.facility_id = ?
      `;
      params.push(facility_id);
    } else {
      query += ' WHERE 1=1';
    }

    query += `
      AND ma.recorded_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(ma.recorded_at, '%Y-%m')
      ORDER BY month ASC
    `;
    params.push(monthsBack);

    const [results] = await db.query(query, params);

    // Format for chart
    const chartData = results.map(row => ({
      name: row.month,
      value: parseFloat(row.avg_adherence || 0),
    }));

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch adherence trends error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/charts/inventory-levels - Get inventory levels data for chart
router.get('/charts/inventory-levels', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, limit = 10 } = req.query;

    let query = `
      SELECT 
        m.medication_name,
        mi.quantity_on_hand,
        mi.reorder_level
      FROM medication_inventory mi
      JOIN medications m ON mi.medication_id = m.medication_id
    `;

    const params = [];

    if (facility_id) {
      query += ' WHERE mi.facility_id = ?';
      params.push(facility_id);
    } else {
      query += ' WHERE 1=1';
    }

    query += `
      ORDER BY mi.quantity_on_hand ASC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [results] = await db.query(query, params);

    // Format for chart (top medications by stock level)
    const chartData = results.map(row => ({
      name: row.medication_name.length > 15 
        ? row.medication_name.substring(0, 15) + '...' 
        : row.medication_name,
      value: parseInt(row.quantity_on_hand || 0),
    }));

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch inventory levels error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/charts/appointment-attendance - Get appointment attendance data for chart
router.get('/charts/appointment-attendance', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id } = req.query;

    let query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM appointments
    `;

    const params = [];

    if (facility_id) {
      query += ' WHERE facility_id = ?';
      params.push(facility_id);
    } else {
      query += ' WHERE 1=1';
    }

    query += ' GROUP BY status';

    const [results] = await db.query(query, params);

    // Format for pie chart
    const statusMap = {
      'completed': { name: 'Completed', color: '#4caf50' },
      'scheduled': { name: 'Scheduled', color: '#1976d2' },
      'cancelled': { name: 'Cancelled', color: '#f44336' },
      'no_show': { name: 'No Show', color: '#ff9800' },
      'in_progress': { name: 'In Progress', color: '#9c27b0' },
    };

    const chartData = results.map(row => {
      const statusInfo = statusMap[row.status] || { name: row.status, color: '#757575' };
      return {
        name: statusInfo.name,
        value: parseInt(row.count || 0),
        color: statusInfo.color,
      };
    });

    // Calculate percentages
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    if (total > 0) {
      chartData.forEach(item => {
        item.percentage = Math.round((item.value / total) * 100);
      });
    }

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch appointment attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/overview - Get comprehensive dashboard overview data
router.get('/dashboard/overview', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id } = req.query;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // 1. Get total patients
    let patientQuery = "SELECT COUNT(*) as total FROM patients WHERE status = 'active'";
    const patientParams = [];
    if (facility_id) {
      patientQuery += ' AND facility_id = ?';
      patientParams.push(facility_id);
    }
    const [patientStats] = await db.query(patientQuery, patientParams);

    // 2. Get today's appointments
    let todayAppointmentsQuery = `
      SELECT COUNT(*) as total 
      FROM appointments 
      WHERE DATE(scheduled_start) = ? 
      AND status IN ('scheduled', 'confirmed', 'in_progress')
    `;
    const todayAppointmentsParams = [today];
    if (facility_id) {
      todayAppointmentsQuery += ' AND facility_id = ?';
      todayAppointmentsParams.push(facility_id);
    }
    const [todayAppointmentsStats] = await db.query(todayAppointmentsQuery, todayAppointmentsParams);

    // 3. Get low stock alerts
    let lowStockQuery = `
      SELECT COUNT(*) as total 
      FROM medication_inventory 
      WHERE quantity_on_hand <= reorder_level 
      AND quantity_on_hand > 0
    `;
    const lowStockParams = [];
    if (facility_id) {
      lowStockQuery += ' AND facility_id = ?';
      lowStockParams.push(facility_id);
    }
    const [lowStockStats] = await db.query(lowStockQuery, lowStockParams);

    // 4. Get monthly prescriptions (current month)
    let monthlyPrescriptionsQuery = `
      SELECT COUNT(*) as total 
      FROM prescriptions 
      WHERE MONTH(prescription_date) = MONTH(CURRENT_DATE())
      AND YEAR(prescription_date) = YEAR(CURRENT_DATE())
    `;
    const monthlyPrescriptionsParams = [];
    if (facility_id) {
      monthlyPrescriptionsQuery += ' AND facility_id = ?';
      monthlyPrescriptionsParams.push(facility_id);
    }
    const [monthlyPrescriptionsStats] = await db.query(monthlyPrescriptionsQuery, monthlyPrescriptionsParams);

    res.json({
      success: true,
      stats: {
        totalPatients: patientStats[0]?.total || 0,
        todayAppointments: todayAppointmentsStats[0]?.total || 0,
        lowStockAlerts: lowStockStats[0]?.total || 0,
        monthlyPrescriptions: monthlyPrescriptionsStats[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error('Fetch dashboard overview error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/patient-registration-trends - Get patient registration trends
router.get('/dashboard/patient-registration-trends', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, months = 6 } = req.query;
    const monthsBack = parseInt(months);

    let query = `
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as patients
      FROM patients
      WHERE status = 'active'
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `;

    const params = [monthsBack];

    if (facility_id) {
      query += ' AND facility_id = ?';
      params.push(facility_id);
    }

    query += `
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
    `;

    const [results] = await db.query(query, params);

    // Format for chart
    const chartData = results.map(row => ({
      name: row.month,
      patients: parseInt(row.patients || 0),
    }));

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch patient registration trends error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/monthly-appointments - Get monthly appointments
router.get('/dashboard/monthly-appointments', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, months = 6 } = req.query;
    const monthsBack = parseInt(months);

    let query = `
      SELECT 
        DATE_FORMAT(scheduled_start, '%b') as month,
        COUNT(*) as appointments
      FROM appointments
      WHERE scheduled_start >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `;

    const params = [monthsBack];

    if (facility_id) {
      query += ' AND facility_id = ?';
      params.push(facility_id);
    }

    query += `
      GROUP BY DATE_FORMAT(scheduled_start, '%Y-%m'), DATE_FORMAT(scheduled_start, '%b')
      ORDER BY DATE_FORMAT(scheduled_start, '%Y-%m') ASC
    `;

    const [results] = await db.query(query, params);

    // Format for chart
    const chartData = results.map(row => ({
      name: row.month,
      appointments: parseInt(row.appointments || 0),
    }));

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch monthly appointments error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/monthly-prescriptions - Get monthly prescriptions
router.get('/dashboard/monthly-prescriptions', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, months = 6 } = req.query;
    const monthsBack = parseInt(months);

    let query = `
      SELECT 
        DATE_FORMAT(prescription_date, '%b') as month,
        COUNT(*) as prescriptions
      FROM prescriptions
      WHERE prescription_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `;

    const params = [monthsBack];

    if (facility_id) {
      query += ' AND facility_id = ?';
      params.push(facility_id);
    }

    query += `
      GROUP BY DATE_FORMAT(prescription_date, '%Y-%m'), DATE_FORMAT(prescription_date, '%b')
      ORDER BY DATE_FORMAT(prescription_date, '%Y-%m') ASC
    `;

    const [results] = await db.query(query, params);

    // Format for chart
    const chartData = results.map(row => ({
      name: row.month,
      prescriptions: parseInt(row.prescriptions || 0),
    }));

    res.json({ success: true, data: chartData });
  } catch (err) {
    console.error('Fetch monthly prescriptions error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/risk-distribution - Get patient risk distribution
router.get('/dashboard/risk-distribution', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id } = req.query;

    let query = `
      SELECT 
        CASE 
          WHEN arpa_risk_score IS NULL OR arpa_risk_score < 25 THEN 'Low'
          WHEN arpa_risk_score < 50 THEN 'Medium'
          WHEN arpa_risk_score < 75 THEN 'High'
          ELSE 'Critical'
        END as risk_level,
        COUNT(*) as count
      FROM patients
      WHERE status = 'active'
    `;

    const params = [];

    if (facility_id) {
      query += ' AND facility_id = ?';
      params.push(facility_id);
    }

    query += ' GROUP BY risk_level';

    const [results] = await db.query(query, params);

    // Format for pie chart
    const riskMap = {
      'Low': { color: '#4caf50' },
      'Medium': { color: '#ff9800' },
      'High': { color: '#f44336' },
      'Critical': { color: '#8b0000' },
    };

    const chartData = results.map(row => {
      const riskInfo = riskMap[row.risk_level] || { color: '#757575' };
      return {
        name: row.risk_level,
        value: parseFloat(row.count || 0),
        color: riskInfo.color,
      };
    });

    // Calculate total count for percentage calculation
    const totalCount = results.reduce((sum, row) => sum + parseInt(row.count || 0), 0);

    res.json({ success: true, data: chartData, total: totalCount });
  } catch (err) {
    console.error('Fetch risk distribution error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/reports/dashboard/recent-activity - Get recent activity
router.get('/dashboard/recent-activity', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'physician', 'nurse', 'case_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { facility_id, limit = 10 } = req.query;

    // Get recent appointments
    let appointmentsQuery = `
      SELECT 
        'Follow-up' as type,
        CONCAT(p.first_name, ' ', p.last_name) as patient,
        a.scheduled_start,
        'calendar' as icon,
        '#9c27b0' as color
      FROM appointments a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      WHERE 1=1
    `;
    const appointmentsParams = [];

    if (facility_id) {
      appointmentsQuery += ' AND a.facility_id = ?';
      appointmentsParams.push(facility_id);
    }

    appointmentsQuery += ' ORDER BY a.scheduled_start DESC LIMIT ?';
    appointmentsParams.push(parseInt(limit));

    const [appointments] = await db.query(appointmentsQuery, appointmentsParams);

    // Get recent prescriptions
    let prescriptionsQuery = `
      SELECT 
        'Prescription' as type,
        CONCAT(p.first_name, ' ', p.last_name) as patient,
        pr.prescription_date as scheduled_start,
        'medication' as icon,
        '#ec407a' as color
      FROM prescriptions pr
      INNER JOIN patients p ON pr.patient_id = p.patient_id
      WHERE 1=1
    `;
    const prescriptionsParams = [];

    if (facility_id) {
      prescriptionsQuery += ' AND pr.facility_id = ?';
      prescriptionsParams.push(facility_id);
    }

    prescriptionsQuery += ' ORDER BY pr.prescription_date DESC LIMIT ?';
    prescriptionsParams.push(parseInt(limit));

    const [prescriptions] = await db.query(prescriptionsQuery, prescriptionsParams);

    // Combine and sort by date
    const allActivities = [
      ...appointments.map(apt => ({
        type: apt.type,
        patient: apt.patient,
        date: new Date(apt.scheduled_start).toLocaleDateString('en-US'),
        time: new Date(apt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: apt.icon,
        color: apt.color,
        timestamp: new Date(apt.scheduled_start).getTime(),
      })),
      ...prescriptions.map(pr => ({
        type: pr.type,
        patient: pr.patient,
        date: new Date(pr.scheduled_start).toLocaleDateString('en-US'),
        time: new Date(pr.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: pr.icon,
        color: pr.color,
        timestamp: new Date(pr.scheduled_start).getTime(),
      })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, parseInt(limit));

    res.json({ success: true, data: allActivities });
  } catch (err) {
    console.error('Fetch recent activity error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/reports/generate - Generate standard reports (follows Module 8 flow)
router.post('/generate', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    if (!['admin', 'physician'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { report_type, facility_id, date_from, date_to } = req.body;

    if (!report_type) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required field: report_type',
      });
    }

    // Standard report types
    const validReportTypes = ['patient', 'adherence', 'inventory', 'appointment'];
    if (!validReportTypes.includes(report_type)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid report_type. Must be one of: ${validReportTypes.join(', ')}`,
      });
    }

    // Check if report query exists for this standard report type
    const [existingQueries] = await connection.query(
      `SELECT report_id FROM report_queries 
       WHERE report_type = ? AND report_name = ?`,
      [report_type, `${report_type.charAt(0).toUpperCase() + report_type.slice(1)} Statistics Report`]
    );

    let report_id;
    if (existingQueries.length > 0) {
      report_id = existingQueries[0].report_id;
    } else {
      // Create report query for standard report
      report_id = uuidv4();
      const reportName = `${report_type.charAt(0).toUpperCase() + report_type.slice(1)} Statistics Report`;
      const reportDescription = `Standard ${report_type} statistics and analytics report`;

      await connection.query(
        `INSERT INTO report_queries (
          report_id, report_name, report_description, report_type,
          query_definition, parameters, owner_id, is_public, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          report_id,
          reportName,
          reportDescription,
          report_type,
          JSON.stringify({ type: report_type, standard: true }),
          JSON.stringify({ facility_id, date_from, date_to }),
          req.user.user_id,
        ]
      );
    }

    // Create report run record
    const run_id = uuidv4();
    const runParams = { facility_id, date_from, date_to };

    await connection.query(
      `INSERT INTO report_runs (
        run_id, report_id, started_at, status, parameters_used, run_by
      ) VALUES (?, ?, NOW(), 'running', ?, ?)`,
      [
        run_id,
        report_id,
        JSON.stringify(runParams),
        req.user.user_id,
      ]
    );

    // Execute report query based on type
    let reportData = {};
    const dateParams = [];
    let dateFilterClause = '';
    
    if (date_from || date_to) {
      const conditions = [];
      if (date_from) {
        conditions.push('DATE(created_at) >= ?');
        dateParams.push(date_from);
      }
      if (date_to) {
        conditions.push('DATE(created_at) <= ?');
        dateParams.push(date_to);
      }
      dateFilterClause = conditions.join(' AND ');
    }

    try {
      switch (report_type) {
        case 'patient':
          // Patient Statistics Report
          let patientQuery = `SELECT 
            COUNT(*) as total, 
            COUNT(CASE WHEN sex = 'M' OR sex = 'male' OR sex = 'Male' THEN 1 END) as male_count, 
            COUNT(CASE WHEN sex = 'F' OR sex = 'female' OR sex = 'Female' THEN 1 END) as female_count 
            FROM patients`;
          const patientParams = [];
          
          if (facility_id) {
            patientQuery += ' WHERE facility_id = ?';
            patientParams.push(facility_id);
          }
          
          const [patientStats] = await connection.query(patientQuery, patientParams);
          reportData = {
            total_patients: patientStats[0]?.total || 0,
            male_count: patientStats[0]?.male_count || 0,
            female_count: patientStats[0]?.female_count || 0,
          };
          break;

        case 'adherence':
          // Adherence Report
          let adherenceQuery = '';
          const adherenceParams = [];
          
          if (facility_id) {
            adherenceQuery = `
              SELECT 
                AVG(ma.adherence_percentage) as avg_adherence,
                COUNT(*) as total_records,
                COUNT(CASE WHEN ma.taken = 1 THEN 1 END) as taken_count,
                COUNT(CASE WHEN ma.taken = 0 THEN 1 END) as missed_count
              FROM medication_adherence ma
              INNER JOIN patients p ON ma.patient_id = p.patient_id
              WHERE p.facility_id = ?
            `;
            adherenceParams.push(facility_id);
            
            if (dateFilterClause) {
              adherenceQuery += ` AND ${dateFilterClause.replace('created_at', 'ma.recorded_at')}`;
              adherenceParams.push(...dateParams);
            }
          } else {
            adherenceQuery = `
              SELECT 
                AVG(adherence_percentage) as avg_adherence,
                COUNT(*) as total_records,
                COUNT(CASE WHEN taken = 1 THEN 1 END) as taken_count,
                COUNT(CASE WHEN taken = 0 THEN 1 END) as missed_count
              FROM medication_adherence
            `;
            
            if (dateFilterClause) {
              adherenceQuery += ` WHERE ${dateFilterClause.replace('created_at', 'recorded_at')}`;
              adherenceParams.push(...dateParams);
            }
          }
          
          const [adherenceStats] = await connection.query(adherenceQuery, adherenceParams);
          reportData = {
            avg_adherence: adherenceStats[0]?.avg_adherence ? parseFloat(adherenceStats[0].avg_adherence) : 0,
            total_records: adherenceStats[0]?.total_records || 0,
            taken_count: adherenceStats[0]?.taken_count || 0,
            missed_count: adherenceStats[0]?.missed_count || 0,
          };
          break;

        case 'inventory':
          // Inventory Report
          let inventoryQuery = `
            SELECT 
              COUNT(*) as total_items,
              COALESCE(SUM(quantity_on_hand), 0) as total_stock,
              COUNT(CASE WHEN quantity_on_hand <= reorder_level AND quantity_on_hand > 0 THEN 1 END) as low_stock_count,
              COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_count
            FROM medication_inventory
          `;
          const inventoryParams = [];
          
          if (facility_id) {
            inventoryQuery += ' WHERE facility_id = ?';
            inventoryParams.push(facility_id);
          }
          
          const [inventoryStats] = await connection.query(inventoryQuery, inventoryParams);
          reportData = {
            total_items: inventoryStats[0]?.total_items || 0,
            total_stock: inventoryStats[0]?.total_stock || 0,
            low_stock_count: inventoryStats[0]?.low_stock_count || 0,
            expiring_soon_count: inventoryStats[0]?.expiring_soon_count || 0,
          };
          break;

        case 'appointment':
          // Appointment Report
          let appointmentQuery = `
            SELECT 
              COUNT(*) as total_appointments,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
              COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
              COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
              COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_count
            FROM appointments
          `;
          const appointmentParams = [];
          const appointmentConditions = [];
          
          if (facility_id) {
            appointmentConditions.push('facility_id = ?');
            appointmentParams.push(facility_id);
          }
          
          if (dateFilterClause) {
            appointmentConditions.push(dateFilterClause.replace('created_at', 'scheduled_start'));
            appointmentParams.push(...dateParams);
          }
          
          if (appointmentConditions.length > 0) {
            appointmentQuery += ' WHERE ' + appointmentConditions.join(' AND ');
          }
          
          const [appointmentStats] = await connection.query(appointmentQuery, appointmentParams);
          reportData = {
            total_appointments: appointmentStats[0]?.total_appointments || 0,
            completed_count: appointmentStats[0]?.completed_count || 0,
            scheduled_count: appointmentStats[0]?.scheduled_count || 0,
            cancelled_count: appointmentStats[0]?.cancelled_count || 0,
            no_show_count: appointmentStats[0]?.no_show_count || 0,
          };
          break;
      }

      // Update report run with results
      await connection.query(
        `UPDATE report_runs 
         SET status = 'completed', 
             finished_at = NOW(),
             output_ref = ?
         WHERE run_id = ?`,
        [JSON.stringify(reportData), run_id]
      );

      await connection.commit();

      // Log audit
      const auditInfo = await getUserInfoForAudit(req.user.user_id);
      await logAudit({
        ...auditInfo,
        action: 'EXPORT',
        module: 'Reports',
        entity_type: 'report_run',
        entity_id: run_id,
        record_id: run_id,
        new_value: { run_id, report_id, report_type, reportData },
        change_summary: `Generated ${report_type} report`,
        ip_address: getClientIp(req),
        user_agent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: `${report_type.charAt(0).toUpperCase() + report_type.slice(1)} report generated successfully`,
        run: {
          run_id,
          report_id,
          status: 'completed',
          report_type,
          data: reportData,
        },
      });
    } catch (queryErr) {
      await connection.rollback();
      console.error('Report query execution error:', queryErr);
      
      // Update run status to failed
      await db.query(
        `UPDATE report_runs 
         SET status = 'failed', 
             finished_at = NOW(),
             error_message = ?
         WHERE run_id = ?`,
        [queryErr.message, run_id]
      );

      res.status(500).json({
        success: false,
        message: 'Error executing report query',
        error: queryErr.message,
      });
    }
  } catch (err) {
    await connection.rollback();
    console.error('Generate report error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

export default router;


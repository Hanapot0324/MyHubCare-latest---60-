import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/permissions - Get all permissions
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only admin can view all permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const [permissions] = await db.query(
      'SELECT * FROM permissions ORDER BY module, permission_name ASC'
    );

    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch permissions',
      error: error.message 
    });
  }
});

// GET /api/permissions/:id - Get permission by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id } = req.params;
    const [permissions] = await db.query(
      'SELECT * FROM permissions WHERE permission_id = ?',
      [id]
    );

    if (permissions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Permission not found' 
      });
    }

    res.json({ success: true, permission: permissions[0] });
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch permission',
      error: error.message 
    });
  }
});

// POST /api/permissions - Create new permission
router.post('/', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { permission_code, permission_name, module, action, description } = req.body;

    if (!permission_code || !permission_name || !module || !action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Permission code, name, module, and action are required' 
      });
    }

    await connection.beginTransaction();

    // Check if permission_code already exists
    const [existing] = await connection.query(
      'SELECT permission_id FROM permissions WHERE permission_code = ?',
      [permission_code]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: 'Permission code already exists' 
      });
    }

    const permission_id = uuidv4();

    await connection.query(
      `INSERT INTO permissions (permission_id, permission_code, permission_name, module, action, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [permission_id, permission_code, permission_name, module, action, description || null]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Permissions',
        entity_type: 'permission',
        entity_id: permission_id,
        record_id: permission_id,
        new_value: { permission_code, permission_name, module, action, description },
        change_summary: `Created new permission: ${permission_name} (${permission_code})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Permission created successfully',
      permission: { permission_id, permission_code, permission_name, module, action, description }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating permission:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Permissions',
        entity_type: 'permission',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to create permission',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// PUT /api/permissions/:id - Update permission
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id } = req.params;
    const { permission_code, permission_name, module, action, description } = req.body;

    await connection.beginTransaction();

    // Check if permission exists
    const [permissions] = await connection.query(
      'SELECT * FROM permissions WHERE permission_id = ?',
      [id]
    );

    if (permissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Permission not found' 
      });
    }

    const oldPermission = permissions[0];

    // Check if permission_code already exists (for different permission)
    if (permission_code && permission_code !== oldPermission.permission_code) {
      const [existing] = await connection.query(
        'SELECT permission_id FROM permissions WHERE permission_code = ? AND permission_id != ?',
        [permission_code, id]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          success: false, 
          message: 'Permission code already exists' 
        });
      }
    }

    await connection.query(
      `UPDATE permissions 
       SET permission_code = ?, permission_name = ?, module = ?, action = ?, description = ?
       WHERE permission_id = ?`,
      [
        permission_code || oldPermission.permission_code,
        permission_name || oldPermission.permission_name,
        module || oldPermission.module,
        action || oldPermission.action,
        description !== undefined ? description : oldPermission.description,
        id
      ]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Permissions',
        entity_type: 'permission',
        entity_id: id,
        record_id: id,
        old_value: oldPermission,
        new_value: { permission_code, permission_name, module, action, description },
        change_summary: `Updated permission: ${permission_name || oldPermission.permission_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Permission updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating permission:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Permissions',
        entity_type: 'permission',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to update permission',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/permissions/:id - Delete permission
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id } = req.params;

    await connection.beginTransaction();

    // Check if permission exists
    const [permissions] = await connection.query(
      'SELECT * FROM permissions WHERE permission_id = ?',
      [id]
    );

    if (permissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Permission not found' 
      });
    }

    const permission = permissions[0];

    // Check if permission is assigned to any roles
    const [rolePermissions] = await connection.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?',
      [id]
    );

    if (rolePermissions[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete permission that is assigned to roles. Please remove it from all roles first.' 
      });
    }

    await connection.query(
      'DELETE FROM permissions WHERE permission_id = ?',
      [id]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Permissions',
        entity_type: 'permission',
        entity_id: id,
        record_id: id,
        old_value: permission,
        change_summary: `Deleted permission: ${permission.permission_name} (${permission.permission_code})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting permission:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Permissions',
        entity_type: 'permission',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete permission',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

export default router;









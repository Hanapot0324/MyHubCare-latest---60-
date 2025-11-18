import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/roles - Get all roles
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only admin can view all roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const [roles] = await db.query(
      'SELECT * FROM roles ORDER BY role_name ASC'
    );

    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch roles',
      error: error.message 
    });
  }
});

// GET /api/roles/:id - Get role by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id } = req.params;
    const [roles] = await db.query(
      'SELECT * FROM roles WHERE role_id = ?',
      [id]
    );

    if (roles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Role not found' 
      });
    }

    res.json({ success: true, role: roles[0] });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch role',
      error: error.message 
    });
  }
});

// POST /api/roles - Create new role
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

    const { role_code, role_name, description, is_system_role } = req.body;

    if (!role_code || !role_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Role code and role name are required' 
      });
    }

    await connection.beginTransaction();

    // Check if role_code already exists
    const [existing] = await connection.query(
      'SELECT role_id FROM roles WHERE role_code = ?',
      [role_code]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: 'Role code already exists' 
      });
    }

    const role_id = uuidv4();

    await connection.query(
      `INSERT INTO roles (role_id, role_code, role_name, description, is_system_role, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [role_id, role_code, role_name, description || null, is_system_role || false]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Roles',
        entity_type: 'role',
        entity_id: role_id,
        record_id: role_id,
        new_value: { role_code, role_name, description, is_system_role },
        change_summary: `Created new role: ${role_name} (${role_code})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Role created successfully',
      role: { role_id, role_code, role_name, description, is_system_role }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating role:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Roles',
        entity_type: 'role',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to create role',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// PUT /api/roles/:id - Update role
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
    const { role_code, role_name, description, is_system_role } = req.body;

    await connection.beginTransaction();

    // Check if role exists
    const [roles] = await connection.query(
      'SELECT * FROM roles WHERE role_id = ?',
      [id]
    );

    if (roles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Role not found' 
      });
    }

    const oldRole = roles[0];

    // Prevent editing system roles
    if (oldRole.is_system_role && (role_code !== oldRole.role_code || is_system_role === false)) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot modify system role code or remove system role flag' 
      });
    }

    // Check if role_code already exists (for different role)
    if (role_code && role_code !== oldRole.role_code) {
      const [existing] = await connection.query(
        'SELECT role_id FROM roles WHERE role_code = ? AND role_id != ?',
        [role_code, id]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          success: false, 
          message: 'Role code already exists' 
        });
      }
    }

    await connection.query(
      `UPDATE roles 
       SET role_code = ?, role_name = ?, description = ?, is_system_role = ?
       WHERE role_id = ?`,
      [
        role_code || oldRole.role_code,
        role_name || oldRole.role_name,
        description !== undefined ? description : oldRole.description,
        is_system_role !== undefined ? is_system_role : oldRole.is_system_role,
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
        module: 'Roles',
        entity_type: 'role',
        entity_id: id,
        record_id: id,
        old_value: oldRole,
        new_value: { role_code, role_name, description, is_system_role },
        change_summary: `Updated role: ${role_name || oldRole.role_name}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Role updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating role:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'UPDATE',
        module: 'Roles',
        entity_type: 'role',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to update role',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/roles/:id - Delete role
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

    // Check if role exists
    const [roles] = await connection.query(
      'SELECT * FROM roles WHERE role_id = ?',
      [id]
    );

    if (roles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Role not found' 
      });
    }

    const role = roles[0];

    // Prevent deleting system roles
    if (role.is_system_role) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete system role' 
      });
    }

    // Check if role is assigned to any users
    const [userRoles] = await connection.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?',
      [id]
    );

    if (userRoles[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete role that is assigned to users' 
      });
    }

    await connection.query(
      'DELETE FROM roles WHERE role_id = ?',
      [id]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Roles',
        entity_type: 'role',
        entity_id: id,
        record_id: id,
        old_value: role,
        change_summary: `Deleted role: ${role.role_name} (${role.role_code})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Role deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting role:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Roles',
        entity_type: 'role',
        entity_id: req.params.id,
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete role',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// GET /api/roles/:id/permissions - Get permissions for a role
router.get('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id } = req.params;

    const [permissions] = await db.query(
      `SELECT p.* 
       FROM permissions p
       INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.module, p.permission_name`,
      [id]
    );

    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch role permissions',
      error: error.message 
    });
  }
});

// POST /api/roles/:id/permissions/:permissionId - Grant permission to role
router.post('/:id/permissions/:permissionId', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id, permissionId } = req.params;

    await connection.beginTransaction();

    // Check if role and permission exist
    const [roles] = await connection.query(
      'SELECT role_id, role_name FROM roles WHERE role_id = ?',
      [id]
    );

    if (roles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Role not found' 
      });
    }

    const [permissions] = await connection.query(
      'SELECT permission_id, permission_name FROM permissions WHERE permission_id = ?',
      [permissionId]
    );

    if (permissions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Permission not found' 
      });
    }

    // Check if already granted
    const [existing] = await connection.query(
      'SELECT role_permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [id, permissionId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: 'Permission already granted to this role' 
      });
    }

    const role_permission_id = uuidv4();

    await connection.query(
      'INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES (?, ?, ?, NOW())',
      [role_permission_id, id, permissionId]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Roles',
        entity_type: 'role_permission',
        entity_id: role_permission_id,
        record_id: role_permission_id,
        new_value: { role_id: id, permission_id: permissionId },
        change_summary: `Granted permission "${permissions[0].permission_name}" to role "${roles[0].role_name}"`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Permission granted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error granting permission:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'CREATE',
        module: 'Roles',
        entity_type: 'role_permission',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to grant permission',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/roles/:id/permissions/:permissionId - Revoke permission from role
router.delete('/:id/permissions/:permissionId', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let userInfo = null;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { id, permissionId } = req.params;

    await connection.beginTransaction();

    // Get role and permission info for audit
    const [roles] = await connection.query(
      'SELECT role_id, role_name FROM roles WHERE role_id = ?',
      [id]
    );

    const [permissions] = await connection.query(
      'SELECT permission_id, permission_name FROM permissions WHERE permission_id = ?',
      [permissionId]
    );

    // Check if permission is granted
    const [existing] = await connection.query(
      'SELECT role_permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [id, permissionId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Permission not granted to this role' 
      });
    }

    await connection.query(
      'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [id, permissionId]
    );

    userInfo = await getUserInfoForAudit(req.user.user_id);

    if (userInfo && roles.length > 0 && permissions.length > 0) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Roles',
        entity_type: 'role_permission',
        entity_id: existing[0].role_permission_id,
        record_id: existing[0].role_permission_id,
        old_value: { role_id: id, permission_id: permissionId },
        change_summary: `Revoked permission "${permissions[0].permission_name}" from role "${roles[0].role_name}"`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        status: 'success',
      });
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Permission revoked successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error revoking permission:', error);

    if (userInfo) {
      await logAudit({
        user_id: userInfo.user_id,
        user_name: userInfo.user_name,
        user_role: userInfo.user_role,
        action: 'DELETE',
        module: 'Roles',
        entity_type: 'role_permission',
        status: 'failed',
        error_message: error.message,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to revoke permission',
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

export default router;









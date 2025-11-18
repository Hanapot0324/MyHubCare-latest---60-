import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log an audit entry to the audit_log table
 * @param {Object} params - Audit log parameters
 * @param {string} params.user_id - User ID performing the action
 * @param {string} params.user_name - Name of the user
 * @param {string} params.user_role - Role of the user
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
 * @param {string} params.module - Module name (e.g., 'Authentication', 'Patients', 'Clinical Visits')
 * @param {string} [params.entity_type] - Type of entity (e.g., 'patient', 'clinical_visit')
 * @param {string} [params.entity_id] - ID of the entity
 * @param {string} [params.record_id] - Record ID (can be same as entity_id or different)
 * @param {Object} [params.old_value] - Old value (will be JSON stringified)
 * @param {Object} [params.new_value] - New value (will be JSON stringified)
 * @param {string} [params.change_summary] - Summary of changes
 * @param {string} [params.ip_address] - IP address of the user
 * @param {string} [params.user_agent] - User agent string
 * @param {string} [params.status] - Status (success, failed, error)
 * @param {string} [params.error_message] - Error message if status is failed/error
 * @param {string} [params.remarks] - Additional remarks
 */
export async function logAudit(params) {
  try {
    const {
      user_id,
      user_name,
      user_role,
      action,
      module,
      entity_type = null,
      entity_id = null,
      record_id = null,
      old_value = null,
      new_value = null,
      change_summary = null,
      ip_address = null,
      user_agent = null,
      status = 'success',
      error_message = null,
      remarks = null,
    } = params;

    // Validate required fields
    if (!user_id || !user_name || !user_role || !action || !module) {
      console.error('Audit log: Missing required fields', params);
      return;
    }

    // Stringify JSON values
    const oldValueJson = old_value ? JSON.stringify(old_value) : null;
    const newValueJson = new_value ? JSON.stringify(new_value) : null;

    await db.execute(
      `
      INSERT INTO audit_log (
        audit_id, user_id, user_name, user_role, action, module,
        entity_type, entity_id, record_id, old_value, new_value,
        change_summary, ip_address, user_agent, status, error_message,
        remarks, timestamp, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `,
      [
        uuidv4(),
        user_id,
        user_name,
        user_role,
        action,
        module,
        entity_type,
        entity_id,
        record_id,
        oldValueJson,
        newValueJson,
        change_summary,
        ip_address,
        user_agent,
        status,
        error_message,
        remarks,
      ]
    );
  } catch (error) {
    // Don't throw error - audit logging should not break the main flow
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Helper function to get user info for audit logging
 * @param {string} user_id - User ID
 * @returns {Promise<Object>} User info object
 */
export async function getUserInfoForAudit(user_id) {
  try {
    const [users] = await db.query(
      'SELECT user_id, full_name, role, username FROM users WHERE user_id = ?',
      [user_id]
    );
    if (users.length > 0) {
      return {
        user_id: users[0].user_id,
        user_name: users[0].full_name || users[0].username || 'Unknown',
        user_role: users[0].role || 'unknown',
      };
    }
    return {
      user_id: user_id,
      user_name: 'Unknown User',
      user_role: 'unknown',
    };
  } catch (error) {
    console.error('Error getting user info for audit:', error);
    return {
      user_id: user_id,
      user_name: 'Unknown User',
      user_role: 'unknown',
    };
  }
}

/**
 * Helper function to extract IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
export function getClientIp(req) {
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}
















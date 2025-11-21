import express from "express";
import bcrypt from 'bcryptjs';
import { db } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { logAudit, getClientIp } from "../utils/auditLogger.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  console.log('=== authenticateToken middleware ===');
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  console.log('Authorization header:', req.headers['authorization'] ? 'Present' : 'Missing');
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('=== AUTH ERROR: No token provided ===');
    console.error('Headers:', JSON.stringify(req.headers, null, 2));
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  console.log('Token found, verifying...');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('=== AUTH ERROR: Token verification failed ===');
      console.error('Error:', err.message);
      console.error('Error name:', err.name);
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    console.log('Token verified successfully. User ID:', user.user_id);
    req.user = user;
    next();
  });
};

// Generate UIC from patient data
// Format: Mother's first 2 letters + Father's first 2 letters + Birth order + DOB (MIFI0111-15-1990)
const generateUIC = (motherName, fatherName, birthOrder, birthDate) => {
  const date = new Date(birthDate);
  const motherLetters = (motherName ? motherName.substring(0, 2) : 'XX').toUpperCase();
  const fatherLetters = (fatherName ? fatherName.substring(0, 2) : 'XX').toUpperCase();
  const birthOrderStr = String(birthOrder || 1).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${motherLetters}${fatherLetters}${birthOrderStr}${month}-${day}-${year}`;
};

// POST /api/register - Patient registration
router.post("/register", async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      firstName, middleName, lastName, suffix,
      birthDate, sex, civilStatus, nationality,
      contactPhone, email, currentCity, currentProvince,
      philhealthNo, branch, username, password,
      motherName, fatherName, birthOrder
    } = req.body;

    // 1. Validate required fields (P2.1)
    if (!firstName || !lastName || !birthDate || !sex || 
        !motherName || !fatherName || birthOrder === undefined || birthOrder === null ||
        !branch) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: first_name, last_name, birth_date, sex, mother_name, father_name, birth_order, facility_id" 
      });
    }

    // 2. Check if username or email already exists
    const [existingUsers] = await connection.query(
      "SELECT user_id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: "Username or email already exists" 
      });
    }

    // 3. Generate UIC (P2.1)
    const uic = generateUIC(motherName, fatherName, birthOrder, birthDate);

    // 4. Check for duplicate UIC in patients table (D2) (P2.1)
    const [existingPatients] = await connection.query(
      "SELECT patient_id FROM patients WHERE uic = ?",
      [uic]
    );

    if (existingPatients.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: "Patient with this UIC already exists. Please check mother's name, father's name, birth order, and date of birth." 
      });
    }

    // 5. Validate facility_id exists
    const [facilities] = await connection.query(
      "SELECT facility_id FROM facilities WHERE facility_id = ? AND is_active = TRUE",
      [branch]
    );

    if (facilities.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Invalid facility/branch selected. Please select a valid branch." 
      });
    }

    const facility_id = facilities[0].facility_id;

    // 6. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 7. Create user account
    const user_id = uuidv4();
    const full_name = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`;

    await connection.query(
      `INSERT INTO users 
        (user_id, username, email, password_hash, full_name, role, status, facility_id, phone, created_at) 
       VALUES (?, ?, ?, ?, ?, 'patient', 'active', ?, ?, NOW())`,
      [user_id, username, email, password_hash, full_name, facility_id, contactPhone]
    );

    // 8. Create patient record
    const patient_id = uuidv4();
    const currentAddress = JSON.stringify({
      city: currentCity,
      province: currentProvince
    });

    await connection.query(
      `INSERT INTO patients 
        (patient_id, uic, philhealth_no, first_name, middle_name, last_name, suffix, 
         birth_date, sex, civil_status, nationality, current_city, current_province, 
         current_address, contact_phone, email, mother_name, father_name, birth_order,
         facility_id, status, created_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), ?)`,
      [
        patient_id, uic, philhealthNo || null, firstName, middleName || null, 
        lastName, suffix || null, birthDate, sex, civilStatus, nationality || 'Filipino',
        currentCity, currentProvince, currentAddress, contactPhone, email, 
        motherName, fatherName, birthOrder, facility_id, user_id
      ]
    );

    await connection.commit();

    // 9. Generate token
    const token = jwt.sign(
      { user_id, role: 'patient', patient_id }, 
      JWT_SECRET, 
      { expiresIn: "24h" }
    );

    // 10. Log audit entry for registration (P2.1 - Log to audit_log D8)
    await logAudit({
      user_id: user_id,
      user_name: full_name,
      user_role: 'patient',
      action: 'CREATE',
      module: 'Patients',
      entity_type: 'patient',
      entity_id: patient_id,
      record_id: patient_id,
      new_value: {
        patient_id,
        uic,
        first_name: firstName,
        last_name: lastName,
        email,
        facility_id,
      },
      change_summary: `New patient registered: ${full_name} (UIC: ${uic})`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        uic,
        username,
        token,
        user: {
          user_id,
          username,
          full_name,
          email,
          role: 'patient'
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Registration failed", 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// POST /api/login (ENHANCED)
router.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // 1. Find user
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND status = 'active'",
      [username]
    );

    if (rows.length === 0) {
      // Log failed login attempt
      await logAudit({
        user_id: 'unknown',
        user_name: 'Unknown',
        user_role: 'unknown',
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'user',
        entity_id: null,
        record_id: username,
        change_summary: `Failed login attempt: Invalid username - ${username}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Invalid username or password',
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }

    const user = rows[0];

    // 2. Check if role matches (if role is provided in login)
    if (role && user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. This account is registered as ${user.role}` 
      });
    }

    // 3. Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Increment failed login attempts
      await db.query(
        "UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE user_id = ?",
        [user.user_id]
      );
      
      // Log failed login attempt
      await logAudit({
        user_id: user.user_id,
        user_name: user.full_name || user.username,
        user_role: user.role,
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'user',
        entity_id: user.user_id,
        record_id: user.user_id,
        change_summary: `Failed login attempt: Invalid password for ${user.username}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Invalid password',
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }

    // 4. Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      // Log locked account attempt
      await logAudit({
        user_id: user.user_id,
        user_name: user.full_name || user.username,
        user_role: user.role,
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'user',
        entity_id: user.user_id,
        record_id: user.user_id,
        change_summary: `Login attempt blocked: Account locked for ${user.username}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Account is temporarily locked',
      });
      
      return res.status(423).json({ 
        success: false, 
        message: "Account is temporarily locked. Please try again later." 
      });
    }

    // 5. Check if MFA is enabled
    if (user.mfa_enabled === 1 || user.mfa_enabled === true) {
      // MFA is enabled - return response indicating MFA is required
      // The frontend should then call /api/mfa/generate to get the MFA code
      return res.status(200).json({
        success: true,
        requires_mfa: true,
        message: "MFA verification required",
        user_id: user.user_id,
        // Don't return token yet - wait for MFA verification
      });
    }

    // 6. Generate session token (only if MFA is not enabled)
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        role: user.role,
        facility_id: user.facility_id 
      }, 
      JWT_SECRET, 
      { expiresIn: "24h" }
    );

    // 7. Store session
    const session_id = uuidv4();
    const token_hash = await bcrypt.hash(token, 10);
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `INSERT INTO auth_sessions 
        (session_id, user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session_id,
        user.user_id,
        token_hash,
        expires_at,
        req.ip,
        req.headers["user-agent"] || 'unknown',
      ]
    );

    // 8. Update last_login and reset failed attempts
    await db.query(
      "UPDATE users SET last_login = NOW(), failed_login_attempts = 0 WHERE user_id = ?", 
      [user.user_id]
    );

    // 9. Get patient data if role is patient
    let patientData = null;
    if (user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT * FROM patients WHERE created_by = ?",
        [user.user_id]
      );
      patientData = patients[0] || null;
    }

    // 10. Log successful login
    await logAudit({
      user_id: user.user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'LOGIN',
      module: 'Authentication',
      entity_type: 'user',
      entity_id: user.user_id,
      record_id: user.user_id,
      change_summary: `Successful login: ${user.username}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        facility_id: user.facility_id,
        patient: patientData
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Get user info for audit log
    const [users] = await db.query(
      'SELECT user_id, full_name, role, username FROM users WHERE user_id = ?',
      [req.user.user_id]
    );
    const user = users[0] || { user_id: req.user.user_id, full_name: 'Unknown', role: 'unknown', username: 'unknown' };
    
    if (token) {
      // Revoke all active sessions for this user
      await db.query(
        "UPDATE auth_sessions SET is_active = FALSE, revoked_at = NOW() WHERE user_id = ?",
        [req.user.user_id]
      );
    }

    // Log logout
    await logAudit({
      user_id: user.user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'LOGOUT',
      module: 'Authentication',
      entity_type: 'user',
      entity_id: user.user_id,
      record_id: user.user_id,
      change_summary: `User logged out: ${user.username}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/me - Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT user_id, username, email, full_name, role, facility_id, phone, last_login FROM users WHERE user_id = ?",
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Get patient data for any user (not just patient role)
    // Try to find patient by created_by first
    let [patients] = await db.query(
      "SELECT * FROM patients WHERE created_by = ?",
      [user.user_id]
    );
    
    // If not found, try to find by email (in case patient was created by admin/staff)
    if (patients.length === 0 && user.email) {
      [patients] = await db.query(
        "SELECT * FROM patients WHERE email = ? AND status = 'active'",
        [user.email]
      );
    }
    
    // If still not found, try to find by matching name or email
    if (patients.length === 0) {
      // Last resort: find by matching username or full_name with patient name
      [patients] = await db.query(
        `SELECT * FROM patients 
         WHERE (CONCAT(first_name, ' ', last_name) LIKE ? OR email = ?)
         AND status = 'active'
         LIMIT 1`,
        [`%${user.full_name || user.username}%`, user.email || '']
      );
    }
    
    user.patient = patients[0] || null;
    
    // Log for debugging
    if (!user.patient) {
      console.log(`No patient found for user ${user.user_id} (${user.username}, role: ${user.role})`);
    }

    // Get facility data
    if (user.facility_id) {
      const [facilities] = await db.query(
        "SELECT facility_id, facility_name, facility_type, contact_number FROM facilities WHERE facility_id = ?",
        [user.facility_id]
      );
      user.facility = facilities[0] || null;
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/auth/complete-login - Complete login after MFA verification
router.post("/complete-login", async (req, res) => {
  try {
    const { user_id, mfa_token_id } = req.body;

    // Validate required fields
    if (!user_id || !mfa_token_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and mfa_token_id are required",
      });
    }

    // Verify that MFA token was consumed
    const [tokens] = await db.query(
      `SELECT mfa_token_id, user_id, consumed_at 
       FROM mfa_tokens 
       WHERE mfa_token_id = ? AND user_id = ? AND consumed_at IS NOT NULL`,
      [mfa_token_id, user_id]
    );

    if (tokens.length === 0) {
      return res.status(401).json({
        success: false,
        message: "MFA verification not completed or invalid",
      });
    }

    // Get user from database
    const [users] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND status = 'active'",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Generate session token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        role: user.role,
        facility_id: user.facility_id 
      }, 
      JWT_SECRET, 
      { expiresIn: "24h" }
    );

    // Store session
    const session_id = uuidv4();
    const token_hash = await bcrypt.hash(token, 10);
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `INSERT INTO auth_sessions 
        (session_id, user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session_id,
        user.user_id,
        token_hash,
        expires_at,
        req.ip,
        req.headers["user-agent"] || 'unknown',
      ]
    );

    // Update last_login and reset failed attempts
    await db.query(
      "UPDATE users SET last_login = NOW(), failed_login_attempts = 0 WHERE user_id = ?", 
      [user.user_id]
    );

    // Get patient data if role is patient
    let patientData = null;
    if (user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT * FROM patients WHERE created_by = ?",
        [user.user_id]
      );
      patientData = patients[0] || null;
    }

    // Log successful login with MFA
    await logAudit({
      user_id: user.user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'LOGIN',
      module: 'Authentication',
      entity_type: 'user',
      entity_id: user.user_id,
      record_id: user.user_id,
      change_summary: `Successful login with MFA: ${user.username}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: "Login successful with MFA",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        facility_id: user.facility_id,
        patient: patientData
      },
    });
  } catch (error) {
    console.error("Complete login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login completion",
      error: error.message,
    });
  }
});

// POST /api/auth/change-password - Change user password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Get user from database
    const [users] = await db.query(
      "SELECT user_id, password_hash, full_name, role, username FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      await logAudit({
        user_id: userId,
        user_name: user.full_name || user.username,
        user_role: user.role,
        action: "UPDATE",
        module: "Authentication",
        entity_type: "user",
        entity_id: userId,
        record_id: userId,
        change_summary: `Failed password change attempt: Invalid current password for ${user.username}`,
        ip_address: getClientIp(req),
        user_agent: req.headers["user-agent"] || "unknown",
        status: "failed",
        error_message: "Invalid current password",
      });

      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await db.query(
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?",
      [newPasswordHash, userId]
    );

    // Log successful password change
    await logAudit({
      user_id: userId,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: "UPDATE",
      module: "Authentication",
      entity_type: "user",
      entity_id: userId,
      record_id: userId,
      change_summary: `Password changed successfully for ${user.username}`,
      ip_address: getClientIp(req),
      user_agent: req.headers["user-agent"] || "unknown",
      status: "success",
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;

import express from "express";
import bcrypt from 'bcryptjs';
import { db } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { logAudit, getClientIp } from "../utils/auditLogger.js";
import crypto from "crypto";

const router = express.Router();

// Helper function to generate a random 6-digit code
const generateMFACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to hash MFA code
const hashMFACode = async (code) => {
  return await bcrypt.hash(code, 10);
};

// Helper function to verify MFA code
const verifyMFACode = async (code, codeHash) => {
  return await bcrypt.compare(code, codeHash);
};

// Helper function to clean up expired MFA tokens
const cleanupExpiredTokens = async (userId = null) => {
  try {
    if (userId) {
      await db.query(
        "DELETE FROM mfa_tokens WHERE user_id = ? AND expires_at < NOW()",
        [userId]
      );
    } else {
      await db.query(
        "DELETE FROM mfa_tokens WHERE expires_at < NOW()"
      );
    }
  } catch (error) {
    console.error("Error cleaning up expired MFA tokens:", error);
  }
};

// POST /api/mfa/setup - Setup MFA for a user
router.post("/setup", async (req, res) => {
  try {
    const { user_id, method, phone_number, email } = req.body;

    // Validate required fields
    if (!user_id || !method) {
      return res.status(400).json({
        success: false,
        message: "user_id and method are required",
      });
    }

    // Validate method
    if (!['totp', 'sms', 'email'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid MFA method. Must be 'totp', 'sms', or 'email'",
      });
    }

    // Validate phone_number for SMS method
    if (method === 'sms' && !phone_number) {
      return res.status(400).json({
        success: false,
        message: "phone_number is required for SMS method",
      });
    }

    // Validate email for email method
    if (method === 'email' && !email) {
      return res.status(400).json({
        success: false,
        message: "email is required for email method",
      });
    }

    // Get user from database
    const [users] = await db.query(
      "SELECT user_id, username, full_name, role, email, phone, mfa_enabled FROM users WHERE user_id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // For SMS, use provided phone_number or user's phone
    const phoneToUse = method === 'sms' ? (phone_number || user.phone) : null;
    
    // For email, use provided email or user's email
    const emailToUse = method === 'email' ? (email || user.email) : null;

    // Generate TOTP secret for TOTP method
    let secret = null;
    if (method === 'totp') {
      secret = crypto.randomBytes(32).toString('base64');
    }

    // Update user's MFA settings
    await db.query(
      "UPDATE users SET mfa_enabled = TRUE, updated_at = NOW() WHERE user_id = ?",
      [user_id]
    );

    // Log MFA setup
    await logAudit({
      user_id: user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'UPDATE',
      module: 'Authentication',
      entity_type: 'mfa',
      entity_id: user_id,
      record_id: user_id,
      change_summary: `MFA enabled with method: ${method}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: "MFA setup successful",
      data: {
        method,
        secret: method === 'totp' ? secret : undefined, // Return secret for TOTP setup
        phone_number: phoneToUse,
        email: emailToUse,
        mfa_enabled: true,
      },
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during MFA setup",
      error: error.message,
    });
  }
});

// POST /api/mfa/generate - Generate MFA token (called during login)
router.post("/generate", async (req, res) => {
  try {
    const { user_id, method } = req.body;

    // Validate required fields
    if (!user_id || !method) {
      return res.status(400).json({
        success: false,
        message: "user_id and method are required",
      });
    }

    // Validate method
    if (!['totp', 'sms', 'email'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid MFA method. Must be 'totp', 'sms', or 'email'",
      });
    }

    // Get user from database
    const [users] = await db.query(
      "SELECT user_id, username, full_name, role, email, phone, mfa_enabled FROM users WHERE user_id = ? AND mfa_enabled = TRUE",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or MFA not enabled",
      });
    }

    const user = users[0];

    // Clean up expired tokens for this user
    await cleanupExpiredTokens(user_id);

    // Generate MFA code based on method
    let code = null;
    let codeHash = null;
    let secret = null;
    let phone_number = null;
    let email = null;

    if (method === 'totp') {
      // For TOTP, generate a temporary code (in production, use proper TOTP library)
      code = generateMFACode();
      codeHash = await hashMFACode(code);
      // Get or generate TOTP secret (in production, store this securely per user)
      secret = crypto.randomBytes(32).toString('base64');
    } else if (method === 'sms') {
      code = generateMFACode();
      codeHash = await hashMFACode(code);
      phone_number = user.phone;
      
      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: "User phone number not found. Please update your profile.",
        });
      }

      // TODO: Send SMS via SMS service provider
      console.log(`[MFA SMS] Code for ${user.username}: ${code}`);
    } else if (method === 'email') {
      code = generateMFACode();
      codeHash = await hashMFACode(code);
      email = user.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "User email not found. Please update your profile.",
        });
      }

      // TODO: Send email via email service provider
      console.log(`[MFA Email] Code for ${user.username}: ${code}`);
    }

    // Create MFA token record
    const mfa_token_id = uuidv4();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

    await db.query(
      `INSERT INTO mfa_tokens 
        (mfa_token_id, user_id, method, secret, phone_number, code_hash, issued_at, expires_at, attempts) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 0)`,
      [mfa_token_id, user_id, method, secret, phone_number, codeHash, expires_at]
    );

    // Log MFA token generation
    await logAudit({
      user_id: user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'CREATE',
      module: 'Authentication',
      entity_type: 'mfa_token',
      entity_id: mfa_token_id,
      record_id: mfa_token_id,
      change_summary: `MFA token generated via ${method}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: `MFA code sent via ${method}`,
      data: {
        mfa_token_id,
        method,
        expires_at,
        // In development, return code for testing. Remove in production!
        code: process.env.NODE_ENV === 'development' ? code : undefined,
      },
    });
  } catch (error) {
    console.error("MFA generate error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during MFA code generation",
      error: error.message,
    });
  }
});

// POST /api/mfa/verify - Verify MFA token
router.post("/verify", async (req, res) => {
  try {
    const { mfa_token_id, code, user_id } = req.body;

    // Validate required fields
    if (!mfa_token_id || !code || !user_id) {
      return res.status(400).json({
        success: false,
        message: "mfa_token_id, code, and user_id are required",
      });
    }

    // Get MFA token from database
    const [tokens] = await db.query(
      `SELECT mfa_token_id, user_id, method, code_hash, expires_at, consumed_at, attempts 
       FROM mfa_tokens 
       WHERE mfa_token_id = ? AND user_id = ?`,
      [mfa_token_id, user_id]
    );

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "MFA token not found or invalid",
      });
    }

    const token = tokens[0];

    // Check if token is expired
    if (new Date(token.expires_at) < new Date()) {
      await logAudit({
        user_id: user_id,
        user_name: 'Unknown',
        user_role: 'unknown',
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'mfa_token',
        entity_id: mfa_token_id,
        record_id: mfa_token_id,
        change_summary: `MFA verification failed: Token expired`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'MFA token expired',
      });

      return res.status(400).json({
        success: false,
        message: "MFA token has expired. Please request a new code.",
      });
    }

    // Check if token is already consumed
    if (token.consumed_at) {
      return res.status(400).json({
        success: false,
        message: "MFA token has already been used",
      });
    }

    // Check attempts limit (max 5 attempts)
    if (token.attempts >= 5) {
      await logAudit({
        user_id: user_id,
        user_name: 'Unknown',
        user_role: 'unknown',
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'mfa_token',
        entity_id: mfa_token_id,
        record_id: mfa_token_id,
        change_summary: `MFA verification failed: Too many attempts`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Too many verification attempts',
      });

      return res.status(400).json({
        success: false,
        message: "Too many verification attempts. Please request a new code.",
      });
    }

    // Verify code
    const isValid = await verifyMFACode(code, token.code_hash);

    if (!isValid) {
      // Increment attempts
      await db.query(
        "UPDATE mfa_tokens SET attempts = attempts + 1 WHERE mfa_token_id = ?",
        [mfa_token_id]
      );

      // Get user info for audit log
      const [users] = await db.query(
        "SELECT username, full_name, role FROM users WHERE user_id = ?",
        [user_id]
      );
      const user = users[0] || { username: 'Unknown', full_name: 'Unknown', role: 'unknown' };

      await logAudit({
        user_id: user_id,
        user_name: user.full_name || user.username,
        user_role: user.role,
        action: 'LOGIN',
        module: 'Authentication',
        entity_type: 'mfa_token',
        entity_id: mfa_token_id,
        record_id: mfa_token_id,
        change_summary: `MFA verification failed: Invalid code (attempt ${token.attempts + 1})`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Invalid MFA code',
      });

      return res.status(401).json({
        success: false,
        message: "Invalid MFA code",
        attempts_remaining: 5 - (token.attempts + 1),
      });
    }

    // Mark token as consumed
    await db.query(
      "UPDATE mfa_tokens SET consumed_at = NOW() WHERE mfa_token_id = ?",
      [mfa_token_id]
    );

    // Get user info for audit log
    const [users] = await db.query(
      "SELECT username, full_name, role FROM users WHERE user_id = ?",
      [user_id]
    );
    const user = users[0] || { username: 'Unknown', full_name: 'Unknown', role: 'unknown' };

    // Log successful MFA verification
    await logAudit({
      user_id: user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'LOGIN',
      module: 'Authentication',
      entity_type: 'mfa_token',
      entity_id: mfa_token_id,
      record_id: mfa_token_id,
      change_summary: `MFA verification successful via ${token.method}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: "MFA verification successful",
      data: {
        mfa_token_id,
        verified: true,
      },
    });
  } catch (error) {
    console.error("MFA verify error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during MFA verification",
      error: error.message,
    });
  }
});

// POST /api/mfa/disable - Disable MFA for a user
router.post("/disable", async (req, res) => {
  try {
    const { user_id, password } = req.body;

    // Validate required fields
    if (!user_id || !password) {
      return res.status(400).json({
        success: false,
        message: "user_id and password are required",
      });
    }

    // Get user from database
    const [users] = await db.query(
      "SELECT user_id, username, full_name, role, password_hash, mfa_enabled FROM users WHERE user_id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logAudit({
        user_id: user_id,
        user_name: user.full_name || user.username,
        user_role: user.role,
        action: 'UPDATE',
        module: 'Authentication',
        entity_type: 'mfa',
        entity_id: user_id,
        record_id: user_id,
        change_summary: `MFA disable failed: Invalid password`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'failed',
        error_message: 'Invalid password',
      });

      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Disable MFA
    await db.query(
      "UPDATE users SET mfa_enabled = FALSE, updated_at = NOW() WHERE user_id = ?",
      [user_id]
    );

    // Delete all MFA tokens for this user
    await db.query(
      "DELETE FROM mfa_tokens WHERE user_id = ?",
      [user_id]
    );

    // Log MFA disable
    await logAudit({
      user_id: user_id,
      user_name: user.full_name || user.username,
      user_role: user.role,
      action: 'UPDATE',
      module: 'Authentication',
      entity_type: 'mfa',
      entity_id: user_id,
      record_id: user_id,
      change_summary: `MFA disabled for user`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: "MFA disabled successfully",
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during MFA disable",
      error: error.message,
    });
  }
});

// GET /api/mfa/status - Get MFA status for a user
router.get("/status/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get user MFA status
    const [users] = await db.query(
      "SELECT user_id, username, full_name, role, mfa_enabled, email, phone FROM users WHERE user_id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Get active MFA tokens count
    const [activeTokens] = await db.query(
      "SELECT COUNT(*) as count FROM mfa_tokens WHERE user_id = ? AND expires_at > NOW() AND consumed_at IS NULL",
      [user_id]
    );

    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        mfa_enabled: user.mfa_enabled === 1 || user.mfa_enabled === true,
        email: user.email,
        phone: user.phone,
        active_tokens: activeTokens[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("MFA status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving MFA status",
      error: error.message,
    });
  }
});

export default router;


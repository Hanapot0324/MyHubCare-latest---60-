import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/patient-documents';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|rtf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// GET /api/patient-documents - Get all patient documents (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check permissions - staff and patients can view documents
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { patient_id, document_type, search } = req.query;

    let query = `
      SELECT 
        pd.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.uic AS patient_uic,
        CONCAT(u.full_name) AS uploaded_by_name,
        u.username AS uploaded_by_username
      FROM patient_documents pd
      LEFT JOIN patients p ON pd.patient_id = p.patient_id
      LEFT JOIN users u ON pd.uploaded_by = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // If patient role, only show their own documents
    if (req.user.role === 'patient') {
      // Get patient_id from user
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)",
        [req.user.user_id, req.user.user_id]
      );
      
      if (patients.length === 0) {
        return res.json({ success: true, data: [] });
      }
      
      query += ' AND pd.patient_id = ?';
      params.push(patients[0].patient_id);
    } else if (patient_id) {
      // Staff can filter by patient_id
      query += ' AND pd.patient_id = ?';
      params.push(patient_id);
    }

    if (document_type) {
      query += ' AND pd.document_type = ?';
      params.push(document_type);
    }

    if (search) {
      query += ` AND (
        pd.file_name LIKE ? OR
        CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
        p.uic LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY pd.uploaded_at DESC';

    const [documents] = await db.query(query, params);

    // Format the response
    const formattedDocuments = documents.map(doc => ({
      document_id: doc.document_id,
      patient_id: doc.patient_id,
      patient_name: doc.patient_name || 'Unknown Patient',
      patient_uic: doc.patient_uic,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_size: doc.file_size,
      file_size_formatted: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
      mime_type: doc.mime_type,
      uploaded_at: doc.uploaded_at,
      uploaded_at_formatted: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '',
      uploaded_by: doc.uploaded_by,
      uploaded_by_name: doc.uploaded_by_name || 'Unknown',
      uploaded_by_username: doc.uploaded_by_username || 'Unknown'
    }));

    res.json({ success: true, data: formattedDocuments });
  } catch (err) {
    console.error('Fetch patient documents error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// GET /api/patient-documents/patient/:patient_id - Get documents for a specific patient
router.get('/patient/:patient_id', authenticateToken, async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { document_type } = req.query;

    // Check permissions
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // If patient role, verify they can only access their own documents
    if (req.user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, patient_id]
      );
      
      if (patients.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own documents.',
        });
      }
    }

    // Verify patient exists
    const [patientCheck] = await db.query(
      'SELECT patient_id, CONCAT(first_name, " ", last_name) AS patient_name, uic FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    let query = `
      SELECT 
        pd.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.uic AS patient_uic,
        CONCAT(u.full_name) AS uploaded_by_name,
        u.username AS uploaded_by_username
      FROM patient_documents pd
      LEFT JOIN patients p ON pd.patient_id = p.patient_id
      LEFT JOIN users u ON pd.uploaded_by = u.user_id
      WHERE pd.patient_id = ?
    `;

    const params = [patient_id];

    if (document_type) {
      query += ' AND pd.document_type = ?';
      params.push(document_type);
    }

    query += ' ORDER BY pd.uploaded_at DESC';

    const [documents] = await db.query(query, params);

    const formattedDocuments = documents.map(doc => ({
      document_id: doc.document_id,
      patient_id: doc.patient_id,
      patient_name: doc.patient_name || 'Unknown Patient',
      patient_uic: doc.patient_uic,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_size: doc.file_size,
      file_size_formatted: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
      mime_type: doc.mime_type,
      uploaded_at: doc.uploaded_at,
      uploaded_at_formatted: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '',
      uploaded_by: doc.uploaded_by,
      uploaded_by_name: doc.uploaded_by_name || 'Unknown',
      uploaded_by_username: doc.uploaded_by_username || 'Unknown'
    }));

    res.json({ 
      success: true, 
      data: formattedDocuments,
      patient: {
        patient_id: patientCheck[0].patient_id,
        patient_name: patientCheck[0].patient_name,
        uic: patientCheck[0].uic
      }
    });
  } catch (err) {
    console.error('Fetch patient documents error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// GET /api/patient-documents/:id - Get single document
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [documents] = await db.query(
      `
      SELECT 
        pd.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.uic AS patient_uic,
        CONCAT(u.full_name) AS uploaded_by_name,
        u.username AS uploaded_by_username
      FROM patient_documents pd
      LEFT JOIN patients p ON pd.patient_id = p.patient_id
      LEFT JOIN users u ON pd.uploaded_by = u.user_id
      WHERE pd.document_id = ?
      `,
      [id]
    );

    if (documents.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document not found' 
      });
    }

    const doc = documents[0];

    // Check permissions - patients can only view their own documents
    if (req.user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, doc.patient_id]
      );
      
      if (patients.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own documents.',
        });
      }
    }

    const formattedDocument = {
      document_id: doc.document_id,
      patient_id: doc.patient_id,
      patient_name: doc.patient_name || 'Unknown Patient',
      patient_uic: doc.patient_uic,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_size: doc.file_size,
      file_size_formatted: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
      mime_type: doc.mime_type,
      uploaded_at: doc.uploaded_at,
      uploaded_at_formatted: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '',
      uploaded_by: doc.uploaded_by,
      uploaded_by_name: doc.uploaded_by_name || 'Unknown',
      uploaded_by_username: doc.uploaded_by_username || 'Unknown'
    };

    res.json({ success: true, data: formattedDocument });
  } catch (err) {
    console.error('Fetch patient document error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// GET /api/patient-documents/:id/download - Download document file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [documents] = await db.query(
      'SELECT file_path, file_name, mime_type, patient_id FROM patient_documents WHERE document_id = ?',
      [id]
    );

    if (documents.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document not found' 
      });
    }

    const doc = documents[0];

    // Check permissions - patients can only download their own documents
    if (req.user.role === 'patient') {
      const [patients] = await db.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, doc.patient_id]
      );
      
      if (patients.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only download your own documents.',
        });
      }
    }

    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found on server' 
      });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(doc.file_path);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error reading file' });
      }
    });
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download patient document error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// POST /api/patient-documents - Upload new patient document
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - staff can upload, patients can upload their own
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!req.file) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { patient_id, document_type } = req.body;

    // Validate required fields
    if (!patient_id || !document_type) {
      // Delete uploaded file if validation fails
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fsError) {
          console.error('Error deleting file:', fsError);
        }
      }
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id and document_type',
      });
    }

    // Validate document_type
    const validTypes = ['consent', 'id_copy', 'medical_record', 'lab_result', 'other'];
    if (!validTypes.includes(document_type)) {
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fsError) {
          console.error('Error deleting file:', fsError);
        }
      }
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid document_type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Verify patient exists
    const [patients] = await connection.query(
      'SELECT patient_id, CONCAT(first_name, " ", last_name) AS patient_name, uic FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patients.length === 0) {
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fsError) {
          console.error('Error deleting file:', fsError);
        }
      }
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // If patient role, verify they can only upload to their own record
    if (req.user.role === 'patient') {
      const [patientCheck] = await connection.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, patient_id]
      );
      
      if (patientCheck.length === 0) {
        if (req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fsError) {
            console.error('Error deleting file:', fsError);
          }
        }
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only upload documents to your own record.',
        });
      }
    }

    // Generate document_id
    const document_id = uuidv4();

    // Use current user as uploader
    const uploaded_by = req.user.user_id;

    // Insert patient document
    await connection.query(
      `INSERT INTO patient_documents (
        document_id, patient_id, document_type, file_name, file_path,
        file_size, mime_type, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        document_id,
        patient_id,
        document_type,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        uploaded_by
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
      module: 'Patient Documents',
      entity_type: 'patient_document',
      entity_id: document_id,
      record_id: document_id,
      new_value: {
        document_id,
        patient_id,
        document_type,
        file_name: req.file.originalname,
        file_size: req.file.size
      },
      change_summary: `Uploaded patient document: ${req.file.originalname} (${document_type}) for patient ${patients[0].uic}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Fetch the created document
    const [newDoc] = await connection.query(
      `
      SELECT 
        pd.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.uic AS patient_uic,
        CONCAT(u.full_name) AS uploaded_by_name,
        u.username AS uploaded_by_username
      FROM patient_documents pd
      LEFT JOIN patients p ON pd.patient_id = p.patient_id
      LEFT JOIN users u ON pd.uploaded_by = u.user_id
      WHERE pd.document_id = ?
      `,
      [document_id]
    );

    const doc = newDoc[0];
    const formattedDocument = {
      document_id: doc.document_id,
      patient_id: doc.patient_id,
      patient_name: doc.patient_name || 'Unknown Patient',
      patient_uic: doc.patient_uic,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_size: doc.file_size,
      file_size_formatted: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
      mime_type: doc.mime_type,
      uploaded_at: doc.uploaded_at,
      uploaded_at_formatted: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '',
      uploaded_by: doc.uploaded_by,
      uploaded_by_name: doc.uploaded_by_name || 'Unknown',
      uploaded_by_username: doc.uploaded_by_username || 'Unknown'
    };

    res.status(201).json({
      success: true,
      message: 'Patient document uploaded successfully',
      data: formattedDocument
    });
  } catch (err) {
    await connection.rollback();
    // Delete uploaded file if error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (fsError) {
        console.error('Error deleting file:', fsError);
      }
    }
    console.error('Upload patient document error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/patient-documents/:id - Delete patient document
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - staff can delete, patients can delete their own
    if (!['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const document_id = req.params.id;

    // Get document for audit log and file path
    const [documents] = await connection.query(
      `
      SELECT pd.*, p.uic AS patient_uic 
      FROM patient_documents pd
      LEFT JOIN patients p ON pd.patient_id = p.patient_id
      WHERE pd.document_id = ?
      `,
      [document_id]
    );

    if (documents.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const doc = documents[0];

    // If patient role, verify they can only delete their own documents
    if (req.user.role === 'patient') {
      const [patientCheck] = await connection.query(
        "SELECT patient_id FROM patients WHERE (created_by = ? OR email = (SELECT email FROM users WHERE user_id = ?)) AND patient_id = ?",
        [req.user.user_id, req.user.user_id, doc.patient_id]
      );
      
      if (patientCheck.length === 0) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own documents.',
        });
      }
    }

    // Delete the file from filesystem
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (fsError) {
        console.error('Error deleting file from filesystem:', fsError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the record from database
    await connection.query(
      'DELETE FROM patient_documents WHERE document_id = ?',
      [document_id]
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
      module: 'Patient Documents',
      entity_type: 'patient_document',
      entity_id: document_id,
      record_id: document_id,
      old_value: doc,
      change_summary: `Deleted patient document: ${doc.file_name} (${doc.document_type}) for patient ${doc.patient_uic || doc.patient_id}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Patient document deleted successfully',
    });
  } catch (err) {
    await connection.rollback();
    console.error('Delete patient document error:', err);
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


import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { logAudit, getUserInfoForAudit, getClientIp } from '../utils/auditLogger.js';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/lab-files';
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
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// GET /api/lab-files - Get all lab files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { result_id, search } = req.query;

    let query = `
      SELECT 
        lf.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        lr.test_name,
        CONCAT(u.full_name) AS uploaded_by_name
      FROM lab_files lf
      LEFT JOIN lab_results lr ON lf.result_id = lr.result_id
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u ON lf.uploaded_by = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (result_id) {
      query += ' AND lf.result_id = ?';
      params.push(result_id);
    }

    if (search) {
      query += ` AND (
        lf.file_name LIKE ? OR
        CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
        lr.test_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY lf.uploaded_at DESC';

    const [files] = await db.query(query, params);

    // Format the response to match frontend expectations
    const formattedFiles = files.map(file => ({
      id: file.file_id,
      file_id: file.file_id,
      resultId: file.result_id,
      result_id: file.result_id,
      fileName: file.file_name,
      file_name: file.file_name,
      file_path: file.file_path,
      fileSize: file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : '0 KB',
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploadedAt: file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : '',
      uploaded_at: file.uploaded_at,
      uploadedBy: file.uploaded_by_name || 'Unknown',
      uploaded_by: file.uploaded_by,
      patient: file.patient_name || 'Unknown Patient',
      testName: file.test_name || 'Unknown Test'
    }));

    res.json({ success: true, data: formattedFiles });
  } catch (err) {
    console.error('Fetch lab files error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-files/result/:result_id - Get files for a specific result
router.get('/result/:result_id', authenticateToken, async (req, res) => {
  try {
    const [files] = await db.query(
      `
      SELECT 
        lf.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        lr.test_name,
        CONCAT(u.full_name) AS uploaded_by_name
      FROM lab_files lf
      LEFT JOIN lab_results lr ON lf.result_id = lr.result_id
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u ON lf.uploaded_by = u.user_id
      WHERE lf.result_id = ?
      ORDER BY lf.uploaded_at DESC
      `,
      [req.params.result_id]
    );

    const formattedFiles = files.map(file => ({
      id: file.file_id,
      file_id: file.file_id,
      resultId: file.result_id,
      result_id: file.result_id,
      fileName: file.file_name,
      file_name: file.file_name,
      file_path: file.file_path,
      fileSize: file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : '0 KB',
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploadedAt: file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : '',
      uploaded_at: file.uploaded_at,
      uploadedBy: file.uploaded_by_name || 'Unknown',
      uploaded_by: file.uploaded_by,
      patient: file.patient_name || 'Unknown Patient',
      testName: file.test_name || 'Unknown Test'
    }));

    res.json({ success: true, data: formattedFiles });
  } catch (err) {
    console.error('Fetch result lab files error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/lab-files - Upload new lab file
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - lab personnel, physicians, and admins can upload files
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and lab personnel can upload lab files.',
      });
    }

    if (!req.file) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { result_id } = req.body;

    // Validate required fields
    if (!result_id) {
      // Delete uploaded file if validation fails
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required field: result_id',
      });
    }

    // Validate result exists
    const [results] = await connection.query(
      'SELECT result_id FROM lab_results WHERE result_id = ?',
      [result_id]
    );

    if (results.length === 0) {
      // Delete uploaded file if validation fails
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid lab result selected',
      });
    }

    // Generate file_id
    const file_id = crypto.randomUUID();

    // Use current user as uploader
    const uploaded_by = req.user.user_id;

    // Insert lab file
    await connection.query(
      `INSERT INTO lab_files (
        file_id, result_id, file_name, file_path,
        file_size, mime_type, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        file_id,
        result_id,
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
      module: 'Lab Files',
      entity_type: 'lab_file',
      entity_id: file_id,
      record_id: file_id,
      new_value: {
        file_id,
        result_id,
        file_name: req.file.originalname,
        file_size: req.file.size
      },
      change_summary: `Uploaded lab file: ${req.file.originalname} for result ${result_id}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    // Fetch the created file
    const [newFile] = await connection.query(
      `
      SELECT 
        lf.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        lr.test_name,
        CONCAT(u.full_name) AS uploaded_by_name
      FROM lab_files lf
      LEFT JOIN lab_results lr ON lf.result_id = lr.result_id
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u ON lf.uploaded_by = u.user_id
      WHERE lf.file_id = ?
      `,
      [file_id]
    );

    const file = newFile[0];
    const formattedFile = {
      id: file.file_id,
      file_id: file.file_id,
      resultId: file.result_id,
      result_id: file.result_id,
      fileName: file.file_name,
      file_name: file.file_name,
      file_path: file.file_path,
      fileSize: file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : '0 KB',
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploadedAt: file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : '',
      uploaded_at: file.uploaded_at,
      uploadedBy: file.uploaded_by_name || 'Unknown',
      uploaded_by: file.uploaded_by,
      patient: file.patient_name || 'Unknown Patient',
      testName: file.test_name || 'Unknown Test'
    };

    res.status(201).json({
      success: true,
      message: 'Lab file uploaded successfully',
      data: formattedFile
    });
  } catch (err) {
    await connection.rollback();
    // Delete uploaded file if error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload lab file error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/lab-files/:id/download - Download lab file (must come before /:id route)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const [files] = await db.query(
      'SELECT file_path, file_name, mime_type FROM lab_files WHERE file_id = ?',
      [req.params.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab file not found' });
    }

    const file = files[0];

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error reading file' });
      }
    });
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download lab file error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/lab-files/:id - Get single lab file (must come after /download route)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [files] = await db.query(
      `
      SELECT 
        lf.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        lr.test_name,
        CONCAT(u.full_name) AS uploaded_by_name
      FROM lab_files lf
      LEFT JOIN lab_results lr ON lf.result_id = lr.result_id
      LEFT JOIN patients p ON lr.patient_id = p.patient_id
      LEFT JOIN users u ON lf.uploaded_by = u.user_id
      WHERE lf.file_id = ?
      `,
      [req.params.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'Lab file not found' });
    }

    const file = files[0];
    const formattedFile = {
      id: file.file_id,
      file_id: file.file_id,
      resultId: file.result_id,
      result_id: file.result_id,
      fileName: file.file_name,
      file_name: file.file_name,
      file_path: file.file_path,
      fileSize: file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : '0 KB',
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploadedAt: file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : '',
      uploaded_at: file.uploaded_at,
      uploadedBy: file.uploaded_by_name || 'Unknown',
      uploaded_by: file.uploaded_by,
      patient: file.patient_name || 'Unknown Patient',
      testName: file.test_name || 'Unknown Test'
    };

    res.json({ success: true, data: formattedFile });
  } catch (err) {
    console.error('Fetch lab file error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// DELETE /api/lab-files/:id - Delete lab file
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check permissions - only admins, physicians, and lab personnel can delete
    if (!['admin', 'physician', 'lab_personnel'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, physicians, and lab personnel can delete lab files.',
      });
    }

    const file_id = req.params.id;

    // Get file for audit log and file path
    const [files] = await connection.query(
      'SELECT * FROM lab_files WHERE file_id = ?',
      [file_id]
    );

    if (files.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lab file not found',
      });
    }

    const file = files[0];

    // Delete the file from filesystem
    if (file.file_path && fs.existsSync(file.file_path)) {
      try {
        fs.unlinkSync(file.file_path);
      } catch (fsError) {
        console.error('Error deleting file from filesystem:', fsError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the record from database
    await connection.query(
      'DELETE FROM lab_files WHERE file_id = ?',
      [file_id]
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
      module: 'Lab Files',
      entity_type: 'lab_file',
      entity_id: file_id,
      record_id: file_id,
      old_value: file,
      change_summary: `Deleted lab file: ${file.file_name}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Lab file deleted successfully',
    });
  } catch (err) {
    await connection.rollback();
    console.error('Delete lab file error:', err);
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


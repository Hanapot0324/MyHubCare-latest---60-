# Patient Documents Implementation - Module 2

## Overview
This document describes the Patient Documents implementation for Module 2 (Patient Management) of the MyHubCares system.

## Database Structure

The `patient_documents` table structure:
- `document_id` (UUID, PRIMARY KEY)
- `patient_id` (UUID, FOREIGN KEY → patients)
- `document_type` (ENUM: 'consent', 'id_copy', 'medical_record', 'lab_result', 'other')
- `file_name` (VARCHAR(255)) - Original filename
- `file_path` (VARCHAR(500)) - Storage path on server
- `file_size` (BIGINT) - File size in bytes
- `mime_type` (VARCHAR(100)) - MIME type
- `uploaded_at` (DATETIME) - Upload timestamp
- `uploaded_by` (UUID, FOREIGN KEY → users) - User who uploaded

## API Endpoints

### 1. Get All Patient Documents
**GET** `/api/patient-documents`

Get all patient documents with optional filters.

**Query Parameters:**
- `patient_id` (optional) - Filter by patient ID
- `document_type` (optional) - Filter by document type (consent, id_copy, medical_record, lab_result, other)
- `search` (optional) - Search by file name, patient name, or UIC

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "document_id": "uuid",
      "patient_id": "uuid",
      "patient_name": "John Doe",
      "patient_uic": "MIFI0111-15-1990",
      "document_type": "consent",
      "file_name": "consent_form.pdf",
      "file_path": "uploads/patient-documents/1234567890-123456789.pdf",
      "file_size": 102400,
      "file_size_formatted": "100.00 KB",
      "mime_type": "application/pdf",
      "uploaded_at": "2025-01-01T12:00:00Z",
      "uploaded_at_formatted": "1/1/2025, 12:00:00 PM",
      "uploaded_by": "uuid",
      "uploaded_by_name": "Dr. Jane Smith",
      "uploaded_by_username": "jane.smith"
    }
  ]
}
```

**Permissions:**
- All authenticated users (admin, physician, nurse, case_manager, lab_personnel, patient)
- Patients can only see their own documents

### 2. Get Documents for Specific Patient
**GET** `/api/patient-documents/patient/:patient_id`

Get all documents for a specific patient.

**Query Parameters:**
- `document_type` (optional) - Filter by document type

**Response:**
```json
{
  "success": true,
  "data": [...],
  "patient": {
    "patient_id": "uuid",
    "patient_name": "John Doe",
    "uic": "MIFI0111-15-1990"
  }
}
```

**Permissions:**
- All authenticated users
- Patients can only access their own documents

### 3. Get Single Document
**GET** `/api/patient-documents/:id`

Get details of a specific document.

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "patient_id": "uuid",
    "patient_name": "John Doe",
    "patient_uic": "MIFI0111-15-1990",
    "document_type": "consent",
    "file_name": "consent_form.pdf",
    "file_path": "uploads/patient-documents/1234567890-123456789.pdf",
    "file_size": 102400,
    "file_size_formatted": "100.00 KB",
    "mime_type": "application/pdf",
    "uploaded_at": "2025-01-01T12:00:00Z",
    "uploaded_at_formatted": "1/1/2025, 12:00:00 PM",
    "uploaded_by": "uuid",
    "uploaded_by_name": "Dr. Jane Smith",
    "uploaded_by_username": "jane.smith"
  }
}
```

**Permissions:**
- All authenticated users
- Patients can only access their own documents

### 4. Download Document
**GET** `/api/patient-documents/:id/download`

Download the actual file.

**Response:**
- File stream with appropriate headers
- Content-Disposition: attachment
- Content-Type: based on mime_type

**Permissions:**
- All authenticated users
- Patients can only download their own documents

### 5. Upload Document
**POST** `/api/patient-documents`

Upload a new patient document.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file` (required) - The file to upload
  - `patient_id` (required) - Patient ID
  - `document_type` (required) - One of: consent, id_copy, medical_record, lab_result, other

**File Restrictions:**
- Max file size: 10MB
- Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, rtf

**Response:**
```json
{
  "success": true,
  "message": "Patient document uploaded successfully",
  "data": {
    "document_id": "uuid",
    "patient_id": "uuid",
    "patient_name": "John Doe",
    "patient_uic": "MIFI0111-15-1990",
    "document_type": "consent",
    "file_name": "consent_form.pdf",
    "file_path": "uploads/patient-documents/1234567890-123456789.pdf",
    "file_size": 102400,
    "file_size_formatted": "100.00 KB",
    "mime_type": "application/pdf",
    "uploaded_at": "2025-01-01T12:00:00Z",
    "uploaded_at_formatted": "1/1/2025, 12:00:00 PM",
    "uploaded_by": "uuid",
    "uploaded_by_name": "Dr. Jane Smith",
    "uploaded_by_username": "jane.smith"
  }
}
```

**Permissions:**
- All authenticated users can upload
- Patients can only upload to their own record

### 6. Delete Document
**DELETE** `/api/patient-documents/:id`

Delete a patient document (removes both database record and file from filesystem).

**Response:**
```json
{
  "success": true,
  "message": "Patient document deleted successfully"
}
```

**Permissions:**
- All authenticated users can delete
- Patients can only delete their own documents

## Document Types

The system supports the following document types:
- `consent` - Consent forms
- `id_copy` - ID copies
- `medical_record` - Medical records
- `lab_result` - Lab results
- `other` - Other documents

## File Storage

- Files are stored in: `uploads/patient-documents/`
- Filename format: `{timestamp}-{random}.{extension}`
- Original filename is preserved in the database

## Security Features

1. **Authentication**: All endpoints require authentication
2. **Authorization**: 
   - Patients can only access their own documents
   - Staff can access all documents
3. **File Validation**: 
   - File type validation
   - File size limit (10MB)
4. **Audit Logging**: All operations are logged to `audit_log` table
5. **File Cleanup**: Files are deleted from filesystem when document is deleted

## Usage Examples

### Upload Document (using curl)
```bash
curl -X POST http://localhost:5000/api/patient-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "patient_id=uuid" \
  -F "document_type=consent"
```

### Upload Document (using JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('patient_id', patientId);
formData.append('document_type', 'consent');

const response = await fetch('http://localhost:5000/api/patient-documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Get Patient Documents
```javascript
const response = await fetch(
  `http://localhost:5000/api/patient-documents/patient/${patientId}?document_type=consent`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const result = await response.json();
console.log(result.data);
```

### Download Document
```javascript
const response = await fetch(
  `http://localhost:5000/api/patient-documents/${documentId}/download`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'document.pdf';
a.click();
```

### Delete Document
```javascript
const response = await fetch(
  `http://localhost:5000/api/patient-documents/${documentId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const result = await response.json();
console.log(result);
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message (in development)"
}
```

Common error codes:
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (document/patient not found)
- `500` - Server Error

## Integration with Module 2

This implementation follows the Module 2 (Patient Management) structure:
- Documents are linked to patients via `patient_id`
- All operations are logged to `audit_log` (D8)
- Documents can be retrieved as part of patient profile
- Supports all document types defined in the database structure

## Database Indexes

The following indexes should exist for optimal performance:
```sql
CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_type ON patient_documents(document_type);
```

These indexes are already defined in the database schema.


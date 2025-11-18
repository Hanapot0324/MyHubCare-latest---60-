# Audit Log Setup

This document explains how to set up and use the audit logging system.

## Database Setup

### 1. Create the audit_log table

Run the SQL migration file to create the audit_log table:

```bash
mysql -u your_username -p your_database < backend/migrations/create_audit_log.sql
```

Or execute the SQL directly in your MySQL client:

```sql
-- See backend/migrations/create_audit_log.sql
```

## Features

The audit logging system automatically tracks:

### Authentication Module
- **LOGIN** - Successful and failed login attempts
- **LOGOUT** - User logout events
- **CREATE** - New user registration

### Patients Module
- **CREATE** - New patient registration
- **UPDATE** - Patient information updates
- **DELETE** - Patient deactivation (soft delete)

### Clinical Visits Module
- **CREATE** - New clinical visit creation
- **UPDATE** - Clinical visit updates

## Audit Log Fields

Each audit log entry contains:
- `user_id` - ID of the user performing the action
- `user_name` - Name of the user
- `user_role` - Role of the user
- `action` - Type of action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
- `module` - Module name (Authentication, Patients, Clinical Visits)
- `entity_type` - Type of entity affected (user, patient, clinical_visit)
- `entity_id` - ID of the entity
- `old_value` - Previous state (JSON)
- `new_value` - New state (JSON)
- `change_summary` - Human-readable summary
- `ip_address` - IP address of the user
- `user_agent` - Browser/client information
- `status` - success, failed, or error
- `timestamp` - When the action occurred

## Usage

The audit logging is automatically integrated into the following routes:

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Logs user registration
- `POST /api/auth/login` - Logs login attempts (success and failure)
- `POST /api/auth/logout` - Logs logout

### Patients (`/api/patients`)
- `POST /api/patients/register` - Logs patient creation
- `PUT /api/patients/:id` - Logs patient updates
- `DELETE /api/patients/:id` - Logs patient deactivation

### Clinical Visits (`/api/clinical-visits`)
- `POST /api/clinical-visits` - Logs visit creation
- `PUT /api/clinical-visits/:id` - Logs visit updates

## Querying Audit Logs

Example queries to retrieve audit logs:

```sql
-- Get all login attempts
SELECT * FROM audit_log 
WHERE module = 'Authentication' AND action = 'LOGIN'
ORDER BY timestamp DESC;

-- Get all patient updates
SELECT * FROM audit_log 
WHERE module = 'Patients' AND action = 'UPDATE'
ORDER BY timestamp DESC;

-- Get all actions by a specific user
SELECT * FROM audit_log 
WHERE user_id = 'user-uuid-here'
ORDER BY timestamp DESC;

-- Get failed login attempts
SELECT * FROM audit_log 
WHERE module = 'Authentication' 
  AND action = 'LOGIN' 
  AND status = 'failed'
ORDER BY timestamp DESC;
```

## Notes

- Audit logging does not block the main operation if it fails
- All audit log entries are stored with timestamps
- IP addresses and user agents are captured for security tracking
- Failed operations are also logged with error messages
















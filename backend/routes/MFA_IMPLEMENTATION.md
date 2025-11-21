# MFA (Multi-Factor Authentication) Implementation - Module 1

## Overview
This document describes the MFA implementation for Module 1 (User Authentication & Authorization) of the MyHubCares system.

## Database Structure

The `mfa_tokens` table is already created in the database with the following structure:
- `mfa_token_id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FOREIGN KEY → users)
- `method` (ENUM: 'totp', 'sms', 'email')
- `secret` (VARCHAR(255)) - For TOTP secrets
- `phone_number` (VARCHAR(30)) - For SMS method
- `code_hash` (VARCHAR(255)) - Hashed verification code
- `issued_at` (DATETIME)
- `expires_at` (DATETIME) - Usually 10 minutes
- `consumed_at` (DATETIME) - When code was used
- `attempts` (INTEGER) - Verification attempts counter

## API Endpoints

### 1. Setup MFA
**POST** `/api/mfa/setup`

Enable MFA for a user.

**Request Body:**
```json
{
  "user_id": "uuid",
  "method": "totp|sms|email",
  "phone_number": "optional for SMS",
  "email": "optional for email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA setup successful",
  "data": {
    "method": "sms",
    "secret": "base64_secret_for_totp",
    "phone_number": "+63-912-345-6789",
    "email": "user@example.com",
    "mfa_enabled": true
  }
}
```

### 2. Generate MFA Token
**POST** `/api/mfa/generate`

Generate an MFA code during login (called after password verification if MFA is enabled).

**Request Body:**
```json
{
  "user_id": "uuid",
  "method": "totp|sms|email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA code sent via sms",
  "data": {
    "mfa_token_id": "uuid",
    "method": "sms",
    "expires_at": "2025-01-01T12:10:00Z",
    "code": "123456" // Only in development mode
  }
}
```

### 3. Verify MFA Token
**POST** `/api/mfa/verify`

Verify the MFA code entered by the user.

**Request Body:**
```json
{
  "mfa_token_id": "uuid",
  "code": "123456",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA verification successful",
  "data": {
    "mfa_token_id": "uuid",
    "verified": true
  }
}
```

### 4. Complete Login (After MFA Verification)
**POST** `/api/auth/complete-login`

Complete the login process after MFA verification. This generates the JWT token and session.

**Request Body:**
```json
{
  "user_id": "uuid",
  "mfa_token_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful with MFA",
  "token": "jwt_token",
  "user": {
    "user_id": "uuid",
    "username": "username",
    "full_name": "Full Name",
    "email": "email@example.com",
    "role": "patient",
    "facility_id": "uuid",
    "patient": {...}
  }
}
```

### 5. Disable MFA
**POST** `/api/mfa/disable`

Disable MFA for a user (requires password verification).

**Request Body:**
```json
{
  "user_id": "uuid",
  "password": "user_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

### 6. Get MFA Status
**GET** `/api/mfa/status/:user_id`

Get the MFA status for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "mfa_enabled": true,
    "email": "user@example.com",
    "phone": "+63-912-345-6789",
    "active_tokens": 0
  }
}
```

## Login Flow with MFA

1. **User submits login credentials**
   - POST `/api/auth/login` with `username` and `password`
   - If MFA is enabled, response includes `requires_mfa: true`

2. **Generate MFA code**
   - POST `/api/mfa/generate` with `user_id` and `method`
   - Code is sent via SMS/Email (or generated for TOTP)

3. **User enters MFA code**
   - POST `/api/mfa/verify` with `mfa_token_id`, `code`, and `user_id`
   - If valid, token is marked as consumed

4. **Complete login**
   - POST `/api/auth/complete-login` with `user_id` and `mfa_token_id`
   - Returns JWT token and user data

## Updated Login Endpoint

The `/api/auth/login` endpoint now:
- Checks if user has `mfa_enabled = true`
- If MFA is enabled, returns `requires_mfa: true` instead of a token
- Frontend should then call `/api/mfa/generate` to get the code

## Security Features

1. **Code Hashing**: All MFA codes are hashed using bcrypt before storage
2. **Expiration**: MFA tokens expire after 10 minutes
3. **Attempt Limiting**: Maximum 5 verification attempts per token
4. **One-time Use**: Tokens are marked as consumed after successful verification
5. **Audit Logging**: All MFA operations are logged to `audit_log` table

## Development vs Production

- In **development mode** (`NODE_ENV=development`), the MFA code is returned in the response for testing
- In **production mode**, codes are only sent via SMS/Email and never returned in API responses

## TODO for Production

1. **SMS Integration**: Integrate with SMS service provider (e.g., Twilio, Nexmo)
2. **Email Integration**: Integrate with email service provider (e.g., SendGrid, AWS SES)
3. **TOTP Library**: Use proper TOTP library (e.g., `speakeasy`, `otplib`) for TOTP method
4. **QR Code Generation**: Generate QR codes for TOTP setup
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Backup Codes**: Generate backup codes for account recovery

## Database Indexes

The following indexes should be added for optimal performance:
```sql
CREATE INDEX idx_mfa_tokens_user_id ON mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_expires_at ON mfa_tokens(expires_at);
```

## Testing

To test MFA functionality:

1. **Setup MFA for a user:**
   ```bash
   curl -X POST http://localhost:5000/api/mfa/setup \
     -H "Content-Type: application/json" \
     -d '{"user_id": "uuid", "method": "sms"}'
   ```

2. **Login (will require MFA):**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "username", "password": "password"}'
   ```

3. **Generate MFA code:**
   ```bash
   curl -X POST http://localhost:5000/api/mfa/generate \
     -H "Content-Type: application/json" \
     -d '{"user_id": "uuid", "method": "sms"}'
   ```

4. **Verify MFA code:**
   ```bash
   curl -X POST http://localhost:5000/api/mfa/verify \
     -H "Content-Type: application/json" \
     -d '{"mfa_token_id": "uuid", "code": "123456", "user_id": "uuid"}'
   ```

5. **Complete login:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/complete-login \
     -H "Content-Type: application/json" \
     -d '{"user_id": "uuid", "mfa_token_id": "uuid"}'
   ```


# MyHubCares - Complete Database Structure Documentation

**"It's my hub, and it's yours"** - Your Partner in Sexual Health and Wellness  
**Website**: [www.myhubcares.com](https://www.myhubcares.com/)

This document provides a comprehensive breakdown of the database structure per module, including data requirements, data types, system flows, and data retrieval points.

---

## 📋 TABLE OF CONTENTS

1. [Module 1: User Authentication & Authorization (P1)](#module-1-user-authentication--authorization-p1)
2. [Module 2: Patient Management (P2)](#module-2-patient-management-p2)
3. [Module 3: Clinical Care (P3)](#module-3-clinical-care-p3)
4. [Module 4: Medication Management (P4)](#module-4-medication-management-p4)
5. [Module 5: Lab Test Management (P5)](#module-5-lab-test-management-p5)
6. [Module 6: Appointment Scheduling (P6)](#module-6-appointment-scheduling-p6)
7. [Module 7: Care Coordination & Referrals (P7)](#module-7-care-coordination--referrals-p7)
8. [Module 8: Reporting & Analytics (P8)](#module-8-reporting--analytics-p8)
9. [Module 9: System Administration (P9)](#module-9-system-administration-p9)
10. [Module 10: Vaccination Program](#module-10-vaccination-program)
11. [Module 11: Patient Feedback & Surveys](#module-11-patient-feedback--surveys)
12. [Module 12: Community Forum & Education](#module-12-community-forum--education)
13. [Module 13: Medication Reminders](#module-13-medication-reminders)
14. [Module 14: Inventory Management](#module-14-inventory-management)
15. [Module 15: ART Regimen Management](#module-15-art-regimen-management)
16. [System Flow & Data Retrieval Summary](#system-flow--data-retrieval-summary)

---

## MODULE 1: USER AUTHENTICATION & AUTHORIZATION (P1)

### **Purpose**: Handles user login, role-based access control, multi-factor authentication, and session management.

### **Database Tables**:

#### **1.1. users**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| user_id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Yes | Unique user identifier |
| username | VARCHAR(150) | UNIQUE, NOT NULL | Yes | Login username (case-insensitive) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Yes | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Yes | Bcrypt/Argon2 hashed password |
| full_name | VARCHAR(200) | NOT NULL | Yes | User's full name |
| role | ENUM('admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient') | NOT NULL | Yes | User role |
| status | ENUM('active', 'inactive', 'suspended', 'pending') | DEFAULT 'active' | Yes | Account status |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id) | No | Primary facility assignment |
| phone | VARCHAR(30) | | No | Contact phone number |
| last_login | TIMESTAMPTZ | | No | Last successful login timestamp |
| failed_login_attempts | INTEGER | DEFAULT 0 | Yes | Failed login counter |
| locked_until | TIMESTAMPTZ | | No | Account lock expiration |
| mfa_enabled | BOOLEAN | DEFAULT false | Yes | Multi-factor auth enabled |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update timestamp |
| created_by | UUID | FOREIGN KEY → users(user_id) | No | User who created this account |

**Indexes**: `idx_users_username`, `idx_users_email`, `idx_users_role`, `idx_users_facility_id`

#### **1.2. roles**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| role_id | UUID | PRIMARY KEY | Yes | Unique role identifier |
| role_code | VARCHAR(50) | UNIQUE, NOT NULL | Yes | Role code (e.g., 'admin', 'physician') |
| role_name | VARCHAR(100) | NOT NULL | Yes | Human-readable role name |
| description | TEXT | | No | Role description |
| is_system_role | BOOLEAN | DEFAULT false | Yes | System-defined role (cannot delete) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

#### **1.3. permissions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| permission_id | UUID | PRIMARY KEY | Yes | Unique permission identifier |
| permission_code | VARCHAR(100) | UNIQUE, NOT NULL | Yes | Permission code (e.g., 'patients.create') |
| permission_name | VARCHAR(150) | NOT NULL | Yes | Human-readable name |
| module | VARCHAR(50) | NOT NULL | Yes | Module name (e.g., 'patients', 'prescriptions') |
| action | VARCHAR(50) | NOT NULL | Yes | Action (e.g., 'create', 'read', 'update', 'delete') |
| description | TEXT | | No | Permission description |

**Indexes**: `idx_permissions_module`, `idx_permissions_action`

#### **1.4. role_permissions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| role_permission_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| role_id | UUID | FOREIGN KEY → roles(role_id), NOT NULL | Yes | Role reference |
| permission_id | UUID | FOREIGN KEY → permissions(permission_id), NOT NULL | Yes | Permission reference |
| granted_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | When permission was granted |

**Unique Constraint**: `UNIQUE(role_id, permission_id)`

#### **1.5. user_roles**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| user_role_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| user_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User reference |
| role_id | UUID | FOREIGN KEY → roles(role_id), NOT NULL | Yes | Role reference |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Assignment timestamp |
| assigned_by | UUID | FOREIGN KEY → users(user_id) | No | User who assigned role |

**Unique Constraint**: `UNIQUE(user_id, role_id)`

#### **1.6. auth_sessions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| session_id | UUID | PRIMARY KEY | Yes | Unique session identifier |
| user_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User reference |
| token_hash | VARCHAR(255) | NOT NULL | Yes | Hashed JWT token |
| issued_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Token issuance time |
| expires_at | TIMESTAMPTZ | NOT NULL | Yes | Token expiration time |
| ip_address | INET | | No | Client IP address |
| user_agent | TEXT | | No | Browser/client user agent |
| is_active | BOOLEAN | DEFAULT true | Yes | Session active status |
| revoked_at | TIMESTAMPTZ | | No | When session was revoked |

**Indexes**: `idx_sessions_user_id`, `idx_sessions_expires_at`, `idx_sessions_token_hash`

#### **1.7. mfa_tokens**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| mfa_token_id | UUID | PRIMARY KEY | Yes | Unique MFA token identifier |
| user_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User reference |
| method | ENUM('totp', 'sms', 'email') | NOT NULL | Yes | MFA method |
| secret | VARCHAR(255) | | No | TOTP secret (encrypted) |
| phone_number | VARCHAR(30) | | No | SMS phone number |
| code_hash | VARCHAR(255) | | No | Hashed verification code |
| issued_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Token issuance time |
| expires_at | TIMESTAMPTZ | NOT NULL | Yes | Expiration time (usually 5-10 minutes) |
| consumed_at | TIMESTAMPTZ | | No | When code was used |
| attempts | INTEGER | DEFAULT 0 | Yes | Verification attempts |

**Indexes**: `idx_mfa_tokens_user_id`, `idx_mfa_tokens_expires_at`

### **Required Data**:
- **User Registration**: username, email, password, full_name, role
- **Login**: username/email, password
- **MFA Setup**: method (totp/sms/email), secret/phone_number
- **Session Creation**: user_id, ip_address, user_agent

### **System Flow**:
1. **Login Process**:
   - User submits credentials → `P1` validates against `users` table (D1)
   - Check `status`, `failed_login_attempts`, `locked_until`
   - Verify password_hash using bcrypt/Argon2
   - If MFA enabled → generate MFA token → save to `mfa_tokens` → send code
   - On MFA success → create session → save to `auth_sessions` → return JWT
   - Log audit entry to `audit_log` (D8)

2. **Authorization Check**:
   - Extract user_id from JWT → query `users` → get `role`
   - Query `user_roles` → get all roles for user
   - Query `role_permissions` via `role_id` → get permissions
   - Check if user has required permission → allow/deny access

3. **Session Management**:
   - Validate JWT → check `auth_sessions` for active session
   - Check `expires_at` → refresh if needed
   - On logout → set `is_active = false`, `revoked_at = NOW()` in `auth_sessions`

### **Data Retrieval Points**:
- **D1 (Users Database)**: User credentials, roles, status, facility assignments
- **D8 (Audit Log)**: All authentication events (login, logout, failed attempts, MFA usage)

---

## MODULE 2: PATIENT MANAGEMENT (P2)

### **Purpose**: Manages patient registration, demographics, UIC generation, ARPA risk calculation, and patient profile updates.

### **Database Tables**:

#### **2.1. patients**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| patient_id | UUID | PRIMARY KEY | Yes | Unique patient identifier |
| uic | VARCHAR(30) | UNIQUE, NOT NULL | Yes | Unique Identifier Code (format: MIFI0111-15-1990) |
| philhealth_no | VARCHAR(20) | | No | PhilHealth number |
| first_name | VARCHAR(100) | NOT NULL | Yes | Patient first name |
| middle_name | VARCHAR(100) | | No | Middle name |
| last_name | VARCHAR(100) | NOT NULL | Yes | Last name |
| suffix | VARCHAR(10) | | No | Name suffix (Jr., Sr., III) |
| birth_date | DATE | NOT NULL | Yes | Date of birth |
| sex | ENUM('M', 'F', 'O') | NOT NULL | Yes | Sex at birth |
| civil_status | ENUM('Single', 'Married', 'Divorced', 'Widowed', 'Separated') | | No | Civil status |
| nationality | VARCHAR(50) | DEFAULT 'Filipino' | Yes | Nationality |
| current_city | VARCHAR(100) | | No | Current city |
| current_province | VARCHAR(100) | | No | Current province |
| current_address | JSONB | | No | Full address (street, barangay, city, province, zip) |
| contact_phone | VARCHAR(30) | | No | Primary phone number |
| email | VARCHAR(255) | | No | Email address |
| mother_name | VARCHAR(200) | | No | Mother's first 2 letters (for UIC) |
| father_name | VARCHAR(200) | | No | Father's first 2 letters (for UIC) |
| birth_order | INTEGER | | No | Birth order (1, 2, 3...) |
| guardian_name | VARCHAR(200) | | No | Guardian name (if minor) |
| guardian_relationship | VARCHAR(50) | | No | Relationship to guardian |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id) | Yes | Primary facility |
| arpa_risk_score | DECIMAL(5,2) | | No | Calculated ARPA risk score (0-100) |
| arpa_last_calculated | DATE | | No | Last ARPA calculation date |
| status | ENUM('active', 'inactive', 'deceased', 'transferred') | DEFAULT 'active' | Yes | Patient status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Registration timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update timestamp |
| created_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who registered patient |

**Indexes**: `idx_patients_uic`, `idx_patients_philhealth_no`, `idx_patients_name`, `idx_patients_facility_id`, `idx_patients_birth_date`

#### **2.2. patient_identifiers**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| identifier_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| id_type | ENUM('passport', 'driver_license', 'sss', 'tin', 'other') | NOT NULL | Yes | ID type |
| id_value | VARCHAR(100) | NOT NULL | Yes | ID number/value |
| issued_at | DATE | | No | Issue date |
| expires_at | DATE | | No | Expiration date |
| verified | BOOLEAN | DEFAULT false | Yes | Verification status |

**Indexes**: `idx_patient_identifiers_patient_id`, `idx_patient_identifiers_type_value`

#### **2.3. patient_risk_scores**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| risk_score_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| score | DECIMAL(5,2) | NOT NULL | Yes | Risk score (0-100) |
| calculated_on | DATE | DEFAULT CURRENT_DATE | Yes | Calculation date |
| risk_factors | JSONB | | No | Detailed risk factors breakdown |
| recommendations | TEXT | | No | Clinical recommendations |
| calculated_by | UUID | FOREIGN KEY → users(user_id) | No | User who calculated |

**Indexes**: `idx_patient_risk_scores_patient_id`, `idx_patient_risk_scores_calculated_on`

#### **2.4. patient_documents**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| document_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| document_type | ENUM('consent', 'id_copy', 'medical_record', 'lab_result', 'other') | NOT NULL | Yes | Document type |
| file_name | VARCHAR(255) | NOT NULL | Yes | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Yes | Storage path/URL |
| file_size | BIGINT | | No | File size in bytes |
| mime_type | VARCHAR(100) | | No | MIME type |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Upload timestamp |
| uploaded_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who uploaded |

**Indexes**: `idx_patient_documents_patient_id`, `idx_patient_documents_type`

### **Required Data**:
- **Patient Registration**: first_name, last_name, birth_date, sex, mother_name, father_name, birth_order (for UIC), facility_id
- **UIC Generation**: Mother's first 2 letters + Father's first 2 letters + Birth order + DOB (format: MIFI0111-15-1990)
- **ARPA Risk Calculation**: Requires data from D3 (visits), D4 (medications), D5 (lab results), D6 (appointments)

### **System Flow**:
1. **Patient Registration (P2.1)**:
   - Admin/Physician enters patient data → validate required fields
   - Check for duplicate UIC in `patients` table (D2)
   - Generate UIC: Use mother_name (first 2 letters) + father_name (first 2 letters) + birth_order + DOB
   - Create patient record → save to `patients` (D2)
   - Log audit entry to `audit_log` (D8)

2. **ARPA Risk Calculation (P2.4)**:
   - Select patient → query `patients` (D2) for basic info
   - Query `clinical_visits` (D3) → count visits, check adherence
   - Query `prescriptions` + `medication_adherence` (D4) → check medication compliance
   - Query `lab_results` (D5) → check CD4, viral load trends
   - Query `appointments` (D6) → check appointment attendance
   - Calculate risk score based on factors → save to `patient_risk_scores` → update `patients.arpa_risk_score`
   - Log calculation to `audit_log` (D8)

3. **Patient Profile Update (P2.2)**:
   - User selects patient → query `patients` (D2)
   - Update fields → save changes → update `updated_at`
   - Log changes to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient demographics, UIC, status, ARPA scores
- **D3 (Clinical Records)**: Visit history for ARPA calculation
- **D4 (Medications & Inventory)**: Medication adherence for ARPA
- **D5 (Lab Results)**: Lab trends for ARPA
- **D6 (Appointments Calendar)**: Appointment history for ARPA
- **D8 (Audit Log)**: All patient registration and update events

---

## MODULE 3: CLINICAL CARE (P3)

### **Purpose**: Records clinical visits, vital signs, BMI calculations, diagnoses, and visit history.

### **Database Tables**:

#### **3.1. clinical_visits**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| visit_id | UUID | PRIMARY KEY | Yes | Unique visit identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| provider_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Healthcare provider |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| visit_date | DATE | NOT NULL | Yes | Visit date |
| visit_type | ENUM('initial', 'follow_up', 'emergency', 'routine', 'art_pickup') | NOT NULL | Yes | Visit type |
| who_stage | ENUM('Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Not Applicable') | | No | WHO clinical stage |
| chief_complaint | TEXT | | No | Chief complaint |
| clinical_notes | TEXT | | No | Clinical notes |
| assessment | TEXT | | No | Clinical assessment |
| plan | TEXT | | No | Treatment plan |
| follow_up_date | DATE | | No | Next follow-up date |
| follow_up_reason | TEXT | | No | Reason for follow-up |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_clinical_visits_patient_id`, `idx_clinical_visits_visit_date`, `idx_clinical_visits_provider_id`

#### **3.2. vital_signs**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| vital_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| visit_id | UUID | FOREIGN KEY → clinical_visits(visit_id), NOT NULL | Yes | Visit reference |
| height_cm | NUMERIC(5,2) | | No | Height in centimeters |
| weight_kg | NUMERIC(5,2) | | No | Weight in kilograms |
| bmi | NUMERIC(5,2) | | No | Calculated BMI (weight_kg / (height_cm/100)²) |
| systolic_bp | INTEGER | | No | Systolic blood pressure |
| diastolic_bp | INTEGER | | No | Diastolic blood pressure |
| pulse_rate | INTEGER | | No | Pulse rate (bpm) |
| temperature_c | NUMERIC(4,1) | | No | Temperature in Celsius |
| respiratory_rate | INTEGER | | No | Respiratory rate |
| oxygen_saturation | NUMERIC(4,1) | | No | SpO2 percentage |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Recording timestamp |
| recorded_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who recorded |

**Indexes**: `idx_vital_signs_visit_id`

#### **3.3. diagnoses**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| diagnosis_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| visit_id | UUID | FOREIGN KEY → clinical_visits(visit_id), NOT NULL | Yes | Visit reference |
| icd10_code | VARCHAR(10) | | No | ICD-10 code |
| diagnosis_description | TEXT | NOT NULL | Yes | Diagnosis description |
| diagnosis_type | ENUM('primary', 'secondary', 'differential', 'rule_out') | DEFAULT 'primary' | Yes | Diagnosis type |
| is_chronic | BOOLEAN | DEFAULT false | Yes | Chronic condition flag |
| onset_date | DATE | | No | Onset date |
| resolved_date | DATE | | No | Resolution date |

**Indexes**: `idx_diagnoses_visit_id`, `idx_diagnoses_icd10_code`

#### **3.4. procedures**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| procedure_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| visit_id | UUID | FOREIGN KEY → clinical_visits(visit_id), NOT NULL | Yes | Visit reference |
| cpt_code | VARCHAR(8) | | No | CPT procedure code |
| procedure_name | VARCHAR(200) | NOT NULL | Yes | Procedure name |
| procedure_description | TEXT | | No | Procedure details |
| outcome | TEXT | | No | Procedure outcome |
| performed_at | TIMESTAMPTZ | | No | When procedure was performed |

**Indexes**: `idx_procedures_visit_id`

### **Required Data**:
- **Clinical Visit**: patient_id, provider_id, facility_id, visit_date, visit_type
- **Vital Signs**: visit_id, height_cm, weight_kg (for BMI calculation)
- **Diagnosis**: visit_id, diagnosis_description

### **System Flow**:
1. **Record Clinical Visit (P3.1)**:
   - Provider selects patient → query `patients` (D2) for patient info
   - Create visit record → save to `clinical_visits` (D3)
   - Enter vital signs → save to `vital_signs` (D3)
   - Calculate BMI: `bmi = weight_kg / (height_cm/100)²` → update `vital_signs.bmi`
   - Enter diagnoses → save to `diagnoses` (D3)
   - Enter clinical notes → update `clinical_visits`
   - Log audit entry to `audit_log` (D8)

2. **View Visit History (P3.5)**:
   - Select patient → query `clinical_visits` (D3) filtered by `patient_id`
   - Join with `vital_signs`, `diagnoses`, `procedures`
   - Display chronological visit list

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for visit context
- **D3 (Clinical Records)**: All visit records, vital signs, diagnoses, procedures
- **D8 (Audit Log)**: All clinical visit creation and updates

---

## MODULE 4: MEDICATION MANAGEMENT (P4)

### **Purpose**: Manages prescriptions, medication inventory, dispensing, reminders, and adherence tracking.

### **Database Tables**:

#### **4.1. medications**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| medication_id | UUID | PRIMARY KEY | Yes | Unique medication identifier |
| medication_name | VARCHAR(150) | NOT NULL | Yes | Medication name |
| generic_name | VARCHAR(150) | | No | Generic name |
| form | ENUM('tablet', 'capsule', 'syrup', 'injection', 'cream', 'other') | NOT NULL | Yes | Dosage form |
| strength | VARCHAR(50) | | No | Strength (e.g., '600mg', '10mg/ml') |
| atc_code | VARCHAR(10) | | No | ATC classification code |
| is_art | BOOLEAN | DEFAULT false | Yes | ART medication flag |
| is_controlled | BOOLEAN | DEFAULT false | Yes | Controlled substance flag |
| active | BOOLEAN | DEFAULT true | Yes | Active medication |

**Indexes**: `idx_medications_name`, `idx_medications_atc_code`, `idx_medications_is_art`

#### **4.2. prescriptions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| prescription_id | UUID | PRIMARY KEY | Yes | Unique prescription identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| prescriber_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Prescribing physician |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| prescription_date | DATE | DEFAULT CURRENT_DATE | Yes | Prescription date |
| prescription_number | VARCHAR(50) | UNIQUE | No | Prescription number |
| start_date | DATE | NOT NULL | Yes | Start date |
| end_date | DATE | | No | End date |
| duration_days | INTEGER | | No | Duration in days |
| notes | TEXT | | No | Prescriber notes |
| status | ENUM('active', 'completed', 'cancelled', 'expired') | DEFAULT 'active' | Yes | Prescription status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_prescriptions_patient_id`, `idx_prescriptions_prescriber_id`, `idx_prescriptions_date`, `idx_prescriptions_status`

#### **4.3. prescription_items**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| prescription_item_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| prescription_id | UUID | FOREIGN KEY → prescriptions(prescription_id), NOT NULL | Yes | Prescription reference |
| medication_id | UUID | FOREIGN KEY → medications(medication_id), NOT NULL | Yes | Medication reference |
| dosage | VARCHAR(50) | NOT NULL | Yes | Dosage (e.g., '1 tablet', '600mg') |
| frequency | VARCHAR(50) | NOT NULL | Yes | Frequency (e.g., 'Once daily', 'Twice daily') |
| quantity | INTEGER | NOT NULL | Yes | Quantity prescribed |
| instructions | TEXT | | No | Special instructions |
| duration_days | INTEGER | | No | Duration for this medication |

**Indexes**: `idx_prescription_items_prescription_id`, `idx_prescription_items_medication_id`

#### **4.4. medication_inventory**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| inventory_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| medication_id | UUID | FOREIGN KEY → medications(medication_id), NOT NULL | Yes | Medication reference |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| batch_number | VARCHAR(50) | | No | Batch/lot number |
| quantity_on_hand | INTEGER | NOT NULL, DEFAULT 0 | Yes | Current stock quantity |
| unit | VARCHAR(20) | DEFAULT 'tablets' | Yes | Unit of measure |
| expiry_date | DATE | | No | Expiry date |
| reorder_level | INTEGER | DEFAULT 0 | Yes | Reorder threshold |
| last_restocked | DATE | | No | Last restock date |
| supplier | VARCHAR(200) | | No | Supplier name |
| cost_per_unit | DECIMAL(10,2) | | No | Cost per unit |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_inventory_medication_id`, `idx_inventory_facility_id`, `idx_inventory_expiry_date`, `idx_inventory_batch_number`

#### **4.5. dispense_events**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| dispense_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| prescription_id | UUID | FOREIGN KEY → prescriptions(prescription_id), NOT NULL | Yes | Prescription reference |
| prescription_item_id | UUID | FOREIGN KEY → prescription_items(prescription_item_id) | No | Specific item dispensed |
| nurse_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Dispensing nurse |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| dispensed_date | DATE | DEFAULT CURRENT_DATE | Yes | Dispensing date |
| quantity_dispensed | INTEGER | NOT NULL | Yes | Quantity dispensed |
| batch_number | VARCHAR(50) | | No | Batch used |
| notes | TEXT | | No | Dispensing notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_dispense_events_prescription_id`, `idx_dispense_events_dispensed_date`

#### **4.6. medication_reminders**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| reminder_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| prescription_id | UUID | FOREIGN KEY → prescriptions(prescription_id) | No | Prescription reference |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| medication_name | VARCHAR(150) | NOT NULL | Yes | Medication name |
| dosage | VARCHAR(50) | NOT NULL | Yes | Dosage |
| frequency | VARCHAR(50) | NOT NULL | Yes | Frequency |
| reminder_time | TIME | NOT NULL | Yes | Reminder time (HH:MM) |
| sound_preference | ENUM('default', 'gentle', 'urgent') | DEFAULT 'default' | Yes | Alarm sound |
| browser_notifications | BOOLEAN | DEFAULT true | Yes | Enable browser notifications |
| special_instructions | TEXT | | No | Special instructions |
| active | BOOLEAN | DEFAULT true | Yes | Reminder active status |
| missed_doses | INTEGER | DEFAULT 0 | Yes | Missed dose counter |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_medication_reminders_patient_id`, `idx_medication_reminders_prescription_id`, `idx_medication_reminders_active`

#### **4.7. medication_adherence**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| adherence_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| prescription_id | UUID | FOREIGN KEY → prescriptions(prescription_id), NOT NULL | Yes | Prescription reference |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| adherence_date | DATE | DEFAULT CURRENT_DATE | Yes | Adherence date |
| taken | BOOLEAN | DEFAULT false | Yes | Medication taken |
| missed_reason | TEXT | | No | Reason for missing dose |
| adherence_percentage | DECIMAL(5,2) | | No | Calculated adherence % |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Recording timestamp |

**Indexes**: `idx_medication_adherence_prescription_id`, `idx_medication_adherence_patient_id`, `idx_medication_adherence_date`

### **Required Data**:
- **Create Prescription**: patient_id, prescriber_id, medication_id, dosage, frequency, quantity, start_date
- **Check Inventory**: medication_id, facility_id → query `medication_inventory` for `quantity_on_hand`
- **Dispense Medication**: prescription_id, nurse_id, quantity_dispensed → update inventory
- **Create Reminder**: patient_id, medication_name, dosage, frequency, reminder_time

### **System Flow**:
1. **Create Prescription (P4.1)**:
   - Physician selects patient → query `patients` (D2)
   - Select medication → query `medications` for details
   - Check inventory → query `medication_inventory` (D4) for `quantity_on_hand` at facility
   - If stock available → create prescription → save to `prescriptions` (D4)
   - Add prescription items → save to `prescription_items` (D4)
   - Generate prescription number → update `prescriptions.prescription_number`
   - Log audit entry to `audit_log` (D8)

2. **Dispense Medication (P4.3)**:
   - Nurse selects prescription → query `prescriptions` + `prescription_items` (D4)
   - Check inventory → verify `quantity_on_hand` >= `quantity_dispensed`
   - Create dispense event → save to `dispense_events` (D4)
   - Update inventory → `quantity_on_hand = quantity_on_hand - quantity_dispensed`
   - Trigger reminder creation → save to `medication_reminders` (D4)
   - Log audit entry to `audit_log` (D8)

3. **Manage Inventory (P4.4)**:
   - Nurse selects medication → query `medication_inventory` (D4)
   - Update stock → adjust `quantity_on_hand`
   - Check `reorder_level` → generate alert if `quantity_on_hand <= reorder_level`
   - Check `expiry_date` → generate alert if expiring soon
   - Log audit entry to `audit_log` (D8)

4. **Track Adherence (P4.6)**:
   - Patient reports medication taken/missed → save to `medication_adherence` (D4)
   - Calculate adherence percentage: `(taken_doses / total_expected_doses) * 100`
   - Update `medication_reminders.missed_doses` if missed
   - Log to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for prescriptions
- **D4 (Medications & Inventory)**: All medication, prescription, inventory, dispensing, reminder, and adherence data
- **D8 (Audit Log)**: All medication-related events

---

## MODULE 5: LAB TEST MANAGEMENT (P5)

### **Purpose**: Processes lab test orders, results entry, validation, critical value alerts, and test history.

### **Database Tables**:

#### **5.1. lab_orders**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| order_id | UUID | PRIMARY KEY | Yes | Unique order identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| ordering_provider_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Ordering physician |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| order_date | DATE | DEFAULT CURRENT_DATE | Yes | Order date |
| test_panel | VARCHAR(100) | NOT NULL | Yes | Test panel name (e.g., 'CD4 Count', 'Viral Load') |
| priority | ENUM('routine', 'urgent', 'stat') | DEFAULT 'routine' | Yes | Priority level |
| status | ENUM('ordered', 'collected', 'in_progress', 'completed', 'cancelled') | DEFAULT 'ordered' | Yes | Order status |
| collection_date | DATE | | No | Sample collection date |
| notes | TEXT | | No | Order notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_lab_orders_patient_id`, `idx_lab_orders_order_date`, `idx_lab_orders_status`

#### **5.2. lab_results**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| result_id | UUID | PRIMARY KEY | Yes | Unique result identifier |
| order_id | UUID | FOREIGN KEY → lab_orders(order_id), NOT NULL | Yes | Order reference |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| test_code | VARCHAR(50) | NOT NULL | Yes | Test code (e.g., 'CD4', 'VL', 'CBC') |
| test_name | VARCHAR(150) | NOT NULL | Yes | Test name |
| result_value | VARCHAR(100) | NOT NULL | Yes | Result value (can be numeric or text) |
| unit | VARCHAR(20) | | No | Unit of measure |
| reference_range_min | NUMERIC(10,2) | | No | Normal range minimum |
| reference_range_max | NUMERIC(10,2) | | No | Normal range maximum |
| reference_range_text | VARCHAR(100) | | No | Text reference range (e.g., '< 20 copies/mL') |
| is_critical | BOOLEAN | DEFAULT false | Yes | Critical value flag |
| critical_alert_sent | BOOLEAN | DEFAULT false | Yes | Alert sent to provider |
| collected_at | DATE | | No | Sample collection date |
| reported_at | DATE | DEFAULT CURRENT_DATE | Yes | Result reporting date |
| reviewed_at | TIMESTAMPTZ | | No | When provider reviewed |
| reviewer_id | UUID | FOREIGN KEY → users(user_id) | No | Provider who reviewed |
| notes | TEXT | | No | Result notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| created_by | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Lab personnel who entered |

**Indexes**: `idx_lab_results_order_id`, `idx_lab_results_patient_id`, `idx_lab_results_test_code`, `idx_lab_results_reported_at`, `idx_lab_results_is_critical`

#### **5.3. lab_files**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| file_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| result_id | UUID | FOREIGN KEY → lab_results(result_id), NOT NULL | Yes | Result reference |
| file_name | VARCHAR(255) | NOT NULL | Yes | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Yes | Storage path/URL |
| file_size | BIGINT | | No | File size in bytes |
| mime_type | VARCHAR(100) | | No | MIME type |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Upload timestamp |
| uploaded_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who uploaded |

**Indexes**: `idx_lab_files_result_id`

### **Required Data**:
- **Enter Test Result**: order_id/patient_id, test_code, test_name, result_value, unit, reference_range
- **Validate Test Data**: Check result_value against reference_range → set `is_critical` if outside range
- **Check Critical Values**: If `is_critical = true` → notify provider

### **System Flow**:
1. **Enter Test Result (P5.1)**:
   - Lab personnel selects patient → query `patients` (D2)
   - Select test type → query `lab_orders` (D5) for pending orders
   - Enter test values → validate against reference ranges
   - Check critical values → if outside range → set `is_critical = true`
   - Save result → save to `lab_results` (D5)
   - Update order status → set `lab_orders.status = 'completed'`
   - If critical → notify provider (P5.4) → set `critical_alert_sent = true`
   - Log audit entry to `audit_log` (D8)

2. **View Test History (P5.5)**:
   - Select patient → query `lab_results` (D5) filtered by `patient_id`
   - Join with `lab_orders` for order context
   - Display chronological test results

3. **Notify Provider (P5.4)**:
   - Query `lab_results` (D5) where `is_critical = true` AND `critical_alert_sent = false`
   - Get `ordering_provider_id` from `lab_orders`
   - Send alert notification → set `critical_alert_sent = true`
   - Log notification to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for lab context
- **D5 (Lab Results)**: All lab orders, results, and attachments
- **D8 (Audit Log)**: All lab result entry and notification events

---

## MODULE 6: APPOINTMENT SCHEDULING (P6)

### **Purpose**: Manages appointment booking, calendar availability, reminders, and appointment history.

### **Database Tables**:

#### **6.1. appointments**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| appointment_id | UUID | PRIMARY KEY | Yes | Unique appointment identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| provider_id | UUID | FOREIGN KEY → users(user_id) | No | Assigned provider |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| appointment_type | ENUM('follow_up', 'art_pickup', 'lab_test', 'counseling', 'general', 'initial') | NOT NULL | Yes | Appointment type |
| scheduled_start | TIMESTAMPTZ | NOT NULL | Yes | Scheduled start time |
| scheduled_end | TIMESTAMPTZ | NOT NULL | Yes | Scheduled end time |
| duration_minutes | INTEGER | DEFAULT 30 | Yes | Appointment duration |
| status | ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') | DEFAULT 'scheduled' | Yes | Appointment status |
| reason | TEXT | | No | Reason for visit |
| notes | TEXT | | No | Appointment notes |
| booked_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who booked |
| booked_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Booking timestamp |
| cancelled_at | TIMESTAMPTZ | | No | Cancellation timestamp |
| cancelled_by | UUID | FOREIGN KEY → users(user_id) | No | User who cancelled |
| cancellation_reason | TEXT | | No | Cancellation reason |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_appointments_patient_id`, `idx_appointments_provider_id`, `idx_appointments_facility_id`, `idx_appointments_scheduled_start`, `idx_appointments_status`

#### **6.2. availability_slots**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| slot_id | UUID | PRIMARY KEY | Yes | Unique slot identifier |
| provider_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Provider reference |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| slot_date | DATE | NOT NULL | Yes | Slot date |
| start_time | TIME | NOT NULL | Yes | Slot start time |
| end_time | TIME | NOT NULL | Yes | Slot end time |
| slot_status | ENUM('available', 'booked', 'blocked', 'unavailable') | DEFAULT 'available' | Yes | Slot status |
| appointment_id | UUID | FOREIGN KEY → appointments(appointment_id) | No | Booked appointment |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_availability_slots_provider_id`, `idx_availability_slots_facility_id`, `idx_availability_slots_date`, `idx_availability_slots_status`

#### **6.3. appointment_reminders**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| reminder_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| appointment_id | UUID | FOREIGN KEY → appointments(appointment_id), NOT NULL | Yes | Appointment reference |
| reminder_type | ENUM('sms', 'email', 'push', 'in_app') | NOT NULL | Yes | Reminder channel |
| reminder_sent_at | TIMESTAMPTZ | | No | When reminder was sent |
| reminder_scheduled_at | TIMESTAMPTZ | NOT NULL | Yes | Scheduled send time |
| status | ENUM('pending', 'sent', 'failed', 'cancelled') | DEFAULT 'pending' | Yes | Reminder status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_appointment_reminders_appointment_id`, `idx_appointment_reminders_status`, `idx_appointment_reminders_scheduled_at`

### **Required Data**:
- **Book Appointment**: patient_id, facility_id, appointment_type, scheduled_start, scheduled_end
- **Check Availability**: provider_id, facility_id, slot_date, start_time → query `availability_slots` for available slots
- **Create Reminder**: appointment_id, reminder_type, reminder_scheduled_at (usually 24 hours before appointment)

### **System Flow**:
1. **Book Appointment (P6.1)**:
   - User selects patient → query `patients` (D2) for patient info
   - Select facility → query `facilities` for facility details
   - Select provider → query `users` (D1) for provider availability
   - Check availability → query `availability_slots` (D6) for available slots matching provider/facility/date/time
   - If available → create appointment → save to `appointments` (D6)
   - Update slot → set `availability_slots.slot_status = 'booked'`, `appointment_id = new_appointment_id`
   - Generate reminder → save to `appointment_reminders` (D6) scheduled for 24h before appointment
   - Log audit entry to `audit_log` (D8)

2. **Check Availability (P6.2)**:
   - Query `availability_slots` (D6) filtered by provider_id, facility_id, slot_date, slot_status = 'available'
   - Exclude slots where `scheduled_start` conflicts with existing appointments
   - Return available time slots

3. **Send Reminders (P6.4)**:
   - Query `appointment_reminders` (D6) where `status = 'pending'` AND `reminder_scheduled_at <= NOW()`
   - Send reminder via specified channel (SMS/email/push/in-app)
   - Update `reminder_sent_at = NOW()`, `status = 'sent'`
   - Log to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for appointments
- **D1 (Users Database)**: Provider information and availability
- **D6 (Appointments Calendar)**: All appointments, availability slots, and reminders
- **D8 (Audit Log)**: All appointment booking and cancellation events

---

## MODULE 7: CARE COORDINATION & REFERRALS (P7)

### **Purpose**: Manages referrals between facilities, counseling sessions, HTS sessions, and care coordination tasks.

### **Database Tables**:

#### **7.1. referrals**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| referral_id | UUID | PRIMARY KEY | Yes | Unique referral identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| from_facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Referring facility |
| to_facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Receiving facility |
| referral_reason | TEXT | NOT NULL | Yes | Reason for referral |
| urgency | ENUM('routine', 'urgent', 'emergency') | DEFAULT 'routine' | Yes | Urgency level |
| status | ENUM('pending', 'accepted', 'in_transit', 'completed', 'rejected', 'cancelled') | DEFAULT 'pending' | Yes | Referral status |
| clinical_notes | TEXT | | No | Clinical notes for receiving facility |
| referred_by | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Case manager/physician |
| referred_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Referral creation timestamp |
| accepted_at | TIMESTAMPTZ | | No | When receiving facility accepted |
| accepted_by | UUID | FOREIGN KEY → users(user_id) | No | User at receiving facility |
| completed_at | TIMESTAMPTZ | | No | When referral was completed |
| rejection_reason | TEXT | | No | Reason for rejection |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_referrals_patient_id`, `idx_referrals_from_facility_id`, `idx_referrals_to_facility_id`, `idx_referrals_status`, `idx_referrals_referred_at`

#### **7.2. counseling_sessions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| session_id | UUID | PRIMARY KEY | Yes | Unique session identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| counselor_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Counselor (case manager) |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| session_date | DATE | DEFAULT CURRENT_DATE | Yes | Session date |
| session_type | ENUM('pre_test', 'post_test', 'adherence', 'mental_health', 'support', 'other') | NOT NULL | Yes | Session type |
| session_notes | TEXT | | No | Session notes |
| follow_up_required | BOOLEAN | DEFAULT false | Yes | Follow-up needed |
| follow_up_date | DATE | | No | Next follow-up date |
| follow_up_reason | TEXT | | No | Reason for follow-up |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_counseling_sessions_patient_id`, `idx_counseling_sessions_counselor_id`, `idx_counseling_sessions_session_date`

#### **7.3. hts_sessions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| hts_id | UUID | PRIMARY KEY | Yes | Unique HTS identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| tester_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Tester (nurse/lab personnel) |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| test_date | DATE | DEFAULT CURRENT_DATE | Yes | Test date |
| test_result | ENUM('positive', 'negative', 'indeterminate') | NOT NULL | Yes | Test result |
| test_type | VARCHAR(50) | | No | Test type/kit used |
| pre_test_counseling | BOOLEAN | DEFAULT false | Yes | Pre-test counseling done |
| post_test_counseling | BOOLEAN | DEFAULT false | Yes | Post-test counseling done |
| linked_to_care | BOOLEAN | DEFAULT false | Yes | Linked to care if positive |
| care_link_date | DATE | | No | When linked to care |
| notes | TEXT | | No | Session notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_hts_sessions_patient_id`, `idx_hts_sessions_test_date`, `idx_hts_sessions_test_result`

#### **7.4. care_tasks**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| task_id | UUID | PRIMARY KEY | Yes | Unique task identifier |
| referral_id | UUID | FOREIGN KEY → referrals(referral_id) | No | Related referral |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| assignee_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Assigned user |
| task_type | ENUM('follow_up', 'referral', 'counseling', 'appointment', 'other') | NOT NULL | Yes | Task type |
| task_description | TEXT | NOT NULL | Yes | Task description |
| due_date | DATE | | No | Due date |
| status | ENUM('pending', 'in_progress', 'completed', 'cancelled') | DEFAULT 'pending' | Yes | Task status |
| completed_at | TIMESTAMPTZ | | No | Completion timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| created_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who created task |

**Indexes**: `idx_care_tasks_patient_id`, `idx_care_tasks_assignee_id`, `idx_care_tasks_due_date`, `idx_care_tasks_status`

### **Required Data**:
- **Create Referral**: patient_id, from_facility_id, to_facility_id, referral_reason, urgency, referred_by
- **Conduct HTS Session**: patient_id, tester_id, test_date, test_result, pre_test_counseling, post_test_counseling
- **Record Counseling**: patient_id, counselor_id, session_date, session_type, session_notes

### **System Flow**:
1. **Create Referral (P7.1)**:
   - Case manager selects patient → query `patients` (D2)
   - Select from/to facilities → query `facilities` for facility details
   - Enter referral reason and urgency → create referral → save to `referrals` (D7)
   - Set status to 'pending' → notify receiving facility
   - Create care task → save to `care_tasks` (D7) for follow-up
   - Log audit entry to `audit_log` (D8)

2. **Conduct HTS Session (P7.3)**:
   - Nurse/lab personnel selects patient → query `patients` (D2)
   - Conduct pre-test counseling → set `pre_test_counseling = true`
   - Perform test → record result → save to `hts_sessions` (D7)
   - Conduct post-test counseling → set `post_test_counseling = true`
   - If positive → link to care → set `linked_to_care = true`, `care_link_date = CURRENT_DATE`
   - Log audit entry to `audit_log` (D8)

3. **Record Counseling (P7.4)**:
   - Case manager selects patient → query `patients` (D2)
   - Enter session details → save to `counseling_sessions` (D7)
   - If follow-up needed → set `follow_up_required = true`, `follow_up_date = date`
   - Create care task if follow-up needed → save to `care_tasks` (D7)
   - Log audit entry to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for referrals and counseling
- **D7 (Referrals & Counseling)**: All referrals, counseling sessions, HTS sessions, and care tasks
- **D8 (Audit Log)**: All care coordination events

---

## MODULE 8: REPORTING & ANALYTICS (P8)

### **Purpose**: Generates reports, dashboards, and analytics from all system data.

### **Database Tables**:

#### **8.1. report_queries**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| report_id | UUID | PRIMARY KEY | Yes | Unique report identifier |
| report_name | VARCHAR(150) | NOT NULL | Yes | Report name |
| report_description | TEXT | | No | Report description |
| report_type | ENUM('patient', 'clinical', 'inventory', 'survey', 'custom') | NOT NULL | Yes | Report type |
| query_definition | JSONB | NOT NULL | Yes | SQL query or query parameters |
| parameters | JSONB | | No | Default parameters |
| schedule | VARCHAR(50) | | No | Cron schedule (if scheduled) |
| owner_id | UUID | FOREIGN KEY → users(user_id) | Yes | Report owner |
| is_public | BOOLEAN | DEFAULT false | Yes | Public report flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_report_queries_report_type`, `idx_report_queries_owner_id`

#### **8.2. report_runs**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| run_id | UUID | PRIMARY KEY | Yes | Unique run identifier |
| report_id | UUID | FOREIGN KEY → report_queries(report_id), NOT NULL | Yes | Report reference |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Run start time |
| finished_at | TIMESTAMPTZ | | No | Run completion time |
| status | ENUM('running', 'completed', 'failed', 'cancelled') | DEFAULT 'running' | Yes | Run status |
| parameters_used | JSONB | | No | Parameters used for this run |
| output_ref | VARCHAR(500) | | No | Output file path/URL |
| error_message | TEXT | | No | Error message if failed |
| run_by | UUID | FOREIGN KEY → users(user_id) | Yes | User who ran report |

**Indexes**: `idx_report_runs_report_id`, `idx_report_runs_started_at`, `idx_report_runs_status`

#### **8.3. dashboard_cache**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| cache_id | UUID | PRIMARY KEY | Yes | Unique cache identifier |
| widget_id | VARCHAR(100) | NOT NULL | Yes | Widget identifier |
| parameters | JSONB | NOT NULL | Yes | Cache parameters |
| cached_data | JSONB | NOT NULL | Yes | Cached data |
| cached_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Cache timestamp |
| expires_at | TIMESTAMPTZ | NOT NULL | Yes | Cache expiration |

**Indexes**: `idx_dashboard_cache_widget_id`, `idx_dashboard_cache_expires_at`

#### **8.4. audit_log**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| audit_id | UUID | PRIMARY KEY | Yes | Unique audit log identifier |
| user_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User who performed action |
| user_name | VARCHAR(200) | NOT NULL | Yes | User's full name (denormalized for performance) |
| user_role | VARCHAR(50) | NOT NULL | Yes | User's role (denormalized) |
| action | ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'PRINT', 'DOWNLOAD') | NOT NULL | Yes | Action performed |
| module | VARCHAR(100) | NOT NULL | Yes | Module/table affected (e.g., 'PATIENTS', 'PRESCRIPTIONS', 'INVENTORY') |
| entity_type | VARCHAR(100) | | No | Entity type (e.g., 'patient', 'prescription', 'appointment') |
| entity_id | UUID | | No | Entity ID (if applicable) |
| record_id | VARCHAR(50) | | No | Human-readable record ID (e.g., patient UIC, prescription number) |
| old_value | JSONB | | No | Previous value (for UPDATE actions) |
| new_value | JSONB | | No | New value (for UPDATE actions) |
| change_summary | TEXT | | No | Summary of changes (e.g., '50 units → 100 units') |
| ip_address | INET | | No | IP address of user |
| device_type | ENUM('Desktop', 'Mobile', 'Tablet') | | No | Device type |
| user_agent | TEXT | | No | Browser/client user agent |
| remarks | TEXT | | No | Additional remarks/notes |
| status | ENUM('success', 'failed', 'error') | DEFAULT 'success' | Yes | Action status |
| error_message | TEXT | | No | Error message (if status = 'failed' or 'error') |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Audit log timestamp |

**Indexes**: `idx_audit_log_user_id`, `idx_audit_log_action`, `idx_audit_log_module`, `idx_audit_log_entity_id`, `idx_audit_log_created_at`, `idx_audit_log_user_role`

**Partitioning**: Consider partitioning by `created_at` (monthly) for large-scale deployments

### **Required Data**:
- **Generate Report**: report_id, parameters (date_range, facility_id, patient_id, etc.)
- **Dashboard Widget**: widget_id, parameters → query relevant data stores

### **System Flow**:
1. **Generate Patient Reports (P8.1)**:
   - Admin selects report type → query `report_queries` (D8) for report definition
   - Apply parameters → execute query against `patients` (D2)
   - Aggregate data → generate report → save to `report_runs` (D8)
   - Export to PDF/CSV → return to admin

2. **Generate Clinical Reports (P8.2)**:
   - Query `clinical_visits` (D3), `lab_results` (D5), `prescriptions` (D4)
   - Aggregate by date range, facility, provider
   - Generate statistics → return dashboard/widget data

3. **Calculate Statistics (P8.4)**:
   - Query multiple data stores: D2 (patients), D3 (visits), D4 (medications), D5 (lab), D6 (appointments), D7 (referrals)
   - Calculate KPIs: patient count, visit count, medication adherence, lab completion rates, appointment attendance
   - Cache results → save to `dashboard_cache` (D8) for performance
   - Return aggregated metrics

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient demographics, registration data
- **D3 (Clinical Records)**: Visit statistics, diagnoses
- **D4 (Medications & Inventory)**: Prescription data, inventory levels, adherence
- **D5 (Lab Results)**: Lab test statistics, critical values
- **D6 (Appointments Calendar)**: Appointment statistics, attendance rates
- **D7 (Referrals & Counseling)**: Referral statistics, counseling sessions
- **D8 (Audit Log, Report Queries, Report Runs, Dashboard Cache)**: Audit trail, report definitions, execution history, cached data

---

## MODULE 9: SYSTEM ADMINISTRATION (P9)

### **Purpose**: Manages users, facilities, system settings, and configuration.

### **Database Tables**:

#### **9.1. facilities**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| facility_id | UUID | PRIMARY KEY | Yes | Unique facility identifier |
| facility_name | VARCHAR(150) | NOT NULL | Yes | Facility name |
| facility_type | ENUM('main', 'branch', 'satellite', 'external') | NOT NULL | Yes | Facility type |
| address | JSONB | NOT NULL | Yes | Full address (street, city, province, zip) |
| region_id | INTEGER | | No | Region ID |
| contact_person | VARCHAR(200) | | No | Contact person name |
| contact_number | VARCHAR(50) | | No | Contact phone |
| email | VARCHAR(255) | | No | Contact email |
| is_active | BOOLEAN | DEFAULT true | Yes | Active facility flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_facilities_name`, `idx_facilities_type`, `idx_facilities_is_active`

#### **9.2. system_settings**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| setting_key | VARCHAR(100) | PRIMARY KEY | Yes | Setting key (e.g., 'system.name') |
| setting_value | JSONB | NOT NULL | Yes | Setting value (can be string, number, object, array) |
| description | TEXT | | No | Setting description |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update timestamp |
| updated_by | UUID | FOREIGN KEY → users(user_id) | No | User who updated |

#### **9.3. user_facility_assignments**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| assignment_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| user_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User reference |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility reference |
| is_primary | BOOLEAN | DEFAULT false | Yes | Primary facility flag |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Assignment timestamp |
| assigned_by | UUID | FOREIGN KEY → users(user_id) | No | User who assigned |

**Unique Constraint**: `UNIQUE(user_id, facility_id)` where `is_primary = true` (only one primary per user)

**Indexes**: `idx_user_facility_assignments_user_id`, `idx_user_facility_assignments_facility_id`

#### **9.4. regions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| region_id | INTEGER | PRIMARY KEY | Yes | Unique region identifier (Philippines region code) |
| region_name | VARCHAR(150) | NOT NULL | Yes | Region name (e.g., 'National Capital Region (NCR)') |
| region_code | VARCHAR(20) | UNIQUE | No | Region code (e.g., 'NCR', 'I', 'II') |
| is_active | BOOLEAN | DEFAULT true | Yes | Active region flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_regions_code`, `idx_regions_is_active`

#### **9.5. client_types**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| client_type_id | INTEGER | PRIMARY KEY | Yes | Unique client type identifier |
| type_name | VARCHAR(200) | NOT NULL | Yes | Client type name (e.g., 'Males having Sex with Males') |
| type_code | VARCHAR(50) | UNIQUE | No | Type code (e.g., 'MSM', 'FSW') |
| description | TEXT | | No | Type description |
| is_active | BOOLEAN | DEFAULT true | Yes | Active type flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_client_types_code`, `idx_client_types_is_active`

### **Required Data**:
- **Manage Users**: username, email, password, full_name, role, facility_id
- **Manage Facilities**: facility_name, facility_type, address, contact information
- **System Settings**: setting_key, setting_value

### **System Flow**:
1. **Manage Users (P9.1)**:
   - Admin creates/updates user → save to `users` (D1)
   - Assign roles → save to `user_roles` (D1)
   - Assign facilities → save to `user_facility_assignments` (D9)
   - Log audit entry to `audit_log` (D8)

2. **Manage Facilities (P9.2)**:
   - Admin creates/updates facility → save to `facilities` (D9)
   - Update facility assignments → update `user_facility_assignments` (D9)
   - Log audit entry to `audit_log` (D8)

3. **System Configuration (P9.5)**:
   - Admin updates settings → save to `system_settings` (D9)
   - Apply configuration → update system behavior
   - Log audit entry to `audit_log` (D8)

### **Data Retrieval Points**:
- **D1 (Users Database)**: User accounts, roles, permissions
- **D9 (Facilities, System Settings, Regions, Client Types)**: Facility information, system configuration, reference data
- **D8 (Audit Log)**: All administrative actions

---

## MODULE 10: VACCINATION PROGRAM

### **Purpose**: Manages vaccination records, vaccine schedules, dose tracking, and reminders.

### **Database Tables**:

#### **10.1. vaccine_catalog**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| vaccine_id | UUID | PRIMARY KEY | Yes | Unique vaccine identifier |
| vaccine_name | VARCHAR(150) | NOT NULL | Yes | Vaccine name (e.g., 'Hepatitis B') |
| manufacturer | VARCHAR(100) | | No | Manufacturer name |
| series_length | INTEGER | NOT NULL | Yes | Total doses in series (1, 2, 3, etc.) |
| dose_intervals | JSONB | | No | Interval between doses in days (e.g., [0, 30, 180]) |
| is_active | BOOLEAN | DEFAULT true | Yes | Active vaccine flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_vaccine_catalog_name`, `idx_vaccine_catalog_is_active`

#### **10.2. vaccination_records**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| vaccination_id | UUID | PRIMARY KEY | Yes | Unique vaccination identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| vaccine_id | UUID | FOREIGN KEY → vaccine_catalog(vaccine_id), NOT NULL | Yes | Vaccine reference |
| provider_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Provider who administered |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| dose_number | INTEGER | NOT NULL | Yes | Current dose (1, 2, 3...) |
| total_doses | INTEGER | NOT NULL | Yes | Total doses in series |
| date_given | DATE | DEFAULT CURRENT_DATE | Yes | Administration date |
| next_dose_due | DATE | | No | Next dose due date |
| lot_number | VARCHAR(50) | | No | Vaccine lot/batch number |
| administration_site | ENUM('left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'other') | | No | Administration site |
| notes | TEXT | | No | Notes (side effects, reactions) |
| status | ENUM('complete', 'in_progress', 'due_soon', 'overdue') | | No | Calculated status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_vaccination_records_patient_id`, `idx_vaccination_records_vaccine_id`, `idx_vaccination_records_date_given`, `idx_vaccination_records_next_dose_due`, `idx_vaccination_records_status`

### **Required Data**:
- **Record Vaccination**: patient_id, vaccine_id, provider_id, dose_number, total_doses, date_given, lot_number
- **Calculate Next Dose**: Based on `vaccine_catalog.dose_intervals` → calculate `next_dose_due`
- **Status Calculation**: Compare `next_dose_due` with current date → set status (complete/in_progress/due_soon/overdue)

### **System Flow**:
1. **Record Vaccination**:
   - Provider selects patient → query `patients` (D2)
   - Select vaccine → query `vaccine_catalog` for vaccine details
   - Enter dose information → calculate `next_dose_due` based on `dose_intervals`
   - Save vaccination → save to `vaccination_records`
   - Calculate status → update `status` field
   - Log audit entry to `audit_log` (D8)

2. **View Vaccination History**:
   - Select patient → query `vaccination_records` filtered by `patient_id`
   - Join with `vaccine_catalog` for vaccine details
   - Display chronological vaccination list

3. **Upcoming Vaccinations**:
   - Query `vaccination_records` where `status IN ('due_soon', 'overdue')` AND `next_dose_due <= CURRENT_DATE + 7 days`
   - Return list of patients needing vaccinations

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information
- **Vaccination Tables**: `vaccine_catalog`, `vaccination_records`
- **D8 (Audit Log)**: All vaccination events

---

## MODULE 11: PATIENT FEEDBACK & SURVEYS

### **Purpose**: Collects patient satisfaction surveys and feedback.

### **Database Tables**:

#### **11.1. survey_responses**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| survey_id | UUID | PRIMARY KEY | Yes | Unique survey identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id) | No | Facility where survey was taken |
| overall_satisfaction | ENUM('very_happy', 'happy', 'neutral', 'unhappy', 'very_unhappy') | NOT NULL | Yes | Overall satisfaction (emoji rating) |
| staff_friendliness | INTEGER | CHECK (staff_friendliness >= 1 AND staff_friendliness <= 5) | Yes | Staff friendliness (1-5 stars) |
| wait_time | INTEGER | CHECK (wait_time >= 1 AND wait_time <= 5) | Yes | Wait time rating (1-5 stars) |
| facility_cleanliness | INTEGER | CHECK (facility_cleanliness >= 1 AND facility_cleanliness <= 5) | Yes | Cleanliness rating (1-5 stars) |
| would_recommend | ENUM('yes', 'maybe', 'no') | NOT NULL | Yes | Recommendation status |
| comments | TEXT | | No | Optional comments |
| average_score | NUMERIC(3,2) | | No | Calculated average: (staff + wait + cleanliness) / 3 |
| submitted_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Submission timestamp |

**Indexes**: `idx_survey_responses_patient_id`, `idx_survey_responses_facility_id`, `idx_survey_responses_submitted_at`

#### **11.2. survey_metrics**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| metric_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id) | No | Facility (NULL for system-wide) |
| period_start | DATE | NOT NULL | Yes | Period start date |
| period_end | DATE | NOT NULL | Yes | Period end date |
| total_responses | INTEGER | DEFAULT 0 | Yes | Total survey responses |
| average_overall | NUMERIC(3,2) | | No | Average overall satisfaction |
| average_staff | NUMERIC(3,2) | | No | Average staff rating |
| average_wait | NUMERIC(3,2) | | No | Average wait time rating |
| average_cleanliness | NUMERIC(3,2) | | No | Average cleanliness rating |
| recommendation_rate | NUMERIC(5,2) | | No | % who would recommend |
| calculated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Calculation timestamp |

**Indexes**: `idx_survey_metrics_facility_id`, `idx_survey_metrics_period`

### **Required Data**:
- **Submit Survey**: patient_id, overall_satisfaction, staff_friendliness, wait_time, facility_cleanliness, would_recommend
- **Calculate Metrics**: Aggregate `survey_responses` by facility and date range

### **System Flow**:
1. **Submit Survey**:
   - Patient fills survey form → calculate `average_score = (staff_friendliness + wait_time + facility_cleanliness) / 3`
   - Save survey → save to `survey_responses`
   - Log audit entry to `audit_log` (D8)

2. **Calculate Survey Metrics**:
   - Query `survey_responses` filtered by facility_id and date range
   - Calculate averages → save to `survey_metrics`
   - Return metrics for dashboard

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information
- **Survey Tables**: `survey_responses`, `survey_metrics`
- **D8 (Audit Log)**: Survey submission events

---

## MODULE 12: COMMUNITY FORUM & EDUCATION

### **Purpose**: Manages community forum posts, replies, and educational content.

### **Database Tables**:

#### **12.1. forum_categories**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| category_id | UUID | PRIMARY KEY | Yes | Unique category identifier |
| category_name | VARCHAR(100) | NOT NULL | Yes | Category name (e.g., 'General Discussion') |
| category_code | VARCHAR(50) | UNIQUE, NOT NULL | Yes | Category code (e.g., 'general') |
| description | TEXT | | No | Category description |
| icon | VARCHAR(10) | | No | Emoji icon |
| is_active | BOOLEAN | DEFAULT true | Yes | Active category flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_forum_categories_code`, `idx_forum_categories_is_active`

#### **12.2. forum_posts**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| post_id | UUID | PRIMARY KEY | Yes | Unique post identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id) | No | Patient author (NULL if anonymous) |
| category_id | UUID | FOREIGN KEY → forum_categories(category_id), NOT NULL | Yes | Category reference |
| title | VARCHAR(200) | NOT NULL | Yes | Post title |
| content | TEXT | NOT NULL | Yes | Post content |
| is_anonymous | BOOLEAN | DEFAULT true | Yes | Anonymous post flag |
| reply_count | INTEGER | DEFAULT 0 | Yes | Number of replies |
| view_count | INTEGER | DEFAULT 0 | Yes | View count |
| is_pinned | BOOLEAN | DEFAULT false | Yes | Pinned post flag |
| is_locked | BOOLEAN | DEFAULT false | Yes | Locked post flag |
| status | ENUM('pending', 'approved', 'rejected', 'flagged') | DEFAULT 'pending' | Yes | Post status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_forum_posts_category_id`, `idx_forum_posts_patient_id`, `idx_forum_posts_status`, `idx_forum_posts_created_at`

#### **12.3. forum_replies**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| reply_id | UUID | PRIMARY KEY | Yes | Unique reply identifier |
| post_id | UUID | FOREIGN KEY → forum_posts(post_id), NOT NULL | Yes | Post reference |
| patient_id | UUID | FOREIGN KEY → patients(patient_id) | No | Patient author (NULL if anonymous) |
| content | TEXT | NOT NULL | Yes | Reply content |
| is_anonymous | BOOLEAN | DEFAULT true | Yes | Anonymous reply flag |
| status | ENUM('pending', 'approved', 'rejected') | DEFAULT 'pending' | Yes | Reply status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_forum_replies_post_id`, `idx_forum_replies_patient_id`, `idx_forum_replies_created_at`

#### **12.4. learning_modules**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| module_id | UUID | PRIMARY KEY | Yes | Unique module identifier |
| module_title | VARCHAR(200) | NOT NULL | Yes | Module title |
| module_content | TEXT | | No | Module content (HTML/text) |
| module_type | ENUM('article', 'video', 'infographic', 'pdf') | DEFAULT 'article' | Yes | Content type |
| category | VARCHAR(50) | | No | Category (e.g., 'basics', 'treatment', 'prevention', 'lifestyle') |
| description | TEXT | | No | Module description |
| read_time | VARCHAR(20) | | No | Estimated reading time (e.g., '10 min') |
| tags | JSONB | | No | Tags array |
| is_published | BOOLEAN | DEFAULT false | Yes | Published flag |
| view_count | INTEGER | DEFAULT 0 | Yes | View count |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_learning_modules_type`, `idx_learning_modules_is_published`, `idx_learning_modules_created_at`, `idx_learning_modules_category`

#### **12.5. faqs**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| faq_id | UUID | PRIMARY KEY | Yes | Unique FAQ identifier |
| question | TEXT | NOT NULL | Yes | FAQ question |
| answer | TEXT | NOT NULL | Yes | FAQ answer |
| category | VARCHAR(50) | | No | FAQ category (e.g., 'general', 'treatment', 'prevention') |
| display_order | INTEGER | DEFAULT 0 | Yes | Display order for sorting |
| view_count | INTEGER | DEFAULT 0 | Yes | View count |
| is_published | BOOLEAN | DEFAULT true | Yes | Published flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_faqs_category`, `idx_faqs_is_published`, `idx_faqs_display_order`

### **Required Data**:
- **Create Forum Post**: category_id, title, content, patient_id (optional if anonymous)
- **Create Reply**: post_id, content, patient_id (optional if anonymous)
- **Create Learning Module**: module_title, module_content, module_type

### **System Flow**:
1. **Create Forum Post**:
   - Patient selects category → query `forum_categories`
   - Enter post details → save to `forum_posts`
   - If anonymous → set `patient_id = NULL`, `is_anonymous = true`
   - Set status to 'pending' for moderation
   - Log audit entry to `audit_log` (D8)

2. **Create Reply**:
   - Patient selects post → query `forum_posts`
   - Enter reply → save to `forum_replies`
   - Update `forum_posts.reply_count = reply_count + 1`
   - Log audit entry to `audit_log` (D8)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information (if not anonymous)
- **Forum Tables**: `forum_categories`, `forum_posts`, `forum_replies`, `learning_modules`, `faqs`
- **D8 (Audit Log)**: Forum post and reply events

---

## MODULE 13: MEDICATION REMINDERS

### **Purpose**: Manages patient medication reminders with customizable alarms and notifications.

### **Database Tables**:

#### **13.1. medication_reminders** (Already defined in Module 4)
- See Module 4, Table 4.6 for structure
- Additional fields for mobile reminders:
  - `reminder_id` (UUID, PRIMARY KEY)
  - `patient_id` (UUID, FK → patients)
  - `medication_name` (VARCHAR(150))
  - `dosage` (VARCHAR(50))
  - `frequency` (VARCHAR(50))
  - `reminder_time` (TIME)
  - `sound_preference` (ENUM: 'default', 'gentle', 'urgent')
  - `browser_notifications` (BOOLEAN)
  - `special_instructions` (TEXT)
  - `active` (BOOLEAN)
  - `missed_doses` (INTEGER)

### **Required Data**:
- **Create Reminder**: patient_id, medication_name, dosage, frequency, reminder_time, sound_preference
- **Schedule Notification**: Calculate next reminder time based on `frequency` and `reminder_time`

### **System Flow**:
1. **Create Medication Reminder**:
   - Patient selects medication → enter reminder details
   - Save reminder → save to `medication_reminders` (D4)
   - Schedule browser notification → set notification for `reminder_time`
   - Log audit entry to `audit_log` (D8)

2. **Trigger Reminder**:
   - System checks `medication_reminders` where `active = true` AND `reminder_time = CURRENT_TIME`
   - Send browser notification → play alarm sound based on `sound_preference`
   - Patient acknowledges → update reminder status

3. **Track Missed Doses**:
   - If reminder not acknowledged → increment `missed_doses`
   - Update adherence → save to `medication_adherence` (D4)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information
- **D4 (Medications & Inventory)**: `medication_reminders` table
- **D8 (Audit Log)**: Reminder creation and acknowledgment events

---

## MODULE 14: INVENTORY MANAGEMENT

### **Purpose**: Manages medication inventory, stock levels, reorder alerts, expiry tracking, and inventory transactions across facilities.

### **Database Tables**:

#### **14.1. medication_inventory** (Referenced from Module 4, Table 4.4)
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| inventory_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| medication_id | UUID | FOREIGN KEY → medications(medication_id), NOT NULL | Yes | Medication reference |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| batch_number | VARCHAR(50) | | No | Batch/lot number |
| quantity_on_hand | INTEGER | NOT NULL, DEFAULT 0 | Yes | Current stock quantity |
| unit | VARCHAR(20) | DEFAULT 'tablets' | Yes | Unit of measure |
| expiry_date | DATE | | No | Expiry date |
| reorder_level | INTEGER | DEFAULT 0 | Yes | Reorder threshold |
| last_restocked | DATE | | No | Last restock date |
| supplier | VARCHAR(200) | | No | Supplier name |
| cost_per_unit | DECIMAL(10,2) | | No | Cost per unit |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_inventory_medication_id`, `idx_inventory_facility_id`, `idx_inventory_expiry_date`, `idx_inventory_batch_number`

#### **14.2. inventory_transactions**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| transaction_id | UUID | PRIMARY KEY | Yes | Unique transaction identifier |
| inventory_id | UUID | FOREIGN KEY → medication_inventory(inventory_id), NOT NULL | Yes | Inventory item reference |
| transaction_type | ENUM('restock', 'dispense', 'adjustment', 'transfer', 'expired', 'damaged', 'return') | NOT NULL | Yes | Transaction type |
| quantity_change | INTEGER | NOT NULL | Yes | Quantity change (positive for restock, negative for dispense) |
| quantity_before | INTEGER | NOT NULL | Yes | Stock level before transaction |
| quantity_after | INTEGER | NOT NULL | Yes | Stock level after transaction |
| batch_number | VARCHAR(50) | | No | Batch number involved |
| transaction_reason | TEXT | | No | Reason for transaction |
| performed_by | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User who performed transaction |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| transaction_date | DATE | DEFAULT CURRENT_DATE | Yes | Transaction date |
| reference_id | UUID | | No | Reference to related entity (e.g., prescription_id, order_id) |
| reference_type | VARCHAR(50) | | No | Type of reference (e.g., 'prescription', 'order', 'transfer') |
| notes | TEXT | | No | Transaction notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_inventory_transactions_inventory_id`, `idx_inventory_transactions_transaction_type`, `idx_inventory_transactions_transaction_date`, `idx_inventory_transactions_facility_id`

#### **14.3. inventory_alerts**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| alert_id | UUID | PRIMARY KEY | Yes | Unique alert identifier |
| inventory_id | UUID | FOREIGN KEY → medication_inventory(inventory_id), NOT NULL | Yes | Inventory item reference |
| alert_type | ENUM('low_stock', 'expiring_soon', 'expired', 'overstock') | NOT NULL | Yes | Alert type |
| alert_level | ENUM('info', 'warning', 'critical') | DEFAULT 'warning' | Yes | Alert severity |
| current_value | NUMERIC(10,2) | NOT NULL | Yes | Current value (quantity or days until expiry) |
| threshold_value | NUMERIC(10,2) | NOT NULL | Yes | Threshold value |
| message | TEXT | NOT NULL | Yes | Alert message |
| acknowledged | BOOLEAN | DEFAULT false | Yes | Alert acknowledged |
| acknowledged_by | UUID | FOREIGN KEY → users(user_id) | No | User who acknowledged |
| acknowledged_at | TIMESTAMPTZ | | No | Acknowledgment timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Alert creation timestamp |

**Indexes**: `idx_inventory_alerts_inventory_id`, `idx_inventory_alerts_alert_type`, `idx_inventory_alerts_acknowledged`, `idx_inventory_alerts_created_at`

#### **14.4. inventory_suppliers**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| supplier_id | UUID | PRIMARY KEY | Yes | Unique supplier identifier |
| supplier_name | VARCHAR(200) | NOT NULL | Yes | Supplier name |
| contact_person | VARCHAR(200) | | No | Contact person name |
| contact_phone | VARCHAR(50) | | No | Contact phone |
| contact_email | VARCHAR(255) | | No | Contact email |
| address | JSONB | | No | Supplier address |
| payment_terms | VARCHAR(100) | | No | Payment terms |
| is_active | BOOLEAN | DEFAULT true | Yes | Active supplier flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update |

**Indexes**: `idx_inventory_suppliers_name`, `idx_inventory_suppliers_is_active`

#### **14.5. inventory_orders**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| order_id | UUID | PRIMARY KEY | Yes | Unique order identifier |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| supplier_id | UUID | FOREIGN KEY → inventory_suppliers(supplier_id), NOT NULL | Yes | Supplier reference |
| order_date | DATE | DEFAULT CURRENT_DATE | Yes | Order date |
| expected_delivery_date | DATE | | No | Expected delivery date |
| status | ENUM('pending', 'ordered', 'in_transit', 'received', 'cancelled', 'partial') | DEFAULT 'pending' | Yes | Order status |
| total_cost | DECIMAL(10,2) | | No | Total order cost |
| ordered_by | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User who placed order |
| received_by | UUID | FOREIGN KEY → users(user_id) | No | User who received order |
| received_at | TIMESTAMPTZ | | No | Receipt timestamp |
| notes | TEXT | | No | Order notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_inventory_orders_facility_id`, `idx_inventory_orders_supplier_id`, `idx_inventory_orders_status`, `idx_inventory_orders_order_date`

#### **14.6. inventory_order_items**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| order_item_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| order_id | UUID | FOREIGN KEY → inventory_orders(order_id), NOT NULL | Yes | Order reference |
| medication_id | UUID | FOREIGN KEY → medications(medication_id), NOT NULL | Yes | Medication reference |
| quantity_ordered | INTEGER | NOT NULL | Yes | Quantity ordered |
| quantity_received | INTEGER | DEFAULT 0 | Yes | Quantity received |
| unit_cost | DECIMAL(10,2) | | No | Cost per unit |
| batch_number | VARCHAR(50) | | No | Batch number |
| expiry_date | DATE | | No | Expiry date |
| status | ENUM('pending', 'received', 'partial', 'cancelled') | DEFAULT 'pending' | Yes | Item status |

**Indexes**: `idx_inventory_order_items_order_id`, `idx_inventory_order_items_medication_id`

### **Required Data**:
- **View Inventory**: facility_id → query `medication_inventory` filtered by facility
- **Restock Medication**: inventory_id, quantity_change, batch_number, expiry_date, supplier
- **Check Stock Levels**: Query `medication_inventory` where `quantity_on_hand <= reorder_level`
- **Check Expiry**: Query `medication_inventory` where `expiry_date <= CURRENT_DATE + 30 days`
- **Create Alert**: inventory_id, alert_type, current_value, threshold_value

### **System Flow**:
1. **View Inventory (P4.4)**:
   - User selects facility → query `medication_inventory` (D4) filtered by `facility_id`
   - Display stock levels, reorder levels, expiry dates
   - Check for alerts → query `inventory_alerts` (D14) for unacknowledged alerts
   - Return inventory grid with status indicators

2. **Restock Medication**:
   - User selects inventory item → query `medication_inventory` (D4)
   - Enter restock quantity → create transaction → save to `inventory_transactions` (D14)
   - Update inventory → `quantity_on_hand = quantity_on_hand + quantity_change`
   - Update `last_restocked = CURRENT_DATE`
   - If order exists → link to `inventory_orders` (D14)
   - Check if alert resolved → update/delete `inventory_alerts` (D14)
   - Log audit entry to `audit_log` (D8)

3. **Generate Low Stock Alert**:
   - Query `medication_inventory` (D4) where `quantity_on_hand <= reorder_level`
   - Check if alert already exists in `inventory_alerts` (D14)
   - If not exists → create alert → save to `inventory_alerts` (D14)
   - Notify facility staff

4. **Generate Expiry Alert**:
   - Query `medication_inventory` (D4) where `expiry_date <= CURRENT_DATE + 30 days`
   - Check if alert already exists in `inventory_alerts` (D14)
   - If not exists → create alert → save to `inventory_alerts` (D14)
   - Notify facility staff

5. **Create Purchase Order**:
   - User selects supplier → query `inventory_suppliers` (D14)
   - Add order items → save to `inventory_order_items` (D14)
   - Create order → save to `inventory_orders` (D14)
   - Calculate total cost → update `inventory_orders.total_cost`
   - Log audit entry to `audit_log` (D8)

6. **Receive Order**:
   - User selects order → query `inventory_orders` + `inventory_order_items` (D14)
   - Update received quantities → update `inventory_order_items.quantity_received`
   - Create restock transactions → save to `inventory_transactions` (D14)
   - Update inventory → update `medication_inventory` (D4)
   - Update order status → set `inventory_orders.status = 'received'`
   - Log audit entry to `audit_log` (D8)

### **Data Retrieval Points**:
- **D4 (Medications & Inventory)**: `medication_inventory` table for stock levels
- **D14 (Inventory Management)**: `inventory_transactions`, `inventory_alerts`, `inventory_suppliers`, `inventory_orders`, `inventory_order_items`
- **D8 (Audit Log)**: All inventory transactions and alerts

---

## MODULE 15: ART REGIMEN MANAGEMENT

### **Purpose**: Manages antiretroviral therapy (ART) regimens, tracks multiple drugs per regimen, monitors pill dispensing, adherence, and regimen changes.

### **Database Tables**:

#### **15.1. art_regimens**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| regimen_id | UUID | PRIMARY KEY | Yes | Unique regimen identifier |
| patient_id | UUID | FOREIGN KEY → patients(patient_id), NOT NULL | Yes | Patient reference |
| provider_id | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | Prescribing physician |
| facility_id | UUID | FOREIGN KEY → facilities(facility_id), NOT NULL | Yes | Facility |
| start_date | DATE | NOT NULL | Yes | Regimen start date |
| stop_date | DATE | | No | Regimen stop date (if stopped/changed) |
| status | ENUM('active', 'stopped', 'changed') | DEFAULT 'active' | Yes | Regimen status |
| stop_reason | TEXT | | No | Reason for stopping/changing regimen |
| change_reason | TEXT | | No | Reason for regimen change |
| notes | TEXT | | No | Clinical notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Last update timestamp |

**Indexes**: `idx_art_regimens_patient_id`, `idx_art_regimens_status`, `idx_art_regimens_start_date`

#### **15.2. art_regimen_drugs**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| regimen_drug_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| regimen_id | UUID | FOREIGN KEY → art_regimens(regimen_id), NOT NULL | Yes | Regimen reference |
| medication_id | UUID | FOREIGN KEY → medications(medication_id), NOT NULL | Yes | Medication reference |
| drug_name | VARCHAR(200) | NOT NULL | Yes | Drug name (e.g., 'Tenofovir/Lamivudine/Dolutegravir') |
| dosage | VARCHAR(50) | NOT NULL | Yes | Dosage (e.g., '1 tablet') |
| pills_per_day | INTEGER | NOT NULL | Yes | Number of pills per day |
| pills_dispensed | INTEGER | DEFAULT 0 | Yes | Total pills dispensed |
| pills_remaining | INTEGER | DEFAULT 0 | Yes | Current pills remaining |
| missed_doses | INTEGER | DEFAULT 0 | Yes | Total missed doses count |
| last_dispensed_date | DATE | | No | Last pill dispensing date |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_art_regimen_drugs_regimen_id`, `idx_art_regimen_drugs_medication_id`

#### **15.3. art_regimen_history**
| Column Name | Data Type | Constraints | Required | Description |
|------------|-----------|-------------|----------|-------------|
| history_id | UUID | PRIMARY KEY | Yes | Unique identifier |
| regimen_id | UUID | FOREIGN KEY → art_regimens(regimen_id), NOT NULL | Yes | Regimen reference |
| action_type | ENUM('started', 'stopped', 'changed', 'drug_added', 'drug_removed', 'pills_dispensed', 'dose_missed') | NOT NULL | Yes | Action type |
| action_date | DATE | DEFAULT CURRENT_DATE | Yes | Action date |
| previous_status | VARCHAR(50) | | No | Previous status (for status changes) |
| new_status | VARCHAR(50) | | No | New status (for status changes) |
| details | JSONB | | No | Action details (drug changes, quantities, etc.) |
| performed_by | UUID | FOREIGN KEY → users(user_id), NOT NULL | Yes | User who performed action |
| notes | TEXT | | No | Additional notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Yes | Creation timestamp |

**Indexes**: `idx_art_regimen_history_regimen_id`, `idx_art_regimen_history_action_date`, `idx_art_regimen_history_action_type`

### **Required Data**:
- **Start ART Regimen**: patient_id, provider_id, facility_id, start_date, drugs (array with drug_name, dosage, pills_per_day)
- **Dispense Pills**: regimen_id, regimen_drug_id, quantity_dispensed → update pills_dispensed, pills_remaining
- **Stop/Change Regimen**: regimen_id, stop_date, status, stop_reason/change_reason
- **Track Missed Dose**: regimen_id, regimen_drug_id → increment missed_doses

### **System Flow**:
1. **Start ART Regimen**:
   - Physician selects patient → query `patients` (D2)
   - Select medications → query `medications` (D4) where `is_art = true`
   - Enter regimen details → create regimen → save to `art_regimens` (D15)
   - Add drugs → save to `art_regimen_drugs` (D15)
   - Create history entry → save to `art_regimen_history` (D15) with action_type = 'started'
   - Log audit entry to `audit_log` (D8)

2. **Dispense ART Pills**:
   - Nurse selects regimen → query `art_regimens` + `art_regimen_drugs` (D15)
   - Enter quantity dispensed → update `pills_dispensed` and `pills_remaining`
   - Update `last_dispensed_date = CURRENT_DATE`
   - Create history entry → save to `art_regimen_history` (D15) with action_type = 'pills_dispensed'
   - Check inventory → update `medication_inventory` (D4) if needed
   - Log audit entry to `audit_log` (D8)

3. **Stop/Change Regimen**:
   - Physician selects regimen → query `art_regimens` (D15)
   - Enter stop/change reason → update `status`, `stop_date`, `stop_reason`/`change_reason`
   - Create history entry → save to `art_regimen_history` (D15) with action_type = 'stopped' or 'changed'
   - If changed → create new regimen → link to previous regimen
   - Log audit entry to `audit_log` (D8)

4. **Track Missed Dose**:
   - Patient reports missed dose OR system detects missed dose → update `art_regimen_drugs.missed_doses`
   - Create history entry → save to `art_regimen_history` (D15) with action_type = 'dose_missed'
   - Update ARPA risk score → trigger P2.4 (ARPA calculation)
   - Log to `audit_log` (D8)

5. **View Regimen History**:
   - Select patient → query `art_regimens` (D15) filtered by `patient_id`
   - Join with `art_regimen_drugs` for drug details
   - Join with `art_regimen_history` for complete timeline
   - Calculate days on ART: `CURRENT_DATE - start_date` (or `stop_date - start_date` if stopped)

### **Data Retrieval Points**:
- **D2 (Patients Database)**: Patient information for regimens
- **D4 (Medications & Inventory)**: ART medications (`is_art = true`), inventory for dispensing
- **D15 (ART Regimens)**: `art_regimens`, `art_regimen_drugs`, `art_regimen_history`
- **D8 (Audit Log)**: All ART regimen events

---

## SYSTEM FLOW & DATA RETRIVAL SUMMARY

### **Central Data Stores (D1-D8)**:

1. **D1: Users Database**
   - Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `auth_sessions`, `mfa_tokens`
   - Used by: P1 (Authentication), P9 (System Admin)
   - Data Flow: User credentials → Authentication → Session management → Role-based access

2. **D2: Patients Database**
   - Tables: `patients`, `patient_identifiers`, `patient_risk_scores`, `patient_documents`
   - Used by: P2 (Patient Management), P3 (Clinical), P4 (Medications), P5 (Lab), P6 (Appointments), P7 (Referrals), P8 (Reports)
   - Data Flow: Patient registration → UIC generation → Profile updates → ARPA calculation

3. **D3: Clinical Records**
   - Tables: `clinical_visits`, `vital_signs`, `diagnoses`, `procedures`
   - Used by: P3 (Clinical Care), P2 (ARPA calculation), P8 (Reports)
   - Data Flow: Clinical visit → Vital signs → BMI calculation → Diagnoses → Visit history

4. **D4: Medications & Inventory**
   - Tables: `medications`, `prescriptions`, `prescription_items`, `medication_inventory`, `dispense_events`, `medication_reminders`, `medication_adherence`
   - Used by: P4 (Medication Management), P2 (ARPA calculation), P8 (Reports), P15 (ART Regimens)
   - Data Flow: Prescription → Inventory check → Dispensing → Reminders → Adherence tracking

5. **D5: Lab Results**
   - Tables: `lab_orders`, `lab_results`, `lab_files`
   - Used by: P5 (Lab Management), P2 (ARPA calculation), P8 (Reports)
   - Data Flow: Lab order → Result entry → Validation → Critical alerts → Test history

6. **D6: Appointments Calendar**
   - Tables: `appointments`, `availability_slots`, `appointment_reminders`
   - Used by: P6 (Appointment Scheduling), P2 (ARPA calculation), P8 (Reports)
   - Data Flow: Appointment booking → Availability check → Reminder generation → Appointment history

7. **D7: Referrals & Counseling**
   - Tables: `referrals`, `counseling_sessions`, `hts_sessions`, `care_tasks`
   - Used by: P7 (Care Coordination), P8 (Reports)
   - Data Flow: Referral creation → HTS session → Counseling → Care tasks → Follow-up

8. **D8: Audit Log & Reporting**
   - Tables: `audit_log`, `report_queries`, `report_runs`, `dashboard_cache`
   - Used by: All processes (P1-P9, P15), P8 (Reporting)
   - Data Flow: Every system action → Audit entry → Compliance tracking → Report generation

9. **D9: System Administration & Reference Data**
   - Tables: `facilities`, `system_settings`, `user_facility_assignments`, `regions`, `client_types`
   - Used by: P9 (System Admin), P2 (Patient Management for client types), All modules (for facility filtering)
   - Data Flow: System configuration → Reference data → Facility assignments → Multi-facility support

10. **D14: Inventory Management**
   - Tables: `inventory_transactions`, `inventory_alerts`, `inventory_suppliers`, `inventory_orders`, `inventory_order_items`
   - Used by: P4 (Medication Management), Admin (Inventory Management)
   - Data Flow: Inventory transactions → Stock updates → Alert generation → Order management

11. **D15: ART Regimens**
   - Tables: `art_regimens`, `art_regimen_drugs`, `art_regimen_history`
   - Used by: P4 (Medication Management), P2 (ARPA calculation), P8 (Reports)
   - Data Flow: Regimen start → Drug tracking → Pill dispensing → Adherence monitoring → Regimen changes

### **Cross-Module Data Flows**:

1. **ARPA Risk Calculation (P2.4)**:
   - Retrieves from: D2 (patients), D3 (visits), D4 (medications), D5 (lab), D6 (appointments)
   - Calculates risk score → Updates D2 (patients.arpa_risk_score)

2. **Prescription Flow (P4.1)**:
   - Retrieves from: D2 (patients), D4 (inventory)
   - Creates prescription → Updates D4 (prescriptions, inventory)
   - Triggers reminder → Creates D4 (medication_reminders)

3. **Lab Critical Alert (P5.4)**:
   - Retrieves from: D5 (lab_results)
   - Checks critical values → Notifies provider → Updates D5 (critical_alert_sent)

4. **Reporting & Analytics (P8)**:
   - Retrieves from: D2, D3, D4, D5, D6, D7, D9, D14, D15 (all data stores)
   - Aggregates data → Generates reports → Caches in D8 (dashboard_cache)

5. **Inventory Management Flow**:
   - Prescription creation (P4.1) → Checks D4 (medication_inventory) for stock availability
   - Dispensing (P4.3) → Updates D4 (medication_inventory) → Creates D14 (inventory_transactions)
   - Low stock detection → Creates D14 (inventory_alerts) → Notifies staff
   - Purchase orders → Creates D14 (inventory_orders) → Receives → Updates D4 (medication_inventory)

### **Data Retrieval Patterns**:

1. **Patient-Centric Queries**:
   - Most modules query `patients` (D2) first for patient context
   - Then query module-specific tables filtered by `patient_id`

2. **Facility-Centric Queries**:
   - Many modules filter by `facility_id` for multi-facility support
   - Reports aggregate by facility

3. **Time-Based Queries**:
   - Appointments, visits, lab results, prescriptions filtered by date ranges
   - Reminders scheduled based on time calculations

4. **Status-Based Queries**:
   - Most modules filter by status fields (active, pending, completed, etc.)
   - Used for workflow management

5. **Audit Trail**:
   - Every CREATE, UPDATE, DELETE operation logs to `audit_log` (D8)
   - Includes: user_id, action, module, entity_type, entity_id, timestamp, IP address

---

## CONCLUSION

This database structure supports all modules of the MyHubCares Healthcare Management System with:
- **15 core modules** covering authentication, patient management, clinical care, medications, lab tests, appointments, referrals, reporting, administration, vaccinations, surveys, forums, reminders, inventory management, and ART regimen management
- **Comprehensive data types** using UUIDs for primary keys, ENUMs for controlled values, JSONB for flexible data, and proper indexing
- **Clear data flows** showing how data moves between modules and data stores
- **Audit compliance** with every action logged to the audit trail
- **Scalability** with proper indexing, foreign keys, and normalized structure

All modules retrieve data from their respective data stores (D1-D9, D14-D15) and write audit entries to D8 for complete traceability and compliance.

**Reference/Lookup Tables Included:**
- `regions` - Philippines administrative regions
- `client_types` - Patient/client type classifications
- `faqs` - Frequently asked questions for health education
- All tables include proper indexing, foreign keys, and constraints for data integrity

---


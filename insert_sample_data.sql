-- =====================================================
-- Sample Data Insert Script for MyHubCares
-- =====================================================
-- This script inserts:
-- 1. A sample facility
-- 2. Users with different roles
-- 3. Sample patient data
-- 4. Sample patient identifiers, risk scores, and documents
-- =====================================================

-- First, insert a facility (required for foreign keys)
INSERT INTO facilities (
    facility_id,
    facility_name,
    facility_type,
    address,
    region_id,
    contact_person,
    contact_number,
    email,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'MyHubCares Main Facility',
    'main',
    '{"street": "123 Healthcare St", "city": "Manila", "province": "Metro Manila", "zip_code": "1000"}',
    1,
    'Admin Office',
    '+63-2-1234-5678',
    'main@myhubcares.com',
    TRUE,
    NOW(),
    NOW()
);

-- =====================================================
-- USER INSERTS
-- =====================================================

-- Admin User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin',
    'admin@myhubcares.com',
    '$2b$10$y.8OIKHZgCeiQiugZ.zG/uh2KMlKm43mW0MQD0bZhV4s83chdJEJm', -- admin123
    'System Administrator',
    'admin',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6789',
    NOW(),
    NOW()
);

-- Physician User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'physician',
    'physician@myhubcares.com',
    '$2b$10$ofhNZLH1Fz0Ifa3MXDszw.mmdF.//52oSfNwBnmAqPFugn2U4.oXy', -- doc123
    'Dr. Juan Dela Cruz',
    'physician',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6790',
    NOW(),
    NOW()
);

-- Nurse User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'nurse',
    'nurse@myhubcares.com',
    '$2b$10$BYMKMtPXH6J1jAPGZIcGN.hKRkV5jjUEePcqYnscOvdE99gpn1jn.', -- nurse123
    'Maria Santos',
    'nurse',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6791',
    NOW(),
    NOW()
);

-- Case Manager User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'case_manager',
    'casemanager@myhubcares.com',
    '$2b$10$jTwo7uslBQw3H7IIExQhy.AcOr9/WoEKbCYESggVsRnAQ2458UXD6', -- case123
    'Pedro Garcia',
    'case_manager',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6792',
    NOW(),
    NOW()
);

-- Lab Personnel User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555',
    'lab_personnel',
    'lab@myhubcares.com',
    '$2b$10$r9sKBgkbSVBEcyKsjhjhUupcIrmWooCUDkVokj.GVvbuRd9ZcD/uu', -- lab123
    'Ana Rodriguez',
    'lab_personnel',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6793',
    NOW(),
    NOW()
);

-- Patient User
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    status,
    facility_id,
    phone,
    created_at,
    updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    'patient',
    'patient@myhubcares.com',
    '$2b$10$fOHLfsU/xrmSwXWJygw3luHwaj4GO90abp.Kzcp.EPPDuBHqfeJCi', -- pat123
    'Jose Reyes',
    'patient',
    'active',
    '550e8400-e29b-41d4-a716-446655440000',
    '+63-912-345-6794',
    NOW(),
    NOW()
);

-- =====================================================
-- PATIENT INSERTS
-- =====================================================

-- Sample Patient 1
INSERT INTO patients (
    patient_id,
    uic,
    philhealth_no,
    first_name,
    middle_name,
    last_name,
    suffix,
    birth_date,
    sex,
    civil_status,
    nationality,
    current_city,
    current_province,
    current_address,
    contact_phone,
    email,
    mother_name,
    father_name,
    birth_order,
    facility_id,
    arpa_risk_score,
    arpa_last_calculated,
    status,
    created_at,
    created_by
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'MARJOS01-15-1990',
    'PH123456789',
    'Jose',
    'Maria',
    'Reyes',
    NULL,
    '1990-01-15',
    'M',
    'Single',
    'Filipino',
    'Manila',
    'Metro Manila',
    '{"street": "456 Patient Ave", "barangay": "Barangay 1", "city": "Manila", "province": "Metro Manila", "zip_code": "1001"}',
    '+63-912-345-6794',
    'patient@myhubcares.com',
    'Maria Reyes',
    'Jose Reyes Sr.',
    1,
    '550e8400-e29b-41d4-a716-446655440000',
    25.50,
    '2025-01-15',
    'active',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
);

-- Sample Patient 2
INSERT INTO patients (
    patient_id,
    uic,
    philhealth_no,
    first_name,
    middle_name,
    last_name,
    suffix,
    birth_date,
    sex,
    civil_status,
    nationality,
    current_city,
    current_province,
    current_address,
    contact_phone,
    email,
    mother_name,
    father_name,
    birth_order,
    facility_id,
    arpa_risk_score,
    arpa_last_calculated,
    status,
    created_at,
    created_by
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'ANPED02-20-1985',
    'PH987654321',
    'Maria',
    'Cruz',
    'Santos',
    NULL,
    '1985-02-20',
    'F',
    'Married',
    'Filipino',
    'Quezon City',
    'Metro Manila',
    '{"street": "789 Health Blvd", "barangay": "Barangay 2", "city": "Quezon City", "province": "Metro Manila", "zip_code": "1100"}',
    '+63-912-345-6795',
    'maria.santos@example.com',
    'Ana Santos',
    'Pedro Santos',
    2,
    '550e8400-e29b-41d4-a716-446655440000',
    18.75,
    '2025-01-10',
    'active',
    NOW(),
    '22222222-2222-2222-2222-222222222222'
);

-- Sample Patient 3
INSERT INTO patients (
    patient_id,
    uic,
    philhealth_no,
    first_name,
    middle_name,
    last_name,
    suffix,
    birth_date,
    sex,
    civil_status,
    nationality,
    current_city,
    current_province,
    current_address,
    contact_phone,
    email,
    mother_name,
    father_name,
    birth_order,
    facility_id,
    arpa_risk_score,
    arpa_last_calculated,
    status,
    created_at,
    created_by
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'ROJUA01-10-1992',
    'PH456789123',
    'Juan',
    'Carlos',
    'Dela Cruz',
    'Jr.',
    '1992-10-10',
    'M',
    'Single',
    'Filipino',
    'Makati',
    'Metro Manila',
    '{"street": "321 Care Street", "barangay": "Barangay 3", "city": "Makati", "province": "Metro Manila", "zip_code": "1200"}',
    '+63-912-345-6796',
    'juan.delacruz@example.com',
    'Rosa Dela Cruz',
    'Juan Dela Cruz Sr.',
    1,
    '550e8400-e29b-41d4-a716-446655440000',
    32.25,
    '2025-01-20',
    'active',
    NOW(),
    '33333333-3333-3333-3333-333333333333'
);

-- =====================================================
-- PATIENT IDENTIFIERS INSERTS
-- =====================================================

-- Patient 1 Identifiers
INSERT INTO patient_identifiers (
    identifier_id,
    patient_id,
    id_type,
    id_value,
    issued_at,
    expires_at,
    verified
) VALUES (
    'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'sss',
    '34-1234567-8',
    '2010-01-15',
    NULL,
    TRUE
),
(
    'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiij',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'tin',
    '123-456-789-000',
    '2012-05-20',
    NULL,
    TRUE
);

-- Patient 2 Identifiers
INSERT INTO patient_identifiers (
    identifier_id,
    patient_id,
    id_type,
    id_value,
    issued_at,
    expires_at,
    verified
) VALUES (
    'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'passport',
    'P12345678',
    '2015-03-10',
    '2025-03-10',
    TRUE
),
(
    'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjk',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'sss',
    '34-9876543-2',
    '2008-06-15',
    NULL,
    TRUE
);

-- Patient 3 Identifiers
INSERT INTO patient_identifiers (
    identifier_id,
    patient_id,
    id_type,
    id_value,
    issued_at,
    expires_at,
    verified
) VALUES (
    'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'driver_license',
    'DL-123456789',
    '2018-11-05',
    '2028-11-05',
    TRUE
);

-- =====================================================
-- PATIENT RISK SCORES INSERTS
-- =====================================================

-- Patient 1 Risk Scores
INSERT INTO patient_risk_scores (
    risk_score_id,
    patient_id,
    score,
    calculated_on,
    risk_factors,
    recommendations,
    calculated_by
) VALUES (
    'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    25.50,
    '2025-01-15',
    '{"age": 35, "adherence_rate": 85, "cd4_count": 450, "viral_load": 200, "comorbidities": ["hypertension"]}',
    'Continue current ART regimen. Monitor blood pressure regularly. Schedule follow-up in 3 months.',
    '22222222-2222-2222-2222-222222222222'
),
(
    'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrs',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    23.75,
    '2024-12-15',
    '{"age": 35, "adherence_rate": 88, "cd4_count": 420, "viral_load": 150, "comorbidities": ["hypertension"]}',
    'Good adherence. Continue monitoring.',
    '22222222-2222-2222-2222-222222222222'
);

-- Patient 2 Risk Scores
INSERT INTO patient_risk_scores (
    risk_score_id,
    patient_id,
    score,
    calculated_on,
    risk_factors,
    recommendations,
    calculated_by
) VALUES (
    'ssssssss-ssss-ssss-ssss-ssssssssssss',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    18.75,
    '2025-01-10',
    '{"age": 40, "adherence_rate": 95, "cd4_count": 600, "viral_load": 50, "comorbidities": []}',
    'Excellent adherence and health status. Continue current treatment plan.',
    '22222222-2222-2222-2222-222222222222'
);

-- Patient 3 Risk Scores
INSERT INTO patient_risk_scores (
    risk_score_id,
    patient_id,
    score,
    calculated_on,
    risk_factors,
    recommendations,
    calculated_by
) VALUES (
    'tttttttt-tttt-tttt-tttt-tttttttttttt',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    32.25,
    '2025-01-20',
    '{"age": 32, "adherence_rate": 70, "cd4_count": 350, "viral_load": 500, "comorbidities": ["diabetes"]}',
    'Adherence needs improvement. Provide additional counseling. Monitor blood glucose levels. Schedule follow-up in 1 month.',
    '22222222-2222-2222-2222-222222222222'
);

-- =====================================================
-- PATIENT DOCUMENTS INSERTS
-- =====================================================

-- Patient 1 Documents
INSERT INTO patient_documents (
    document_id,
    patient_id,
    document_type,
    file_name,
    file_path,
    file_size,
    mime_type,
    uploaded_at,
    uploaded_by
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'consent',
    'informed_consent_jose_reyes.pdf',
    '/documents/patients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/informed_consent_jose_reyes.pdf',
    245760,
    'application/pdf',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddde',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'id_copy',
    'sss_id_jose_reyes.jpg',
    '/documents/patients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/sss_id_jose_reyes.jpg',
    512000,
    'image/jpeg',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddf',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'lab_result',
    'lab_results_2025_01_15.pdf',
    '/documents/patients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/lab_results_2025_01_15.pdf',
    1024000,
    'application/pdf',
    NOW(),
    '55555555-5555-5555-5555-555555555555'
);

-- Patient 2 Documents
INSERT INTO patient_documents (
    document_id,
    patient_id,
    document_type,
    file_name,
    file_path,
    file_size,
    mime_type,
    uploaded_at,
    uploaded_by
) VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'consent',
    'informed_consent_maria_santos.pdf',
    '/documents/patients/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/informed_consent_maria_santos.pdf',
    256000,
    'application/pdf',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'medical_record',
    'medical_history_maria_santos.pdf',
    '/documents/patients/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/medical_history_maria_santos.pdf',
    1536000,
    'application/pdf',
    NOW(),
    '22222222-2222-2222-2222-222222222222'
);

-- Patient 3 Documents
INSERT INTO patient_documents (
    document_id,
    patient_id,
    document_type,
    file_name,
    file_path,
    file_size,
    mime_type,
    uploaded_at,
    uploaded_by
) VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'consent',
    'informed_consent_juan_delacruz.pdf',
    '/documents/patients/cccccccc-cccc-cccc-cccc-cccccccccccc/informed_consent_juan_delacruz.pdf',
    240000,
    'application/pdf',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
),
(
    'ffffffff-ffff-ffff-ffff-fffffffffff0',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'id_copy',
    'drivers_license_juan_delacruz.jpg',
    '/documents/patients/cccccccc-cccc-cccc-cccc-cccccccccccc/drivers_license_juan_delacruz.jpg',
    480000,
    'image/jpeg',
    NOW(),
    '11111111-1111-1111-1111-111111111111'
);

-- =====================================================
-- ROLES INSERTS
-- =====================================================

INSERT INTO roles (
    role_id,
    role_code,
    role_name,
    description,
    is_system_role,
    created_at
) VALUES
('role-0000-0000-0000-000000000001', 'admin', 'Administrator', 'System administrator with full access to all features and settings', TRUE, NOW()),
('role-0000-0000-0000-000000000002', 'physician', 'Physician', 'Medical doctor with access to patient records, prescriptions, and clinical visits', TRUE, NOW()),
('role-0000-0000-0000-000000000003', 'nurse', 'Nurse', 'Nursing staff with access to patient care, appointments, and clinical documentation', TRUE, NOW()),
('role-0000-0000-0000-000000000004', 'case_manager', 'Case Manager', 'Case manager with access to patient coordination, referrals, and counseling', TRUE, NOW()),
('role-0000-0000-0000-000000000005', 'lab_personnel', 'Lab Personnel', 'Laboratory staff with access to lab tests and inventory management', TRUE, NOW()),
('role-0000-0000-0000-000000000006', 'patient', 'Patient', 'Patient with access to their own records, appointments, and profile', TRUE, NOW());

-- =====================================================
-- PERMISSIONS INSERTS
-- =====================================================

-- Patient Management Permissions
INSERT INTO permissions (
    permission_id,
    permission_code,
    permission_name,
    module,
    action,
    description
) VALUES
('perm-0000-0000-0000-000000000001', 'patient.create', 'Create Patient', 'Patients', 'create', 'Create new patient records'),
('perm-0000-0000-0000-000000000002', 'patient.read', 'View Patient', 'Patients', 'read', 'View patient records and information'),
('perm-0000-0000-0000-000000000003', 'patient.update', 'Update Patient', 'Patients', 'update', 'Update patient records and information'),
('perm-0000-0000-0000-000000000004', 'patient.delete', 'Delete Patient', 'Patients', 'delete', 'Delete patient records'),

-- User Management Permissions
('perm-0000-0000-0000-000000000005', 'user.create', 'Create User', 'Users', 'create', 'Create new user accounts'),
('perm-0000-0000-0000-000000000006', 'user.read', 'View User', 'Users', 'read', 'View user accounts and information'),
('perm-0000-0000-0000-000000000007', 'user.update', 'Update User', 'Users', 'update', 'Update user accounts and information'),
('perm-0000-0000-0000-000000000008', 'user.delete', 'Delete User', 'Users', 'delete', 'Delete user accounts'),

-- Clinical Visit Permissions
('perm-0000-0000-0000-000000000009', 'clinical_visit.create', 'Create Clinical Visit', 'Clinical Visits', 'create', 'Create new clinical visit records'),
('perm-0000-0000-0000-000000000010', 'clinical_visit.read', 'View Clinical Visit', 'Clinical Visits', 'read', 'View clinical visit records'),
('perm-0000-0000-0000-000000000011', 'clinical_visit.update', 'Update Clinical Visit', 'Clinical Visits', 'update', 'Update clinical visit records'),
('perm-0000-0000-0000-000000000012', 'clinical_visit.delete', 'Delete Clinical Visit', 'Clinical Visits', 'delete', 'Delete clinical visit records'),

-- Prescription Permissions
('perm-0000-0000-0000-000000000013', 'prescription.create', 'Create Prescription', 'Prescriptions', 'create', 'Create new prescriptions'),
('perm-0000-0000-0000-000000000014', 'prescription.read', 'View Prescription', 'Prescriptions', 'read', 'View prescription records'),
('perm-0000-0000-0000-000000000015', 'prescription.update', 'Update Prescription', 'Prescriptions', 'update', 'Update prescription records'),
('perm-0000-0000-0000-000000000016', 'prescription.delete', 'Delete Prescription', 'Prescriptions', 'delete', 'Delete prescription records'),

-- Appointment Permissions
('perm-0000-0000-0000-000000000017', 'appointment.create', 'Create Appointment', 'Appointments', 'create', 'Create new appointments'),
('perm-0000-0000-0000-000000000018', 'appointment.read', 'View Appointment', 'Appointments', 'read', 'View appointment records'),
('perm-0000-0000-0000-000000000019', 'appointment.update', 'Update Appointment', 'Appointments', 'update', 'Update appointment records'),
('perm-0000-0000-0000-000000000020', 'appointment.delete', 'Delete Appointment', 'Appointments', 'delete', 'Delete appointment records'),

-- Lab Test Permissions
('perm-0000-0000-0000-000000000021', 'lab_test.create', 'Create Lab Test', 'Lab Tests', 'create', 'Create new lab test records'),
('perm-0000-0000-0000-000000000022', 'lab_test.read', 'View Lab Test', 'Lab Tests', 'read', 'View lab test records'),
('perm-0000-0000-0000-000000000023', 'lab_test.update', 'Update Lab Test', 'Lab Tests', 'update', 'Update lab test records'),
('perm-0000-0000-0000-000000000024', 'lab_test.delete', 'Delete Lab Test', 'Lab Tests', 'delete', 'Delete lab test records'),

-- Inventory Permissions
('perm-0000-0000-0000-000000000025', 'inventory.create', 'Create Inventory', 'Inventory', 'create', 'Create new inventory items'),
('perm-0000-0000-0000-000000000026', 'inventory.read', 'View Inventory', 'Inventory', 'read', 'View inventory records'),
('perm-0000-0000-0000-000000000027', 'inventory.update', 'Update Inventory', 'Inventory', 'update', 'Update inventory records'),
('perm-0000-0000-0000-000000000028', 'inventory.delete', 'Delete Inventory', 'Inventory', 'delete', 'Delete inventory records'),

-- Facility Management Permissions
('perm-0000-0000-0000-000000000029', 'facility.create', 'Create Facility', 'Facilities', 'create', 'Create new facilities'),
('perm-0000-0000-0000-000000000030', 'facility.read', 'View Facility', 'Facilities', 'read', 'View facility records'),
('perm-0000-0000-0000-000000000031', 'facility.update', 'Update Facility', 'Facilities', 'update', 'Update facility records'),
('perm-0000-0000-0000-000000000032', 'facility.delete', 'Delete Facility', 'Facilities', 'delete', 'Delete facility records'),

-- Role & Permission Management Permissions
('perm-0000-0000-0000-000000000033', 'role.create', 'Create Role', 'Roles', 'create', 'Create new roles'),
('perm-0000-0000-0000-000000000034', 'role.read', 'View Role', 'Roles', 'read', 'View role records'),
('perm-0000-0000-0000-000000000035', 'role.update', 'Update Role', 'Roles', 'update', 'Update role records'),
('perm-0000-0000-0000-000000000036', 'role.delete', 'Delete Role', 'Roles', 'delete', 'Delete role records'),
('perm-0000-0000-0000-000000000037', 'permission.manage', 'Manage Permissions', 'Permissions', 'manage', 'Manage permissions and role assignments'),

-- Reports & Analytics Permissions
('perm-0000-0000-0000-000000000038', 'report.view', 'View Reports', 'Reports', 'read', 'View system reports and analytics'),
('perm-0000-0000-0000-000000000039', 'report.export', 'Export Reports', 'Reports', 'export', 'Export reports and data');

-- =====================================================
-- ROLE PERMISSIONS INSERTS
-- =====================================================

-- Admin Role - All Permissions (39 permissions total)
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-admin-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000001', NOW()),
('rp-admin-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000002', NOW()),
('rp-admin-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000003', NOW()),
('rp-admin-0001-0001-0001-000000000004', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000004', NOW()),
('rp-admin-0001-0001-0001-000000000005', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000005', NOW()),
('rp-admin-0001-0001-0001-000000000006', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000006', NOW()),
('rp-admin-0001-0001-0001-000000000007', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000007', NOW()),
('rp-admin-0001-0001-0001-000000000008', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000008', NOW()),
('rp-admin-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000009', NOW()),
('rp-admin-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000010', NOW()),
('rp-admin-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000011', NOW()),
('rp-admin-0001-0001-0001-000000000012', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000012', NOW()),
('rp-admin-0001-0001-0001-000000000013', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000013', NOW()),
('rp-admin-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000014', NOW()),
('rp-admin-0001-0001-0001-000000000015', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000015', NOW()),
('rp-admin-0001-0001-0001-000000000016', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000016', NOW()),
('rp-admin-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000017', NOW()),
('rp-admin-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000018', NOW()),
('rp-admin-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000019', NOW()),
('rp-admin-0001-0001-0001-000000000020', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000020', NOW()),
('rp-admin-0001-0001-0001-000000000021', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000021', NOW()),
('rp-admin-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000022', NOW()),
('rp-admin-0001-0001-0001-000000000023', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000023', NOW()),
('rp-admin-0001-0001-0001-000000000024', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000024', NOW()),
('rp-admin-0001-0001-0001-000000000025', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000025', NOW()),
('rp-admin-0001-0001-0001-000000000026', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000026', NOW()),
('rp-admin-0001-0001-0001-000000000027', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000027', NOW()),
('rp-admin-0001-0001-0001-000000000028', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000028', NOW()),
('rp-admin-0001-0001-0001-000000000029', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000029', NOW()),
('rp-admin-0001-0001-0001-000000000030', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000030', NOW()),
('rp-admin-0001-0001-0001-000000000031', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000031', NOW()),
('rp-admin-0001-0001-0001-000000000032', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000032', NOW()),
('rp-admin-0001-0001-0001-000000000033', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000033', NOW()),
('rp-admin-0001-0001-0001-000000000034', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000034', NOW()),
('rp-admin-0001-0001-0001-000000000035', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000035', NOW()),
('rp-admin-0001-0001-0001-000000000036', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000036', NOW()),
('rp-admin-0001-0001-0001-000000000037', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000037', NOW()),
('rp-admin-0001-0001-0001-000000000038', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000038', NOW()),
('rp-admin-0001-0001-0001-000000000039', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000039', NOW());

-- Physician Role Permissions
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-phys-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000001', NOW()), -- patient.create
('rp-phys-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000002', NOW()), -- patient.read
('rp-phys-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000003', NOW()), -- patient.update
('rp-phys-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000009', NOW()), -- clinical_visit.create
('rp-phys-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000010', NOW()), -- clinical_visit.read
('rp-phys-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000011', NOW()), -- clinical_visit.update
('rp-phys-0001-0001-0001-000000000013', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000013', NOW()), -- prescription.create
('rp-phys-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000014', NOW()), -- prescription.read
('rp-phys-0001-0001-0001-000000000015', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000015', NOW()), -- prescription.update
('rp-phys-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000017', NOW()), -- appointment.create
('rp-phys-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000018', NOW()), -- appointment.read
('rp-phys-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000019', NOW()), -- appointment.update
('rp-phys-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000022', NOW()), -- lab_test.read
('rp-phys-0001-0001-0001-000000000038', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000038', NOW()); -- report.view

-- Nurse Role Permissions
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-nurs-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000002', NOW()), -- patient.read
('rp-nurs-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000003', NOW()), -- patient.update
('rp-nurs-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000009', NOW()), -- clinical_visit.create
('rp-nurs-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000010', NOW()), -- clinical_visit.read
('rp-nurs-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000011', NOW()), -- clinical_visit.update
('rp-nurs-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000014', NOW()), -- prescription.read
('rp-nurs-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000017', NOW()), -- appointment.create
('rp-nurs-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000018', NOW()), -- appointment.read
('rp-nurs-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000019', NOW()), -- appointment.update
('rp-nurs-0001-0001-0001-000000000021', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000021', NOW()), -- lab_test.create
('rp-nurs-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000022', NOW()), -- lab_test.read
('rp-nurs-0001-0001-0001-000000000023', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000023', NOW()), -- lab_test.update
('rp-nurs-0001-0001-0001-000000000026', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000026', NOW()), -- inventory.read
('rp-nurs-0001-0001-0001-000000000027', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000027', NOW()); -- inventory.update

-- Case Manager Role Permissions
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-case-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000002', NOW()), -- patient.read
('rp-case-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000003', NOW()), -- patient.update
('rp-case-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000010', NOW()), -- clinical_visit.read
('rp-case-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000018', NOW()), -- appointment.read
('rp-case-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000019', NOW()); -- appointment.update

-- Lab Personnel Role Permissions
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-labp-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000021', NOW()), -- lab_test.create
('rp-labp-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000022', NOW()), -- lab_test.read
('rp-labp-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000023', NOW()), -- lab_test.update
('rp-labp-0001-0001-0001-000000000004', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000026', NOW()), -- inventory.read
('rp-labp-0001-0001-0001-000000000005', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000027', NOW()); -- inventory.update

-- Patient Role Permissions
INSERT INTO role_permissions (role_permission_id, role_id, permission_id, granted_at) VALUES
('rp-pat-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000002', NOW()), -- patient.read (own record)
('rp-pat-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000018', NOW()), -- appointment.read
('rp-pat-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000022', NOW()); -- lab_test.read (own tests)

-- =====================================================
-- USER ROLES INSERTS
-- =====================================================

-- Assign roles to users
INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_at, assigned_by) VALUES
('ur-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'role-0000-0000-0000-000000000001', NOW(), '11111111-1111-1111-1111-111111111111'), -- admin -> admin role
('ur-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'role-0000-0000-0000-000000000002', NOW(), '11111111-1111-1111-1111-111111111111'), -- physician -> physician role
('ur-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'role-0000-0000-0000-000000000003', NOW(), '11111111-1111-1111-1111-111111111111'), -- nurse -> nurse role
('ur-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'role-0000-0000-0000-000000000004', NOW(), '11111111-1111-1111-1111-111111111111'), -- case_manager -> case_manager role
('ur-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'role-0000-0000-0000-000000000005', NOW(), '11111111-1111-1111-1111-111111111111'), -- lab_personnel -> lab_personnel role
('ur-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111'); -- patient -> patient role

-- =====================================================
-- END OF SAMPLE DATA INSERT
-- =====================================================
-- Note: All passwords are hashed using bcrypt with 10 salt rounds
-- Password hashes correspond to:
-- admin: admin123
-- physician: doc123
-- nurse: nurse123
-- case_manager: case123
-- lab_personnel: lab123
-- patient: pat123
-- =====================================================


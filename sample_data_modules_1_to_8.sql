-- =====================================================
-- SAMPLE DATABASE FOR MODULES 1-8
-- MyHubCares Healthcare Management System
-- =====================================================
-- This file contains sample data for testing and development
-- All IDs use fixed UUIDs for consistency
-- IMPORTANT: Execute in order - dependencies are critical
-- =====================================================

-- =====================================================
-- STEP 1: FACILITIES (MOST IMPORTANT - Everything depends on this)
-- =====================================================

-- Insert Facility (if not exists) - Using pattern from myhub (3).sql
INSERT INTO `facilities` (`facility_id`, `facility_name`, `facility_type`, `address`, `region_id`, `contact_person`, `contact_number`, `email`, `is_active`, `created_at`, `updated_at`) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'MyHubCares Main Facility', 'main', '{"street": "123 Healthcare St", "city": "Manila", "province": "Metro Manila", "zip_code": "1000"}', 1, 'Admin Office', '+63-2-1234-5678', 'main@myhubcares.com', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE facility_name=facility_name;

-- Set facility_id variable for use in subsequent inserts
SET @facility_id = '550e8400-e29b-41d4-a716-446655440000';

-- =====================================================
-- STEP 2: ROLES (Users depend on roles)
-- =====================================================
-- MODULE 1: USER AUTHENTICATION & AUTHORIZATION

-- Insert Roles (if not exists) - Using pattern from myhub (3).sql
INSERT INTO `roles` (`role_id`, `role_code`, `role_name`, `description`, `is_system_role`, `created_at`) VALUES
('role-0000-0000-0000-000000000001', 'admin', 'Administrator', 'System administrator with full access to all features and settings', 1, NOW()),
('role-0000-0000-0000-000000000002', 'physician', 'Physician', 'Medical doctor with access to patient records, prescriptions, and clinical visits', 1, NOW()),
('role-0000-0000-0000-000000000003', 'case_manager', 'Case Manager', 'Case manager with access to patient coordination, referrals, and counseling', 1, NOW()),
('role-0000-0000-0000-000000000004', 'lab_personnel', 'Lab Personnel', 'Laboratory staff with access to lab tests and inventory management', 1, NOW()),
('role-0000-0000-0000-000000000005', 'nurse', 'Nurse', 'Nursing staff with access to patient care, appointments, and clinical documentation', 1, NOW()),
('role-0000-0000-0000-000000000006', 'patient', 'Patient', 'Patient with access to their own records, appointments, and profile', 1, NOW())
ON DUPLICATE KEY UPDATE role_name=role_name;

-- =====================================================
-- STEP 3: USERS (Patients depend on users for created_by)
-- =====================================================

-- Insert Users (matching the structure from myhub (3).sql)
-- Passwords: admin=admin123, physician=doc123, nurse=nurse123, lab_personnel=lab123, case_manager=case123, patient=patient123
INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `full_name`, `role`, `status`, `facility_id`, `phone`, `last_login`, `failed_login_attempts`, `locked_until`, `mfa_enabled`, `created_at`, `updated_at`, `created_by`) VALUES
-- 1 Admin (password: admin123)
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@myhubcares.com', '$2b$10$ATI7yjxDSVPCK62I9yVgTOyBZcpRLsherSOuvACaYqW/Q5HyITpha', 'System Administrator', 'admin', 'active', @facility_id, '+63-912-345-6789', NULL, 0, NULL, 0, NOW(), NOW(), NULL),

-- 2 Physicians (password: doc123)
('22222222-2222-2222-2222-222222222222', 'dr.smith', 'dr.smith@myhubcares.com', '$2b$10$w4NLe8ZsRHUQl1C57QVc4OVFzrv7i0bYecW5S6SX9sCmYya9KnTb.', 'Dr. John Smith', 'physician', 'active', @facility_id, '+63-912-345-6790', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333333', 'dr.jones', 'dr.jones@myhubcares.com', '$2b$10$w4NLe8ZsRHUQl1C57QVc4OVFzrv7i0bYecW5S6SX9sCmYya9KnTb.', 'Dr. Sarah Jones', 'physician', 'active', @facility_id, '+63-912-345-6791', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),

-- 2 Case Managers (password: case123)
('44444444-4444-4444-4444-444444444444', 'case.martin', 'case.martin@myhubcares.com', '$2b$10$7yM6WL4pOc0sb44GGTuftOsa9Etg2iU8ag2qxUAGwhIAiROYX4Shy', 'Maria Martin', 'case_manager', 'active', @facility_id, '+63-912-345-6792', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('55555555-5555-5555-5555-555555555555', 'case.wilson', 'case.wilson@myhubcares.com', '$2b$10$7yM6WL4pOc0sb44GGTuftOsa9Etg2iU8ag2qxUAGwhIAiROYX4Shy', 'Robert Wilson', 'case_manager', 'active', @facility_id, '+63-912-345-6793', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),

-- 2 Lab Personnel (password: lab123)
('66666666-6666-6666-6666-666666666666', 'lab.brown', 'lab.brown@myhubcares.com', '$2b$10$DYTQNcnGSQa2RFYRC/4TNOhSqln8ZcuWYHJ3mUEnrDc858pAbV1wa', 'Jennifer Brown', 'lab_personnel', 'active', @facility_id, '+63-912-345-6794', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('77777777-7777-7777-7777-777777777777', 'lab.davis', 'lab.davis@myhubcares.com', '$2b$10$DYTQNcnGSQa2RFYRC/4TNOhSqln8ZcuWYHJ3mUEnrDc858pAbV1wa', 'Michael Davis', 'lab_personnel', 'active', @facility_id, '+63-912-345-6795', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),

-- 2 Nurses (password: nurse123)
('88888888-8888-8888-8888-888888888888', 'nurse.taylor', 'nurse.taylor@myhubcares.com', '$2b$10$l3sw85wlVK0xhpojhRd56Oi8zyEQIxfq7hHnG.ohR.gWKsP9MEq..', 'Emily Taylor', 'nurse', 'active', @facility_id, '+63-912-345-6796', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('99999999-9999-9999-9999-999999999999', 'nurse.anderson', 'nurse.anderson@myhubcares.com', '$2b$10$l3sw85wlVK0xhpojhRd56Oi8zyEQIxfq7hHnG.ohR.gWKsP9MEq..', 'David Anderson', 'nurse', 'active', @facility_id, '+63-912-345-6797', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),

-- 5 Patients (password: patient123 for all)
('10000000-0000-0000-0000-000000000001', 'john.doe', 'john.doe@email.com', '$2b$10$nqTgb1tL71xLpmoowutiHeBF7e.lIza8UGx9tb/k2vbDq2ledbRxG', 'John Doe', 'patient', 'active', @facility_id, '+63-912-345-7001', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000000-0000-0000-0000-000000000002', 'jane.smith', 'jane.smith@email.com', '$2b$10$nqTgb1tL71xLpmoowutiHeBF7e.lIza8UGx9tb/k2vbDq2ledbRxG', 'Jane Smith', 'patient', 'active', @facility_id, '+63-912-345-7002', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000000-0000-0000-0000-000000000003', 'michael.johnson', 'michael.j@email.com', '$2b$10$nqTgb1tL71xLpmoowutiHeBF7e.lIza8UGx9tb/k2vbDq2ledbRxG', 'Michael Johnson', 'patient', 'active', @facility_id, '+63-912-345-7003', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000000-0000-0000-0000-000000000004', 'sarah.williams', 'sarah.w@email.com', '$2b$10$nqTgb1tL71xLpmoowutiHeBF7e.lIza8UGx9tb/k2vbDq2ledbRxG', 'Sarah Williams', 'patient', 'active', @facility_id, '+63-912-345-7004', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000000-0000-0000-0000-000000000005', 'david.brown', 'david.b@email.com', '$2b$10$nqTgb1tL71xLpmoowutiHeBF7e.lIza8UGx9tb/k2vbDq2ledbRxG', 'David Brown', 'patient', 'active', @facility_id, '+63-912-345-7005', NULL, 0, NULL, 0, NOW(), NOW(), '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY UPDATE full_name=full_name;

-- Assign Roles to Users - Using pattern from myhub (3).sql
INSERT INTO `user_roles` (`user_role_id`, `user_id`, `role_id`, `assigned_at`, `assigned_by`) VALUES
-- Admin
('ur-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'role-0000-0000-0000-000000000001', NOW(), '11111111-1111-1111-1111-111111111111'),

-- Physicians
('ur-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'role-0000-0000-0000-000000000002', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'role-0000-0000-0000-000000000002', NOW(), '11111111-1111-1111-1111-111111111111'),

-- Case Managers
('ur-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'role-0000-0000-0000-000000000003', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'role-0000-0000-0000-000000000003', NOW(), '11111111-1111-1111-1111-111111111111'),

-- Lab Personnel
('ur-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'role-0000-0000-0000-000000000004', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777', 'role-0000-0000-0000-000000000004', NOW(), '11111111-1111-1111-1111-111111111111'),

-- Nurses
('ur-0000-0000-0000-000000000008', '88888888-8888-8888-8888-888888888888', 'role-0000-0000-0000-000000000005', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000009', '99999999-9999-9999-9999-999999999999', 'role-0000-0000-0000-000000000005', NOW(), '11111111-1111-1111-1111-111111111111'),

-- Patients
('ur-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000004', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', 'role-0000-0000-0000-000000000006', NOW(), '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY UPDATE user_id=user_id;

-- =====================================================
-- STEP 4: PATIENTS (Everything else depends on patients)
-- =====================================================
-- MODULE 2: PATIENT MANAGEMENT

-- Insert 5 Patients - Using numeric-only IDs (matching actual table structure)
-- UIC format: MotherFirst2Letters + FatherFirst2Letters + BirthOrder + BirthDate (MM-DD-YYYY)
INSERT INTO `patients` (`patient_id`, `uic`, `first_name`, `middle_name`, `last_name`, `suffix`, `birth_date`, `sex`, `civil_status`, `nationality`, `current_city`, `current_province`, `current_address`, `contact_phone`, `email`, `mother_name`, `father_name`, `birth_order`, `facility_id`, `arpa_risk_score`, `arpa_last_calculated`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
('10000001-0000-0000-0000-000000000001', 'MADO01-05-1985', 'John', NULL, 'Doe', NULL, '1985-05-15', 'M', 'Single', 'Filipino', 'Manila', 'Metro Manila', '{"street":"123 Main St","city":"Manila","province":"Metro Manila","zip":"1000"}', '+63-912-345-7001', 'john.doe@email.com', 'Maria Doe', 'David Doe', 1, @facility_id, 35.5, CURDATE(), 'active', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000001-0000-0000-0000-000000000002', 'SMSM01-08-1990', 'Jane', NULL, 'Smith', NULL, '1990-08-22', 'F', 'Single', 'Filipino', 'Quezon City', 'Metro Manila', '{"street":"456 Oak Ave","city":"Quezon City","province":"Metro Manila","zip":"1100"}', '+63-912-345-7002', 'jane.smith@email.com', 'Sarah Smith', 'Michael Smith', 1, @facility_id, 42.3, CURDATE(), 'active', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000001-0000-0000-0000-000000000003', 'ROJO01-12-1978', 'Michael', NULL, 'Johnson', NULL, '1978-12-10', 'M', 'Married', 'Filipino', 'Makati', 'Metro Manila', '{"street":"789 Pine Rd","city":"Makati","province":"Metro Manila","zip":"1200"}', '+63-912-345-7003', 'michael.j@email.com', 'Rose Johnson', 'Robert Johnson', 1, @facility_id, 28.7, CURDATE(), 'active', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000001-0000-0000-0000-000000000004', 'ELWI01-03-1992', 'Sarah', NULL, 'Williams', NULL, '1992-03-25', 'F', 'Single', 'Filipino', 'Pasig', 'Metro Manila', '{"street":"321 Elm St","city":"Pasig","province":"Metro Manila","zip":"1600"}', '+63-912-345-7004', 'sarah.w@email.com', 'Elizabeth Williams', 'Edward Williams', 1, @facility_id, 55.2, CURDATE(), 'active', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
('10000001-0000-0000-0000-000000000005', 'ANBR01-07-1988', 'David', NULL, 'Brown', NULL, '1988-07-18', 'M', 'Single', 'Filipino', 'Taguig', 'Metro Manila', '{"street":"654 Maple Dr","city":"Taguig","province":"Metro Manila","zip":"1630"}', '+63-912-345-7005', 'david.b@email.com', 'Anna Brown', 'Andrew Brown', 1, @facility_id, 38.9, CURDATE(), 'active', NOW(), NOW(), '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY UPDATE first_name=first_name;

-- ARPA Risk Scores (Module 2) - Using numeric-only IDs (matching actual table structure)
INSERT INTO `patient_risk_scores` (`risk_score_id`, `patient_id`, `score`, `calculated_on`, `risk_factors`, `recommendations`, `calculated_by`) VALUES
('30000000-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 35.50, CURDATE(), '{"missed_appointments":2,"low_adherence":true}', 'Improve medication adherence, schedule follow-up', '22222222-2222-2222-2222-222222222222'),
('30000000-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 42.30, CURDATE(), '{"critical_lab_values":1,"missed_visits":1}', 'Review lab results, schedule appointment', '33333333-3333-3333-3333-333333333333'),
('30000000-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000004', 55.20, CURDATE(), '{"high_risk_score":true,"multiple_medications":true}', 'Close monitoring required, frequent check-ups', '22222222-2222-2222-2222-222222222222')
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- =====================================================
-- MODULE 4: MEDICATION MANAGEMENT
-- =====================================================

-- Medications
INSERT INTO `medications` (`medication_id`, `medication_name`, `generic_name`, `medication_type`, `dosage_form`, `strength`, `unit`, `is_active`, `created_at`) VALUES
('med1med1-med1-med1-med1-med1med1med1', 'Tenofovir/Lamivudine', 'Tenofovir Disoproxil Fumarate/Lamivudine', 'antiretroviral', 'tablet', '300/300', 'mg', 1, NOW()),
('med2med2-med2-med2-med2-med2med2med2', 'Efavirenz', 'Efavirenz', 'antiretroviral', 'tablet', '600', 'mg', 1, NOW()),
('med3med3-med3-med3-med3-med3med3med3', 'Dolutegravir', 'Dolutegravir', 'antiretroviral', 'tablet', '50', 'mg', 1, NOW()),
('med4med4-med4-med4-med4-med4med4med4', 'Atazanavir', 'Atazanavir Sulfate', 'antiretroviral', 'capsule', '300', 'mg', 1, NOW()),
('med5med5-med5-med5-med5-med5med5med5', 'Paracetamol', 'Acetaminophen', 'analgesic', 'tablet', '500', 'mg', 1, NOW())
ON DUPLICATE KEY UPDATE medication_name=medication_name;

-- Medication Inventory
INSERT INTO `medication_inventory` (`inventory_id`, `medication_id`, `facility_id`, `quantity_on_hand`, `reorder_level`, `expiry_date`, `batch_number`, `last_updated`, `updated_by`) VALUES
('inv1inv1-inv1-inv1-inv1-inv1inv1inv1', 'med1med1-med1-med1-med1-med1med1med1', @facility_id, 500, 100, '2026-12-31', 'BATCH001', NOW(), '11111111-1111-1111-1111-111111111111'),
('inv2inv2-inv2-inv2-inv2-inv2inv2inv2', 'med2med2-med2-med2-med2-med2med2med2', @facility_id, 250, 50, '2026-11-30', 'BATCH002', NOW(), '11111111-1111-1111-1111-111111111111'),
('inv3inv3-inv3-inv3-inv3-inv3inv3inv3', 'med3med3-med3-med3-med3-med3med3med3', @facility_id, 750, 150, '2027-01-15', 'BATCH003', NOW(), '11111111-1111-1111-1111-111111111111'),
('inv4inv4-inv4-inv4-inv4-inv4inv4inv4', 'med5med5-med5-med5-med5-med5med5med5', @facility_id, 80, 20, '2026-10-20', 'BATCH004', NOW(), '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY UPDATE medication_id=medication_id;

-- Prescriptions
INSERT INTO `prescriptions` (`prescription_id`, `patient_id`, `prescribed_by`, `facility_id`, `prescription_date`, `status`, `notes`, `created_at`, `updated_at`) VALUES
('pr1pr1pr1-pr1p-pr1p-pr1p-pr1pr1pr1pr1', '10000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', @facility_id, CURDATE(), 'active', 'Initial ART regimen', NOW(), NOW()),
('pr2pr2pr2-pr2p-pr2p-pr2p-pr2pr2pr2pr2', '10000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', @facility_id, CURDATE(), 'active', 'Follow-up prescription', NOW(), NOW()),
('pr3pr3pr3-pr3p-pr3p-pr3p-pr3pr3pr3pr3', '10000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'completed', 'Completed course', NOW(), NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- Prescription Items
INSERT INTO `prescription_items` (`item_id`, `prescription_id`, `medication_id`, `dosage`, `frequency`, `duration_days`, `quantity`, `instructions`) VALUES
('pi1pi1pi1-pi1p-pi1p-pi1p-pi1pi1pi1pi1', 'pr1pr1pr1-pr1p-pr1p-pr1p-pr1pr1pr1pr1', 'med1med1-med1-med1-med1-med1med1med1', '1 tablet', 'once daily', 30, 30, 'Take with food'),
('pi2pi2pi2-pi2p-pi2p-pi2p-pi2pi2pi2pi2', 'pr1pr1pr1-pr1p-pr1p-pr1p-pr1pr1pr1pr1', 'med2med2-med2-med2-med2-med2med2med2', '1 tablet', 'once daily', 30, 30, 'Take at bedtime'),
('pi3pi3pi3-pi3p-pi3p-pi3p-pi3pi3pi3pi3', 'pr2pr2pr2-pr2p-pr2p-pr2p-pr2pr2pr2pr2', 'med3med3-med3-med3-med3-med3med3med3', '1 tablet', 'once daily', 30, 30, 'Take with or without food')
ON DUPLICATE KEY UPDATE prescription_id=prescription_id;

-- Medication Reminders
INSERT INTO `medication_reminders` (`reminder_id`, `prescription_item_id`, `patient_id`, `medication_id`, `reminder_time`, `frequency`, `sound_preference`, `browser_notifications`, `special_instructions`, `active`, `created_at`) VALUES
('mr1mr1mr1-mr1m-mr1m-mr1m-mr1mr1mr1mr1', 'pi1pi1pi1-pi1p-pi1p-pi1p-pi1pi1pi1pi1', '10000001-0000-0000-0000-000000000001', 'med1med1-med1-med1-med1-med1med1med1', '08:00:00', 'daily', 'gentle', 1, 'Take with breakfast', 1, NOW()),
('mr2mr2mr2-mr2m-mr2m-mr2m-mr2mr2mr2mr2', 'pi2pi2pi2-pi2p-pi2p-pi2p-pi2pi2pi2pi2', '10000001-0000-0000-0000-000000000001', 'med2med2-med2-med2-med2-med2med2med2', '22:00:00', 'daily', 'standard', 1, 'Take at bedtime', 1, NOW())
ON DUPLICATE KEY UPDATE reminder_id=reminder_id;

-- Medication Adherence
INSERT INTO `medication_adherence` (`adherence_id`, `patient_id`, `medication_id`, `prescription_item_id`, `recorded_at`, `taken`, `adherence_percentage`, `notes`, `recorded_by`) VALUES
('ma1ma1ma1-ma1m-ma1m-ma1m-ma1ma1ma1ma1', '10000001-0000-0000-0000-000000000001', 'med1med1-med1-med1-med1-med1med1med1', 'pi1pi1pi1-pi1p-pi1p-pi1p-pi1pi1pi1pi1', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 95.0, 'Taken on time', '10000001-0000-0000-0000-000000000001'),
('ma2ma2ma2-ma2m-ma2m-ma2m-ma2ma2ma2ma2', '10000001-0000-0000-0000-000000000001', 'med2med2-med2-med2-med2-med2med2med2', 'pi2pi2pi2-pi2p-pi2p-pi2p-pi2pi2pi2pi2', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 90.0, 'Taken as scheduled', '10000001-0000-0000-0000-000000000001'),
('ma3ma3ma3-ma3m-ma3m-ma3m-ma3ma3ma3ma3', '10000001-0000-0000-0000-000000000002', 'med3med3-med3-med3-med3-med3med3med3', 'pi3pi3pi3-pi3p-pi3p-pi3p-pi3pi3pi3pi3', DATE_SUB(NOW(), INTERVAL 2 DAY), 1, 88.5, 'Good adherence', '10000001-0000-0000-0000-000000000002')
ON DUPLICATE KEY UPDATE adherence_id=adherence_id;

-- =====================================================
-- MODULE 5: LAB TEST MANAGEMENT
-- =====================================================

-- Lab Orders
INSERT INTO `lab_orders` (`order_id`, `patient_id`, `ordering_provider_id`, `facility_id`, `order_date`, `status`, `priority`, `clinical_indication`, `created_at`) VALUES
('lo1lo1lo1-lo1l-lo1l-lo1l-lo1lo1lo1lo1', '10000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'completed', 'routine', 'Routine monitoring', NOW()),
('lo2lo2lo2-lo2l-lo2l-lo2l-lo2lo2lo2lo2', '10000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', @facility_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'completed', 'urgent', 'Suspected infection', NOW()),
('lo3lo3lo3-lo3l-lo3l-lo3l-lo3lo3lo3lo3', '10000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', @facility_id, CURDATE(), 'pending', 'routine', 'Follow-up test', NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- Lab Results
INSERT INTO `lab_results` (`result_id`, `order_id`, `test_name`, `test_code`, `result_value`, `unit`, `reference_range_min`, `reference_range_max`, `is_critical`, `critical_alert_sent`, `result_date`, `reported_by`, `created_at`) VALUES
('lr1lr1lr1-lr1l-lr1l-lr1l-lr1lr1lr1lr1', 'lo1lo1lo1-lo1l-lo1l-lo1l-lo1lo1lo1lo1', 'CD4 Count', 'CD4', '450', 'cells/mm³', '500', '1200', 0, 0, DATE_SUB(CURDATE(), INTERVAL 4 DAY), '66666666-6666-6666-6666-666666666666', NOW()),
('lr2lr2lr2-lr2l-lr2l-lr2l-lr2lr2lr2lr2', 'lo1lo1lo1-lo1l-lo1l-lo1l-lo1lo1lo1lo1', 'Viral Load', 'VL', '<20', 'copies/mL', '0', '20', 0, 0, DATE_SUB(CURDATE(), INTERVAL 4 DAY), '66666666-6666-6666-6666-666666666666', NOW()),
('lr3lr3lr3-lr3l-lr3l-lr3l-lr3lr3lr3lr3', 'lo2lo2lo2-lo2l-lo2l-lo2l-lo2lo2lo2lo2', 'Hemoglobin', 'HGB', '8.5', 'g/dL', '12.0', '16.0', 1, 1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '77777777-7777-7777-7777-777777777777', NOW())
ON DUPLICATE KEY UPDATE order_id=order_id;

-- Lab Files
INSERT INTO `lab_files` (`file_id`, `result_id`, `file_name`, `file_path`, `file_type`, `file_size`, `uploaded_by`, `uploaded_at`) VALUES
('lf1lf1lf1-lf1l-lf1l-lf1l-lf1lf1lf1lf1', 'lr1lr1lr1-lr1l-lr1l-lr1l-lr1lr1lr1lr1', 'CD4_Report.pdf', '/lab_files/lr1lr1lr1-cd4.pdf', 'application/pdf', 156789, '66666666-6666-6666-6666-666666666666', NOW()),
('lf2lf2lf2-lf2l-lf2l-lf2l-lf2lf2lf2lf2', 'lr2lr2lr2-lr2l-lr2l-lr2l-lr2lr2lr2lr2', 'ViralLoad_Report.pdf', '/lab_files/lr2lr2lr2-vl.pdf', 'application/pdf', 134567, '66666666-6666-6666-6666-666666666666', NOW())
ON DUPLICATE KEY UPDATE result_id=result_id;

-- =====================================================
-- MODULE 6: APPOINTMENT SCHEDULING
-- =====================================================

-- Availability Slots
INSERT INTO `availability_slots` (`slot_id`, `provider_id`, `facility_id`, `slot_date`, `start_time`, `end_time`, `is_available`, `created_at`) VALUES
('as1as1as1-as1a-as1a-as1a-as1as1as1as1', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '09:30:00', 0, NOW()),
('as2as2as2-as2a-as2a-as2a-as2as2as2as2', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '10:30:00', 1, NOW()),
('as3as3as3-as3a-as3a-as3a-as3as3as3as3', '33333333-3333-3333-3333-333333333333', @facility_id, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '14:30:00', 0, NOW())
ON DUPLICATE KEY UPDATE provider_id=provider_id;

-- Appointments
INSERT INTO `appointments` (`appointment_id`, `patient_id`, `provider_id`, `facility_id`, `scheduled_start`, `scheduled_end`, `appointment_type`, `status`, `reason`, `notes`, `created_at`, `updated_at`) VALUES
('ap1ap1ap1-ap1a-ap1a-ap1a-ap1ap1ap1ap1', '10000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'follow_up', 'scheduled', 'Routine check-up', 'Patient doing well', NOW(), NOW()),
('ap2ap2ap2-ap2a-ap2a-ap2a-ap2ap2ap2ap2', '10000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', @facility_id, DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'consultation', 'scheduled', 'Lab results review', 'Review critical lab values', NOW(), NOW()),
('ap3ap3ap3-ap3a-ap3a-ap3a-ap3ap3ap3ap3', '10000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'follow_up', 'completed', 'Post-treatment check', 'Treatment successful', NOW(), NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- Appointment Reminders
INSERT INTO `appointment_reminders` (`reminder_id`, `appointment_id`, `reminder_type`, `scheduled_time`, `status`, `sent_at`, `created_at`) VALUES
('ar1ar1ar1-ar1a-ar1a-ar1a-ar1ar1ar1ar1', 'ap1ap1ap1-ap1a-ap1a-ap1a-ap1ap1ap1ap1', 'in_app', DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL -1 DAY), 'pending', NULL, NOW()),
('ar2ar2ar2-ar2a-ar2a-ar2a-ar2ar2ar2ar2', 'ap1ap1ap1-ap1a-ap1a-ap1a-ap1ap1ap1ap1', 'sms', DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL -1 DAY), 'pending', NULL, NOW()),
('ar3ar3ar3-ar3a-ar3a-ar3a-ar3ar3ar3ar3', 'ap2ap2ap2-ap2a-ap2a-ap2a-ap2ap2ap2ap2', 'email', DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 2 DAY), INTERVAL -1 DAY), 'pending', NULL, NOW())
ON DUPLICATE KEY UPDATE appointment_id=appointment_id;

-- =====================================================
-- MODULE 7: CARE COORDINATION & REFERRALS
-- =====================================================

-- Referrals
INSERT INTO `referrals` (`referral_id`, `patient_id`, `from_facility_id`, `to_facility_id`, `referral_reason`, `urgency`, `status`, `clinical_notes`, `referred_by`, `referred_at`, `created_at`) VALUES
('ref1ref1-ref1-ref1-ref1-ref1ref1ref1', '10000001-0000-0000-0000-000000000004', @facility_id, @facility_id, 'Specialist consultation required', 'routine', 'pending', 'Patient needs cardiology consultation', '44444444-4444-4444-4444-444444444444', NOW(), NOW()),
('ref2ref2-ref2-ref2-ref2-ref2ref2ref2', '10000001-0000-0000-0000-000000000005', @facility_id, @facility_id, 'Emergency care needed', 'emergency', 'accepted', 'Urgent care required', '44444444-4444-4444-4444-444444444444', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- Counseling Sessions
INSERT INTO `counseling_sessions` (`session_id`, `patient_id`, `counselor_id`, `facility_id`, `session_date`, `session_type`, `session_notes`, `follow_up_required`, `follow_up_date`, `follow_up_reason`, `created_at`) VALUES
('cs1cs1cs1-cs1c-cs1c-cs1c-cs1cs1cs1cs1', '10000001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', @facility_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'adherence', 'Discussed medication adherence strategies', 1, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Follow-up on adherence improvement', NOW()),
('cs2cs2cs2-cs2c-cs2c-cs2c-cs2cs2cs2cs2', '10000001-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', @facility_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'mental_health', 'Mental health support session', 0, NULL, NULL, NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- HTS Sessions
INSERT INTO `hts_sessions` (`hts_id`, `patient_id`, `tester_id`, `facility_id`, `test_date`, `test_result`, `test_type`, `pre_test_counseling`, `post_test_counseling`, `linked_to_care`, `care_link_date`, `notes`, `created_at`) VALUES
('ht1ht1ht1-ht1h-ht1h-ht1h-ht1ht1ht1ht1', '10000001-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', @facility_id, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'positive', 'Rapid Test', 1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Patient linked to care immediately', NOW()),
('ht2ht2ht2-ht2h-ht2h-ht2h-ht2ht2ht2ht2', '10000001-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', @facility_id, DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'negative', 'Rapid Test', 1, 1, 0, NULL, 'Negative result, no linkage needed', NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- Care Tasks
INSERT INTO `care_tasks` (`task_id`, `referral_id`, `patient_id`, `assignee_id`, `task_type`, `task_description`, `due_date`, `status`, `completed_at`, `created_by`, `created_at`) VALUES
('ct1ct1ct1-ct1c-ct1c-ct1c-ct1ct1ct1ct1', 'ref1ref1-ref1-ref1-ref1-ref1ref1ref1', '10000001-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'referral', 'Follow up on referral from facility to facility', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'pending', NULL, '44444444-4444-4444-4444-444444444444', NOW()),
('ct2ct2ct2-ct2c-ct2c-ct2c-ct2ct2ct2ct2', NULL, '10000001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'follow_up', 'Follow-up counseling session for adherence', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'pending', NULL, '44444444-4444-4444-4444-444444444444', NOW()),
('ct3ct3ct3-ct3c-ct3c-ct3c-ct3ct3ct3ct3', NULL, '10000001-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', 'appointment', 'Schedule lab results review appointment', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'in_progress', NULL, '33333333-3333-3333-3333-333333333333', NOW())
ON DUPLICATE KEY UPDATE task_id=task_id;

-- =====================================================
-- MODULE 8: REPORTING & ANALYTICS
-- =====================================================

-- Report Queries
INSERT INTO `report_queries` (`report_id`, `report_name`, `report_description`, `report_type`, `query_definition`, `parameters`, `schedule`, `owner_id`, `is_public`, `created_at`) VALUES
('rq1rq1rq1-rq1r-rq1r-rq1r-rq1rq1rq1rq1', 'Patient Statistics Report', 'Monthly patient enrollment and demographics report', 'patient', '{"type":"patient","standard":true}', '{"facility_id":null,"date_from":null,"date_to":null}', NULL, '11111111-1111-1111-1111-111111111111', 1, NOW()),
('rq2rq2rq2-rq2r-rq2r-rq2r-rq2rq2rq2rq2', 'Adherence Report', 'Medication adherence statistics and trends', 'clinical', '{"type":"adherence","standard":true}', '{"facility_id":null,"date_from":null,"date_to":null}', '0 0 1 * *', '22222222-2222-2222-2222-222222222222', 1, NOW()),
('rq3rq3rq3-rq3r-rq3r-rq3r-rq3rq3rq3rq3', 'Inventory Report', 'Medication inventory levels and stock status', 'inventory', '{"type":"inventory","standard":true}', '{"facility_id":null}', NULL, '11111111-1111-1111-1111-111111111111', 0, NOW())
ON DUPLICATE KEY UPDATE report_name=report_name;

-- Report Runs
INSERT INTO `report_runs` (`run_id`, `report_id`, `started_at`, `finished_at`, `status`, `parameters_used`, `output_ref`, `error_message`, `run_by`) VALUES
('rr1rr1rr1-rr1r-rr1r-rr1r-rr1rr1rr1rr1', 'rq1rq1rq1-rq1r-rq1r-rq1r-rq1rq1rq1rq1', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'completed', '{"facility_id":null,"date_from":"2025-01-01","date_to":"2025-01-31"}', '{"total_patients":5,"male_count":3,"female_count":2}', NULL, '11111111-1111-1111-1111-111111111111'),
('rr2rr2rr2-rr2r-rr2r-rr2r-rr2rr2rr2rr2', 'rq2rq2rq2-rq2r-rq2r-rq2r-rq2rq2rq2rq2', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'completed', '{"facility_id":null,"date_from":"2025-01-01","date_to":"2025-01-31"}', '{"avg_adherence":91.17,"total_records":3}', NULL, '22222222-2222-2222-2222-222222222222')
ON DUPLICATE KEY UPDATE report_id=report_id;

-- Dashboard Cache
INSERT INTO `dashboard_cache` (`cache_id`, `widget_id`, `parameters`, `cached_data`, `cached_at`, `expires_at`) VALUES
('dc1dc1dc1-dc1d-dc1d-dc1d-dc1dc1dc1dc1', 'patient_stats', '{"facility_id":null}', '{"total_patients":5,"total_visits":3,"total_prescriptions":3}', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
('dc2dc2dc2-dc2d-dc2d-dc2d-dc2dc2dc2dc2', 'adherence_trends', '{"months":6}', '{"data":[{"name":"2025-01","value":91.17}]}', NOW(), DATE_ADD(NOW(), INTERVAL 12 HOUR))
ON DUPLICATE KEY UPDATE widget_id=widget_id;

-- =====================================================
-- ADDITIONAL DATA FOR COMPLETENESS
-- =====================================================

-- Clinical Visits (for Module 3 - referenced in ARPA)
INSERT INTO `clinical_visits` (`visit_id`, `patient_id`, `provider_id`, `facility_id`, `visit_date`, `visit_type`, `who_stage`, `chief_complaint`, `clinical_notes`, `assessment`, `plan`, `follow_up_date`, `follow_up_reason`, `created_at`, `updated_at`) VALUES
('cv1cv1cv1-cv1c-cv1c-cv1c-cv1cv1cv1cv1', '10000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', @facility_id, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'follow_up', 'Stage 1', 'Routine check-up', 'Patient is stable', 'Good progress', 'Continue current treatment', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Next routine visit', NOW(), NOW()),
('cv2cv2cv2-cv2c-cv2c-cv2c-cv2cv2cv2cv2', '10000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', @facility_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'consultation', 'Stage 2', 'Review lab results', 'Lab results show low hemoglobin', 'Anemia detected', 'Iron supplements prescribed', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Monitor hemoglobin levels', NOW(), NOW())
ON DUPLICATE KEY UPDATE patient_id=patient_id;

-- =====================================================
-- END OF SAMPLE DATA
-- =====================================================
-- LOGIN CREDENTIALS:
-- =====================================================
-- Admin:
--   Username: admin
--   Password: admin123
--
-- Physicians:
--   Username: dr.smith, dr.jones
--   Password: doc123
--
-- Case Managers:
--   Username: case.martin, case.wilson
--   Password: case123
--
-- Lab Personnel:
--   Username: lab.brown, lab.davis
--   Password: lab123
--
-- Nurses:
--   Username: nurse.taylor, nurse.anderson
--   Password: nurse123
--
-- Patients:
--   Username: john.doe, jane.smith, michael.johnson, sarah.williams, david.brown
--   Password: patient123 (for all 5 patients)
-- =====================================================


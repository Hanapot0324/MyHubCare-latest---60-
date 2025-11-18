-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 18, 2025 at 05:07 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `myhub`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `appointment_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `provider_id` char(36) DEFAULT NULL,
  `facility_id` char(36) NOT NULL,
  `appointment_type` enum('follow_up','art_pickup','lab_test','counseling','general','initial') NOT NULL,
  `scheduled_start` datetime NOT NULL,
  `scheduled_end` datetime NOT NULL,
  `duration_minutes` int(11) DEFAULT 30,
  `status` enum('scheduled','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'scheduled',
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `booked_by` char(36) DEFAULT NULL,
  `booked_at` datetime DEFAULT current_timestamp(),
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` char(36) DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`appointment_id`, `patient_id`, `provider_id`, `facility_id`, `appointment_type`, `scheduled_start`, `scheduled_end`, `duration_minutes`, `status`, `reason`, `notes`, `booked_by`, `booked_at`, `cancelled_at`, `cancelled_by`, `cancellation_reason`, `created_at`) VALUES
('aebc132a-b44b-4600-8c8f-516ec55f28da', '80f7668b-3d92-42d0-a75c-eb4873fcc8c4', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'initial', '2025-11-20 10:00:00', '2025-11-20 10:30:00', 30, 'confirmed', NULL, NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', '2025-11-19 00:01:08', NULL, NULL, NULL, '2025-11-19 00:01:08');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_reminders`
--

CREATE TABLE `appointment_reminders` (
  `reminder_id` char(36) NOT NULL,
  `appointment_id` char(36) NOT NULL,
  `reminder_type` enum('sms','email','push','in_app') NOT NULL,
  `reminder_sent_at` datetime DEFAULT NULL,
  `reminder_scheduled_at` datetime NOT NULL,
  `status` enum('pending','sent','failed','cancelled') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_reminders`
--

INSERT INTO `appointment_reminders` (`reminder_id`, `appointment_id`, `reminder_type`, `reminder_sent_at`, `reminder_scheduled_at`, `status`, `created_at`) VALUES
('2436d97c-3c8f-49d6-bce5-ca6722c5d038', '1d158955-a429-416c-95f4-8029225ca3b5', 'in_app', NULL, '2025-11-18 10:00:00', 'pending', '2025-11-18 23:07:22'),
('2d734233-966d-41c4-9b27-7bdaa0491d25', '952fa5c0-05c3-43f2-9d14-6236f057304b', 'in_app', NULL, '2025-11-18 12:00:00', 'pending', '2025-11-18 23:14:34');

-- --------------------------------------------------------

--
-- Table structure for table `art_regimens`
--

CREATE TABLE `art_regimens` (
  `regimen_id` char(36) NOT NULL,
  `regimen_name` varchar(150) NOT NULL,
  `regimen_code` varchar(50) DEFAULT NULL,
  `line` enum('first_line','second_line','third_line','other') DEFAULT 'first_line',
  `components` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`components`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `audit_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `user_name` varchar(200) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT','PRINT','DOWNLOAD') NOT NULL,
  `module` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` char(36) DEFAULT NULL,
  `record_id` varchar(50) DEFAULT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  `change_summary` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `device_type` enum('Desktop','Mobile','Tablet') DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('success','failed','error') DEFAULT 'success',
  `error_message` text DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_log`
--

INSERT INTO `audit_log` (`audit_id`, `user_id`, `user_name`, `user_role`, `action`, `module`, `entity_type`, `entity_id`, `record_id`, `old_value`, `new_value`, `change_summary`, `ip_address`, `device_type`, `user_agent`, `remarks`, `status`, `error_message`, `timestamp`, `created_at`) VALUES
('03392b26-44f2-4c1c-82ad-a6c9906a048c', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:20:18', '2025-11-16 12:20:18'),
('06b72584-f0f3-45de-8080-64494af02a96', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:21:37', '2025-11-17 19:21:37'),
('06fdf698-d108-408d-93c4-436d33ae4e0b', '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'Trixie Morales', 'physician', 'LOGIN', 'Authentication', 'user', '42356bf7-84ef-4aaa-9610-d74b65c3929f', '42356bf7-84ef-4aaa-9610-d74b65c3929f', NULL, NULL, 'Successful login: Trixie', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:13:26', '2025-11-17 19:13:26'),
('0f91e41c-ed44-46f0-a635-a144f4fdfda7', '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'Trixie Morales', 'patient', 'CREATE', 'Patients', 'patient', '2fe2674f-5147-4d96-8c68-54caa67efcfc', '2fe2674f-5147-4d96-8c68-54caa67efcfc', NULL, '{\"patient_id\":\"2fe2674f-5147-4d96-8c68-54caa67efcfc\",\"uic\":\"GRJO0110-05-2002\",\"first_name\":\"Trixie\",\"last_name\":\"Morales\",\"email\":\"hannasarabia879@gmail.com\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\"}', 'New patient registered: Trixie Morales (UIC: GRJO0110-05-2002)', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:14:27', '2025-11-17 16:14:27'),
('0fa830d3-03c7-413e-b0c0-2fc646d2dbd7', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Column \'dosage\' cannot be null', '2025-11-16 14:10:22', '2025-11-16 14:10:22'),
('1036bd54-5528-4981-9f91-6890893a68e8', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:08:07', '2025-11-17 16:08:07'),
('1242239c-0124-41ce-b5b8-deebb9065a79', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'DELETE', 'Lab Orders', 'lab_order', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', '{\"order_id\":\"e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"ordering_provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"order_date\":\"2025-11-15T16:00:00.000Z\",\"test_panel\":\"Viral Load\",\"priority\":\"urgent\",\"status\":\"in_progress\",\"collection_date\":\"2025-11-15T16:00:00.000Z\",\"notes\":null,\"created_at\":\"2025-11-16T13:35:53.000Z\"}', NULL, 'Cancelled lab order: Viral Load', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:26:31', '2025-11-17 12:26:31'),
('181deffe-ea95-49d2-9955-27cf682a0f0a', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:30:32', '2025-11-16 12:30:32'),
('18779159-aca4-4b0f-a2f4-76b61f81f173', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:33:08', '2025-11-17 19:33:08'),
('1eaf72bc-b94a-447a-8c25-1bdf4783ea9a', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:22:20', '2025-11-16 14:22:20'),
('25fda9ed-7c0a-4a8c-b468-966e35f3b01d', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '062cea3c-ff0c-44a5-9879-ec40b501b375', '062cea3c-ff0c-44a5-9879-ec40b501b375', '{\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"visit_date\":\"2025-11-15T16:00:00.000Z\",\"visit_type\":\"emergency\",\"who_stage\":\"Stage 1\",\"chief_complaint\":\"Fever and body weakness for 2 days\",\"clinical_notes\":\"Patient presented with mild fever, stable vitals.\",\"assessment\":\"Likely viral infection.\",\"plan\":\"Hydration and rest. Paracetamol 500mg every 6 hours.\",\"follow_up_date\":\"2025-11-29T16:00:00.000Z\",\"follow_up_reason\":\"ART refill and viral load test.\",\"created_at\":\"2025-11-16T04:47:06.000Z\",\"updated_at\":\"2025-11-16T04:47:06.000Z\"}', '{\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"visit_date\":\"2025-11-14T16:00:00.000Z\",\"visit_type\":\"emergency\",\"who_stage\":\"Stage 1\",\"chief_complaint\":\"Fever and body weakness for 2 days\",\"clinical_notes\":\"Patient presented with mild fever, stable vitals.\",\"assessment\":\"Likely viral infection.\",\"plan\":\"Hydration and rest. Paracetamol 500mg every 6 hours.\",\"follow_up_date\":\"2025-11-28T16:00:00.000Z\",\"follow_up_reason\":\"ART refill and viral load test.\",\"created_at\":\"2025-11-16T04:47:06.000Z\",\"updated_at\":\"2025-11-16T04:50:32.000Z\",\"patientName\":\"Jose Reyes\",\"providerName\":\"System Administrator\",\"facilityName\":\"MyHubCares Main Facility\",\"diagnoses\":[{\"diagnosis_id\":\"53b14af5-6f96-4a40-8749-00175687f846\",\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"icd10_code\":\"J11\",\"diagnosis_description\":\"Influenza due to unidentified influenza virus\",\"diagnosis_type\":\"primary\",\"is_chronic\":0,\"onset_date\":\"2025-01-08T16:00:00.000Z\",\"resolved_date\":\"1899-11-29T16:00:00.000Z\"}],\"procedures\":[]}', 'Updated clinical visit 062cea3c-ff0c-44a5-9879-ec40b501b375', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:50:33', '2025-11-16 12:50:33'),
('28ba0946-c233-4946-aaa8-ea516662b4f8', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Column \'dosage\' cannot be null', '2025-11-16 14:12:27', '2025-11-16 14:12:27'),
('2b681aa0-f806-4bcb-8236-9d3221310796', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-14T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":null,\"follow_up_reason\":\"dfsdfds\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T04:54:11.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-13T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":null,\"follow_up_reason\":\"dfsdfds\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T05:25:43.000Z\"}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 13:25:43', '2025-11-15 13:25:43'),
('2b8185ec-dbc6-4414-b62f-26aeac3990f5', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Lab Orders', 'lab_order', 'e3768174-a8b4-41f0-8579-83038959c1a5', 'e3768174-a8b4-41f0-8579-83038959c1a5', NULL, '{\"order_id\":\"e3768174-a8b4-41f0-8579-83038959c1a5\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"test_panel\":\"CD4 Count\",\"priority\":\"routine\",\"status\":\"ordered\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\"}', 'Created lab order: CD4 Count for patient aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:28:23', '2025-11-17 12:28:23'),
('2c416a0b-7001-4c92-8dce-292d193a4cbe', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-10T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-30T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:15:10.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-09T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-29T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:15:23.000Z\"}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 16:15:23', '2025-11-15 16:15:23'),
('2cfa287e-c446-48d8-8bc9-035773f59e8c', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', 'LOGIN', 'Authentication', 'user', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', NULL, NULL, 'Successful login: nurse', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:21:27', '2025-11-16 14:21:27'),
('2d133257-d73c-4be0-9d97-5f6ebb9dbaa6', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 13:53:40', '2025-11-17 13:53:40'),
('2d35cf9e-1a07-48b2-87d6-7814aa8986fb', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:53:46', '2025-11-16 12:53:46'),
('2dc5ffc1-0eb1-4108-b20f-6c4b9a2033f0', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', 'LOGIN', 'Authentication', 'user', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', NULL, NULL, 'Successful login: nurse', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:58:22', '2025-11-16 12:58:22'),
('2faf41a2-ae45-4048-9f51-a998773e1189', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:28:33', '2025-11-17 18:28:33'),
('301a1fe1-7c05-42f6-a9db-0fad7b7d21c0', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'LOGIN', 'Authentication', 'user', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', NULL, NULL, 'Successful login: hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 20:34:26', '2025-11-15 20:34:26'),
('30293c9a-e50a-43ab-9fd9-267a4b4a6044', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-12T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-11-01T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:09:16.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-11T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-31T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:14:51.000Z\"}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 16:14:51', '2025-11-15 16:14:51'),
('335e32c3-01d1-427a-90db-27dcbbfda2d9', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-16 12:47:44', '2025-11-16 12:47:44'),
('33bc12d2-c478-4a78-90ba-ee3e39c67525', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:33:23', '2025-11-17 15:33:23'),
('33ffb098-b117-49a7-876b-ff5beceb0f92', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Column \'dosage\' cannot be null', '2025-11-16 14:12:41', '2025-11-16 14:12:41'),
('3552ea11-9df7-4fc3-b06b-5a404df70bea', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"69c4d690-0433-4f6e-966a-efa5187c0537\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":1}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:22:19', '2025-11-16 14:22:19'),
('36dbc4d7-3571-4bf9-ad24-f1fb6bb4a03b', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"d21ee17d-42f9-41b4-8d7e-ca12065de34f\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":4}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:45:22', '2025-11-16 14:45:22'),
('37759c56-3f36-46fd-8e32-64dc5de3c2cd', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Failed login attempt: Invalid password for patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-17 15:31:19', '2025-11-17 15:31:19'),
('37a34eab-3619-499d-8d6b-133ccdaaf59c', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 14:16:40', '2025-11-17 14:16:40'),
('398a8f06-b2f9-4964-85b8-9e920d767e32', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 20:36:51', '2025-11-17 20:36:51'),
('3a49989a-ac38-4024-81be-1db23d52fc0f', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'CREATE', 'Roles', 'role_permission', '095503a3-1759-45fe-a1b8-6321cf916871', '095503a3-1759-45fe-a1b8-6321cf916871', NULL, '{\"role_id\":\"role-0000-0000-0000-000000000004\",\"permission_id\":\"perm-0000-0000-0000-000000000017\"}', 'Granted permission \"Create Appointment\" to role \"Case Manager\"', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:28:13', '2025-11-16 12:28:13'),
('404dc825-1145-4251-83b0-e847dc96a162', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:45:45', '2025-11-17 15:45:45'),
('41aa8586-5d13-4770-9f3d-8a92d3456e0f', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"4fe503a0-a9c0-4a4d-b3e5-8c199d274e07\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":12}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:40:56', '2025-11-16 14:40:56'),
('4225f2b2-ee60-4fc9-ae6a-dd9456df818a', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:01:46', '2025-11-16 12:01:46'),
('42dac1ab-8f66-4016-8abd-285c02ee3c04', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 14:40:42', '2025-11-17 14:40:42'),
('43a14cf0-539f-4d19-bc95-52129af08409', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '062cea3c-ff0c-44a5-9879-ec40b501b375', '062cea3c-ff0c-44a5-9879-ec40b501b375', '{\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"visit_date\":\"2025-11-14T16:00:00.000Z\",\"visit_type\":\"emergency\",\"who_stage\":\"Stage 1\",\"chief_complaint\":\"Fever and body weakness for 2 days\",\"clinical_notes\":\"Patient presented with mild fever, stable vitals.\",\"assessment\":\"Likely viral infection.\",\"plan\":\"Hydration and rest. Paracetamol 500mg every 6 hours.\",\"follow_up_date\":\"2025-11-28T16:00:00.000Z\",\"follow_up_reason\":\"ART refill and viral load test.\",\"created_at\":\"2025-11-16T04:47:06.000Z\",\"updated_at\":\"2025-11-16T04:50:32.000Z\"}', '{\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"visit_date\":\"2025-11-13T16:00:00.000Z\",\"visit_type\":\"emergency\",\"who_stage\":\"Stage 1\",\"chief_complaint\":\"Fever and body weakness for 2 days\",\"clinical_notes\":\"Patient presented with mild fever, stable vitals.\",\"assessment\":\"Likely viral infection.\",\"plan\":\"Hydration and rest. Paracetamol 500mg every 6 hours.\",\"follow_up_date\":\"2025-11-27T16:00:00.000Z\",\"follow_up_reason\":\"ART refill and viral load test.\",\"created_at\":\"2025-11-16T04:47:06.000Z\",\"updated_at\":\"2025-11-16T04:51:55.000Z\",\"patientName\":\"Jose Reyes\",\"providerName\":\"System Administrator\",\"facilityName\":\"MyHubCares Main Facility\",\"diagnoses\":[{\"diagnosis_id\":\"53b14af5-6f96-4a40-8749-00175687f846\",\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"icd10_code\":\"J11\",\"diagnosis_description\":\"Influenza due to unidentified influenza virus\",\"diagnosis_type\":\"primary\",\"is_chronic\":0,\"onset_date\":\"2025-01-07T16:00:00.000Z\",\"resolved_date\":\"1899-11-28T16:00:00.000Z\"}],\"procedures\":[{\"procedure_id\":\"4b7f8aef-abfc-42dc-beb5-580148c154a3\",\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"cpt_code\":\"71045\",\"procedure_name\":\"Chest X-ray\",\"procedure_description\":\"Standard PA chest radiograph performed.\",\"outcome\":\"No acute findings.\",\"performed_at\":\"2025-11-15T20:49:00.000Z\"}]}', 'Updated clinical visit 062cea3c-ff0c-44a5-9879-ec40b501b375', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:51:56', '2025-11-16 12:51:56'),
('4403476e-ef67-4257-a6a7-cb6a64dcf4a3', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 23:43:01', '2025-11-18 23:43:01'),
('458a7bac-5982-410e-bda5-a37e81b25924', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Failed login attempt: Invalid password for trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-15 20:33:38', '2025-11-15 20:33:38'),
('4601c975-c507-4da6-82ce-c99207844433', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:19:15', '2025-11-17 18:19:15'),
('49125105-a417-4bef-a0f2-6ff452301c75', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Failed login attempt: Invalid password for Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-18 23:42:55', '2025-11-18 23:42:55'),
('497c3459-149a-4283-91ea-f2ad8663fff3', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:20:02', '2025-11-17 16:20:02'),
('4aa4afce-3305-4232-a8d4-ffcfeb7c75f8', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:26:10', '2025-11-17 12:26:10'),
('4b8dfd04-2b6b-4120-bfab-cf0a8a7ec2f9', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:43:33', '2025-11-16 12:43:33'),
('4c1982eb-8306-4746-8c17-1fbafa7bf7bb', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"18b81369-0723-475c-848d-1e42635e36ee\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":10}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:16:37', '2025-11-16 14:16:37'),
('4e748478-17b5-48da-9a42-47148e04bc1a', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:30:41', '2025-11-17 16:30:41'),
('4ebc1e34-f406-4f54-bc56-cdf098611eac', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 15:25:07', '2025-11-16 15:25:07'),
('520cfe8d-ad8c-4f5e-90c2-c8e980d81703', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Failed login attempt: Invalid password for case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-17 18:10:00', '2025-11-17 18:10:00'),
('52389eeb-8fbf-46ff-ae8d-3a6a11fa97cc', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'CREATE', 'Prescriptions', 'prescription', 'ccf55302-ea8b-464c-92e7-883a5e32a008', 'ccf55302-ea8b-464c-92e7-883a5e32a008', NULL, '{\"prescription_id\":\"ccf55302-ea8b-464c-92e7-883a5e32a008\",\"prescription_number\":\"RX-20251116-0001\",\"patient_id\":\"7db2ecfb-e409-41f3-a632-b5db0d4f868b\",\"prescriber_id\":\"3fdb00a0-7774-40f1-96f6-7d4c179bcd93\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440002\",\"items\":[{\"prescription_item_id\":\"5d38050a-bb52-492a-85c2-d354ea909683\",\"medication_id\":\"65af6445-7630-4a2b-8851-d43fb66807ab\",\"quantity\":1}]}', 'Created prescription RX-20251116-0001 for patient Hanna Sarabia', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 11:38:14', '2025-11-16 11:38:14'),
('537a76b7-0785-4da4-9d93-0a5f26555a1d', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'CREATE', 'Inventory', 'medication_inventory', 'f8788bf9-153b-4599-b162-3daee7bd95cb', 'f8788bf9-153b-4599-b162-3daee7bd95cb', NULL, '{\"inventory_id\":\"f8788bf9-153b-4599-b162-3daee7bd95cb\",\"medication_id\":\"65af6445-7630-4a2b-8851-d43fb66807ab\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"quantity_on_hand\":200,\"reorder_level\":50,\"expiry_date\":\"2027-11-16\"}', 'Added inventory for Tenofovir/Lamivudine/Dolutegravir (TLD) at MyHubCares Main Facility', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:48:51', '2025-11-16 12:48:51'),
('553efd0d-d413-4929-9f3b-c18799f88b79', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 19:19:44', '2025-11-16 19:19:44'),
('55939095-e654-48ed-8755-62f03c1bdf68', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Lab Files', 'lab_file', '9573db2c-7c7c-4e96-9de9-eac49eaae743', '9573db2c-7c7c-4e96-9de9-eac49eaae743', NULL, '{\"file_id\":\"9573db2c-7c7c-4e96-9de9-eac49eaae743\",\"result_id\":\"d1cc561a-c533-4c17-bf09-4bc4d9841094\",\"file_name\":\"545832021_1689460425052578_6722400524695115105_n.jpg\",\"file_size\":165137}', 'Uploaded lab file: 545832021_1689460425052578_6722400524695115105_n.jpg for result d1cc561a-c533-4c17-bf09-4bc4d9841094', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:45:38', '2025-11-17 12:45:38'),
('55bdeda1-e1fd-4909-a892-6d278402e1d3', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 19:43:22', '2025-11-16 19:43:22'),
('5661fa51-3cc4-4507-91c0-a943dede75b8', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 13:07:24', '2025-11-17 13:07:24'),
('571ca2c8-2f4b-404c-a3e4-f91a009c917d', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'LOGIN', 'Authentication', 'user', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', NULL, NULL, 'Successful login: hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 11:38:49', '2025-11-16 11:38:49'),
('5915cf3e-2097-4025-b984-82b49d5f039a', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'CREATE', 'Prescriptions', 'prescription', '205431b9-bf40-49b5-a04a-77e9235a3904', '205431b9-bf40-49b5-a04a-77e9235a3904', NULL, '{\"prescription_id\":\"205431b9-bf40-49b5-a04a-77e9235a3904\",\"prescription_number\":\"RX-20251115-0001\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"prescriber_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440001\",\"items\":[{\"prescription_item_id\":\"7be959e1-8be5-483d-9bf4-1395fda900c1\",\"medication_id\":\"9117b66c-a29f-43cc-ac78-5724222f7a38\",\"quantity\":1}]}', 'Created prescription RX-20251115-0001 for patient Trixie Ann Morales', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 22:59:17', '2025-11-15 22:59:17'),
('5a050254-b639-4452-943b-4988bd2ed780', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Prescriptions', 'prescription', '69688306-fd70-41a5-8a71-9d41d0304072', '69688306-fd70-41a5-8a71-9d41d0304072', NULL, '{\"prescription_id\":\"69688306-fd70-41a5-8a71-9d41d0304072\",\"prescription_number\":\"RX-20251116-0002\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"prescriber_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"items\":[{\"prescription_item_id\":\"e527cebd-be4e-4e8e-a51a-405c5d3ddfaa\",\"medication_id\":\"65af6445-7630-4a2b-8851-d43fb66807ab\",\"quantity\":1}]}', 'Created prescription RX-20251116-0002 for patient Jose Reyes', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 16:07:16', '2025-11-16 16:07:16'),
('5b14854b-6516-41bd-ae93-82f7315f8c69', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:17:33', '2025-11-16 12:17:33'),
('5b62714d-48b6-4967-8e36-2a0794b80f17', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 23:52:41', '2025-11-18 23:52:41'),
('5f39893c-5331-4294-90ec-d0bcf7fb5ced', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:16:37', '2025-11-16 14:16:37'),
('61efd39a-e545-4766-ab23-65247e93f904', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-18 22:00:49', '2025-11-18 22:00:49'),
('64bfecb2-9418-4378-b456-298d16ee81bd', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:47:47', '2025-11-16 12:47:47'),
('66303ff4-a4fb-4791-8052-bf4c9a85a0ea', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:42:48', '2025-11-17 19:42:48'),
('668b5fd4-876b-4891-9042-c7641ebc9cc1', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:02:03', '2025-11-18 22:02:03'),
('670eba8e-54b8-4d8b-bb36-c09d1a110c26', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'CREATE', 'Patients', 'patient', '80f7668b-3d92-42d0-a75c-eb4873fcc8c4', '80f7668b-3d92-42d0-a75c-eb4873fcc8c4', NULL, '{\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"uic\":\"EDDE0106-01-2004\",\"first_name\":\"Hanna\",\"last_name\":\"Sarabia\",\"email\":\"sarabia.hanna.bsinfotech@gmail.com\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\"}', 'New patient registered: Hanna N. Sarabia (UIC: EDDE0106-01-2004)', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:07:51', '2025-11-17 16:07:51'),
('69b64f15-97a8-4986-b898-bd9de49911fe', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:37:00', '2025-11-17 16:37:00'),
('6c024807-b8ac-42c1-a523-628816157419', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"prescriber_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"items\":[{\"prescription_item_id\":\"73771305-0ea9-4194-9997-4795ac0307dd\",\"medication_id\":\"9117b66c-a29f-43cc-ac78-5724222f7a38\",\"quantity\":1}]}', 'Created prescription RX-20251116-0001 for patient Jose Reyes', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:55:04', '2025-11-16 12:55:04'),
('6c2a51ca-baa7-4781-855f-f33fa732b897', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 20:02:32', '2025-11-17 20:02:32'),
('6e840dbc-7c2d-446f-a002-86b06189a450', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Patients', 'patient', '169b7991-2e21-4f62-8672-f06f129a8cbb', '169b7991-2e21-4f62-8672-f06f129a8cbb', '{\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"uic\":\"UIC-1763091112707-842\",\"philhealth_no\":\"123456\",\"first_name\":\"Trixie Ann\",\"middle_name\":\"\",\"last_name\":\"Morales\",\"suffix\":\"\",\"birth_date\":\"1899-11-29T16:00:00.000Z\",\"sex\":\"F\",\"civil_status\":\"Single\",\"nationality\":\"Filipino\",\"current_city\":\"Sampaloc\",\"current_province\":\"METRO MANILA\",\"current_address\":\"{\\\"city\\\":\\\"Sampaloc\\\",\\\"province\\\":\\\"METRO MANILA\\\"}\",\"contact_phone\":\"0945-5116-175\",\"email\":\"morales.ta.bsifnotech@gmail.com\",\"mother_name\":null,\"father_name\":null,\"birth_order\":null,\"guardian_name\":null,\"guardian_relationship\":null,\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"arpa_risk_score\":null,\"arpa_last_calculated\":null,\"status\":\"active\",\"created_at\":\"2025-11-14T03:31:52.000Z\",\"updated_at\":\"2025-11-14T04:17:25.000Z\",\"created_by\":\"3fdb00a0-7774-40f1-96f6-7d4c179bcd93\"}', '{\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"uic\":\"UIC-1763091112707-842\",\"philhealth_no\":\"1234567\",\"first_name\":\"Trixie Ann\",\"middle_name\":\"\",\"last_name\":\"Morales\",\"suffix\":\"\",\"birth_date\":\"1899-11-29T16:00:00.000Z\",\"sex\":\"F\",\"civil_status\":\"Single\",\"nationality\":\"Filipino\",\"current_city\":\"Sampaloc\",\"current_province\":\"METRO MANILA\",\"current_address\":\"{\\\"city\\\":\\\"Sampaloc\\\",\\\"province\\\":\\\"METRO MANILA\\\"}\",\"contact_phone\":\"0945-5116-175\",\"email\":\"morales.ta.bsifnotech@gmail.com\",\"mother_name\":null,\"father_name\":null,\"birth_order\":null,\"guardian_name\":null,\"guardian_relationship\":null,\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"arpa_risk_score\":null,\"arpa_last_calculated\":null,\"status\":\"active\",\"created_at\":\"2025-11-14T03:31:52.000Z\",\"updated_at\":\"2025-11-15T05:19:44.000Z\",\"created_by\":\"3fdb00a0-7774-40f1-96f6-7d4c179bcd93\",\"facility_name\":\"MyHubCares Manila Branch\"}', 'Patient updated: Trixie Ann Morales (UIC: UIC-1763091112707-842)', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 13:19:44', '2025-11-15 13:19:44'),
('72351c2d-f44b-43ff-aa79-f1b540c41eb8', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:10:48', '2025-11-18 22:10:48'),
('74791808-b673-45dc-a063-c7de8bc2221b', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:28:39', '2025-11-17 15:28:39'),
('75350570-d24f-48b9-b3f4-b2f27e0ba549', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 20:00:10', '2025-11-17 20:00:10'),
('75764f4b-a028-4d08-9486-ac4e8147a961', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'DELETE', 'Lab Orders', 'lab_order', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', '{\"order_id\":\"e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"ordering_provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"order_date\":\"2025-11-15T16:00:00.000Z\",\"test_panel\":\"Viral Load\",\"priority\":\"urgent\",\"status\":\"cancelled\",\"collection_date\":\"2025-11-15T16:00:00.000Z\",\"notes\":null,\"created_at\":\"2025-11-16T13:35:53.000Z\"}', NULL, 'Cancelled lab order: Viral Load', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:26:38', '2025-11-17 12:26:38');
INSERT INTO `audit_log` (`audit_id`, `user_id`, `user_name`, `user_role`, `action`, `module`, `entity_type`, `entity_id`, `record_id`, `old_value`, `new_value`, `change_summary`, `ip_address`, `device_type`, `user_agent`, `remarks`, `status`, `error_message`, `timestamp`, `created_at`) VALUES
('764a6bfa-8299-4293-a42d-1aba8a6dad3a', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-18 22:24:24', '2025-11-18 22:24:24'),
('768ca261-dc97-4e0a-8db9-07ca018afdff', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-16 12:16:59', '2025-11-16 12:16:59'),
('7720828a-fda2-46e3-8637-171fd6c75a63', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:57:44', '2025-11-17 19:57:44'),
('7757b939-b10d-43dc-ad10-4dd0df001406', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:10:06', '2025-11-17 18:10:06'),
('780b95a8-72d1-416d-ad0f-4db7352318b8', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 20:03:21', '2025-11-17 20:03:21'),
('784b446f-400e-435e-828c-cf1eba79d181', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"869e38b5-9591-4f4d-8357-dcf2d6b13d84\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":1}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:41:25', '2025-11-16 14:41:25'),
('7884249d-7c92-45dd-95ca-25d8f5e3f820', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 16:06:23', '2025-11-16 16:06:23'),
('79ac7a83-e13e-4796-be95-6228b19997fc', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'CREATE', 'Lab Orders', 'lab_order', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', NULL, '{\"order_id\":\"e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"test_panel\":\"Viral Load\",\"priority\":\"urgent\",\"status\":\"in_progress\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\"}', 'Created lab order: Viral Load for patient aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 21:35:54', '2025-11-16 21:35:54'),
('7be9c16a-c030-4057-8e7f-03617b4816d4', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"ebb1908b-a668-42c7-9e21-b96b27df753f\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":1}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:21:58', '2025-11-16 14:21:58'),
('7dd0e51c-60ba-4f04-b8af-513d4aee0215', '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'Trixie Morales', 'physician', 'LOGIN', 'Authentication', 'user', '42356bf7-84ef-4aaa-9610-d74b65c3929f', '42356bf7-84ef-4aaa-9610-d74b65c3929f', NULL, NULL, 'Successful login: Trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:15:11', '2025-11-17 16:15:11'),
('8128e3bd-52e1-48bb-b7d9-e19e2036ddb7', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 21:30:11', '2025-11-16 21:30:11'),
('82573027-364a-4bd1-888a-0a796ef6767e', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 23:53:04', '2025-11-18 23:53:04'),
('84bfc3c5-bc6d-4fd8-9309-f5c2f41d4c3f', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 13:56:37', '2025-11-17 13:56:37'),
('86df236e-9b95-4e53-8811-3e2a7f62570c', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:37:16', '2025-11-17 19:37:16'),
('873123e6-5df7-4743-82a9-3556fc28af31', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 13:05:50', '2025-11-17 13:05:50'),
('87f8849b-01d1-48ff-9afb-bc52c4888260', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'CREATE', 'Inventory', 'medication_inventory', 'fcfefa31-7b0e-4e49-b11f-a11ef45c9694', 'fcfefa31-7b0e-4e49-b11f-a11ef45c9694', NULL, '{\"inventory_id\":\"fcfefa31-7b0e-4e49-b11f-a11ef45c9694\",\"medication_id\":\"9117b66c-a29f-43cc-ac78-5724222f7a38\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440001\",\"quantity_on_hand\":100,\"reorder_level\":50,\"expiry_date\":\"2026-11-15\"}', 'Added inventory for Efavirenz 600mg at MyHubCares Main Clinic', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 18:56:04', '2025-11-15 18:56:04'),
('887541f6-f574-4656-ab6d-db87213742ff', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:20:05', '2025-11-17 12:20:05'),
('89663b12-db11-4e8d-bea7-8fc9a3b9992e', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Users', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '{\"status\":\"active\"}', '{\"status\":\"inactive\"}', 'Changed status of  (trixie) from active to inactive', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 11:59:40', '2025-11-16 11:59:40'),
('9367b631-2ec0-4376-990f-f35d4a6660da', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 16:07:35', '2025-11-16 16:07:35'),
('95c4ad30-d719-4e0b-9176-418e9fb9c495', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 17:22:53', '2025-11-17 17:22:53'),
('96fed148-bf07-4f80-949a-b32fe440e770', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:40:16', '2025-11-17 19:40:16'),
('9b06ef3b-ab17-4f50-91c7-ea25a57f4966', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:16:05', '2025-11-16 14:16:05'),
('9bda4c41-b816-4282-94b7-a0a31b7bc08e', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Failed login attempt: Invalid password for patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-16 15:25:03', '2025-11-16 15:25:03'),
('9d1122c7-6072-4cc9-b5fb-d105b3edce24', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Successful login: trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 10:42:17', '2025-11-16 10:42:17'),
('9d9a894a-a596-4627-a7d3-9b54d23572cf', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:42:17', '2025-11-17 18:42:17'),
('9dd0ef1d-a152-407c-81b8-646f84c6075f', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-09T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-29T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:15:23.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-08T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-28T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T09:08:03.000Z\",\"patientName\":\"Trixie Ann Morales\",\"providerName\":\"Hanna N. Sarabia\",\"facilityName\":\"MyHubCares Manila Branch\",\"diagnoses\":[{\"diagnosis_id\":\"77e96a37-65ad-48b6-864a-39deac62cf33\",\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"icd10_code\":\"\",\"diagnosis_description\":\"\",\"diagnosis_type\":\"secondary\",\"is_chronic\":0,\"onset_date\":\"1899-11-28T16:00:00.000Z\",\"resolved_date\":\"1899-11-28T16:00:00.000Z\"}],\"procedures\":[{\"procedure_id\":\"f932a7fd-4d82-4668-8b87-c2cb17cae8eb\",\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"cpt_code\":\"9235\",\"procedure_name\":\"Physical Examination\",\"procedure_description\":\"No further error\",\"outcome\":\"No signs of illness\",\"performed_at\":\"2025-11-15T01:03:00.000Z\"}]}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 17:08:03', '2025-11-15 17:08:03'),
('a271d3a9-68a9-47c0-9c7c-0703831dae5d', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:43:44', '2025-11-17 19:43:44'),
('a2e9e37e-61ce-4800-9d49-7cad7ea1b6e9', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'DELETE', 'Roles', 'role_permission', '095503a3-1759-45fe-a1b8-6321cf916871', '095503a3-1759-45fe-a1b8-6321cf916871', '{\"role_id\":\"role-0000-0000-0000-000000000004\",\"permission_id\":\"perm-0000-0000-0000-000000000017\"}', NULL, 'Revoked permission \"Create Appointment\" from role \"Case Manager\"', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:28:15', '2025-11-16 12:28:15'),
('a3e8182b-2bcd-486f-b35e-e4bcdc37ce8e', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Lab Results', 'lab_result', 'd1cc561a-c533-4c17-bf09-4bc4d9841094', 'd1cc561a-c533-4c17-bf09-4bc4d9841094', NULL, '{\"result_id\":\"d1cc561a-c533-4c17-bf09-4bc4d9841094\",\"order_id\":\"e3768174-a8b4-41f0-8579-83038959c1a5\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"test_name\":\"CD4 Count\",\"result_value\":\"Okay naman siya\",\"is_critical\":false}', 'Created lab result: CD4 Count for patient aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:30:15', '2025-11-17 12:30:15'),
('a5740e25-3144-4886-b5b7-753ff8f28e72', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:21:58', '2025-11-16 14:21:58'),
('a60b1b67-6f63-48c0-a96f-7136c918bdd1', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:01:55', '2025-11-18 22:01:55'),
('a62a57fa-0715-4cff-b35b-46c1085ef692', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:15:37', '2025-11-17 16:15:37'),
('a8b70b33-29e4-4699-8945-e01de52216c2', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Failed login attempt: Invalid password for trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-15 20:33:49', '2025-11-15 20:33:49'),
('b423fddc-d150-49ce-9f86-fac457665bf9', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Clinical Visits', 'clinical_visit', '062cea3c-ff0c-44a5-9879-ec40b501b375', '062cea3c-ff0c-44a5-9879-ec40b501b375', NULL, '{\"visit_id\":\"062cea3c-ff0c-44a5-9879-ec40b501b375\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"visit_type\":\"emergency\",\"visit_date\":\"2025-11-16\"}', 'Created clinical visit for patient aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:47:06', '2025-11-16 12:47:06'),
('bdec5c34-ac7f-44c1-b83d-65695c6fe503', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:33:44', '2025-11-17 16:33:44'),
('bfe37409-a83f-453d-a490-22bf97f06afe', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 20:06:12', '2025-11-17 20:06:12'),
('c04d5fec-7b95-4c15-aa08-87bab2e45df0', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:52:57', '2025-11-17 15:52:57'),
('c13db728-58aa-410c-a35d-7f4671d20b72', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:32:48', '2025-11-17 16:32:48'),
('c3459c90-f9e2-4115-b8d2-5e700e0b9da0', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:21:53', '2025-11-16 14:21:53'),
('c5ec9730-75f7-437b-850a-6d5985d71d20', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-08T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-28T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T09:08:03.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-07T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-27T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T09:08:07.000Z\",\"patientName\":\"Trixie Ann Morales\",\"providerName\":\"Hanna N. Sarabia\",\"facilityName\":\"MyHubCares Manila Branch\",\"diagnoses\":[{\"diagnosis_id\":\"77e96a37-65ad-48b6-864a-39deac62cf33\",\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"icd10_code\":\"\",\"diagnosis_description\":\"\",\"diagnosis_type\":\"secondary\",\"is_chronic\":0,\"onset_date\":\"1899-11-27T16:00:00.000Z\",\"resolved_date\":\"1899-11-27T16:00:00.000Z\"},{\"diagnosis_id\":\"c381c663-1be5-4615-af98-3b9a141e3fdf\",\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"icd10_code\":\"120\",\"diagnosis_description\":\"It is having an collapse\",\"diagnosis_type\":\"primary\",\"is_chronic\":1,\"onset_date\":\"2025-11-08T16:00:00.000Z\",\"resolved_date\":\"2025-11-15T16:00:00.000Z\"}],\"procedures\":[{\"procedure_id\":\"f932a7fd-4d82-4668-8b87-c2cb17cae8eb\",\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"cpt_code\":\"9235\",\"procedure_name\":\"Physical Examination\",\"procedure_description\":\"No further error\",\"outcome\":\"No signs of illness\",\"performed_at\":\"2025-11-14T17:03:00.000Z\"}]}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 17:08:07', '2025-11-15 17:08:07'),
('c62d8ba7-51ed-404a-ab75-90a6fc749231', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-19 00:03:10', '2025-11-19 00:03:10'),
('c6675c6b-915a-41b6-8f2a-2de881ffab80', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 23:53:35', '2025-11-18 23:53:35'),
('c87790df-cf6b-4ca2-9f4e-568256189ef1', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Successful login: admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:24:33', '2025-11-18 22:24:33'),
('c8c71a6b-8d03-4ec0-9d07-6ebdc2f732d5', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-13T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":null,\"follow_up_reason\":\"dfsdfds\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T05:25:43.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-12T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-11-01T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:09:16.000Z\"}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 16:09:17', '2025-11-15 16:09:17'),
('c9e5e385-0b62-4399-8865-44b0d8410a02', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:17:43', '2025-11-18 22:17:43'),
('ca519f74-a42b-4adb-9fc7-07649badab42', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:40:56', '2025-11-16 14:40:56'),
('cd645a2c-3ca1-4b87-99d8-9190a52fc793', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Patients', 'patient', '7db2ecfb-e409-41f3-a632-b5db0d4f868b', '7db2ecfb-e409-41f3-a632-b5db0d4f868b', '{\"patient_id\":\"7db2ecfb-e409-41f3-a632-b5db0d4f868b\",\"uic\":\"HASA01062204\",\"philhealth_no\":null,\"first_name\":\"Hanna\",\"middle_name\":\"N.\",\"last_name\":\"Sarabia\",\"suffix\":null,\"birth_date\":\"2204-01-05T16:00:00.000Z\",\"sex\":\"F\",\"civil_status\":\"Single\",\"nationality\":\"Filipino\",\"current_city\":\"Calocan\",\"current_province\":\"METRO MANILA\",\"current_address\":\"{\\\"city\\\":\\\"Calocan\\\",\\\"province\\\":\\\"METRO MANILA\\\"}\",\"contact_phone\":\"0966-312-2562\",\"email\":\"sarabia.hanna.bsinfotech@gmail.com\",\"mother_name\":null,\"father_name\":null,\"birth_order\":null,\"guardian_name\":null,\"guardian_relationship\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440001\",\"arpa_risk_score\":null,\"arpa_last_calculated\":null,\"status\":\"active\",\"created_at\":\"2025-11-11T04:17:15.000Z\",\"updated_at\":\"2025-11-11T04:17:15.000Z\",\"created_by\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\"}', '{\"patient_id\":\"7db2ecfb-e409-41f3-a632-b5db0d4f868b\",\"uic\":\"HASA01062204\",\"philhealth_no\":null,\"first_name\":\"Hanna\",\"middle_name\":\"N.\",\"last_name\":\"Sarabia\",\"suffix\":null,\"birth_date\":\"2204-01-04T16:00:00.000Z\",\"sex\":\"F\",\"civil_status\":\"Single\",\"nationality\":\"Filipino\",\"current_city\":\"Calocan\",\"current_province\":\"METRO MANILA\",\"current_address\":\"{\\\"city\\\":\\\"Calocan\\\",\\\"province\\\":\\\"METRO MANILA\\\"}\",\"contact_phone\":\"0966-312-2562\",\"email\":\"sarabia.hanna.bsinfotech@gmail.com\",\"mother_name\":\"Edita Narzoles\",\"father_name\":\"Delfin Sarabia\",\"birth_order\":null,\"guardian_name\":\"Edita Narzoles\",\"guardian_relationship\":\"Mother\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440001\",\"arpa_risk_score\":null,\"arpa_last_calculated\":null,\"status\":\"active\",\"created_at\":\"2025-11-11T04:17:15.000Z\",\"updated_at\":\"2025-11-15T12:45:18.000Z\",\"created_by\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_name\":\"MyHubCares Main Clinic\"}', 'Patient updated: Hanna Sarabia (UIC: HASA01062204)', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 20:45:18', '2025-11-15 20:45:18'),
('cfaf6f25-f92d-4044-9ec8-2d9e5d437021', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-16 12:16:54', '2025-11-16 12:16:54'),
('d0547c4f-2741-4dee-aea7-9f29a2c77d0e', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 17:16:45', '2025-11-17 17:16:45'),
('d28bc51b-7416-43b7-904d-dc2e17999a8a', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:24:06', '2025-11-17 18:24:06'),
('d3c27e08-a3de-48f3-84b5-178a0f6455ee', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:12:25', '2025-11-17 19:12:25'),
('d5c3082d-0884-4d2e-b55f-de1a35e5c615', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:34:38', '2025-11-17 16:34:38'),
('d610c1e8-772d-4504-9c5b-4e054f492d37', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:13:22', '2025-11-17 15:13:22'),
('d614869a-e32d-41ef-b806-5442d7b7c5fe', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'CREATE', 'Prescriptions', 'prescription', '82f27f2c-2eaa-44de-9661-488f51d92c4b', '82f27f2c-2eaa-44de-9661-488f51d92c4b', NULL, '{\"prescription_id\":\"82f27f2c-2eaa-44de-9661-488f51d92c4b\",\"prescription_number\":\"RX-20251117-0001\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"prescriber_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"items\":[{\"prescription_item_id\":\"acb91d51-cf61-4d84-bf8e-4278c739eefe\",\"medication_id\":\"9117b66c-a29f-43cc-ac78-5724222f7a38\",\"quantity\":1}]}', 'Created prescription RX-20251117-0001 for patient Hanna Sarabia', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:31:30', '2025-11-17 16:31:30'),
('da8b8801-75c5-44e4-921e-cadda660a378', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Failed login attempt: Invalid password for trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-15 20:33:45', '2025-11-15 20:33:45'),
('dbda3472-09a7-4f36-9d3f-0112379e0158', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:10:41', '2025-11-17 16:10:41'),
('de246fac-cb1a-4f1c-a1cd-65af0505d66d', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 19:14:59', '2025-11-17 19:14:59'),
('de767bee-e870-4818-b36f-0c85d333b3ae', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'DELETE', 'Lab Orders', 'lab_order', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', 'e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', '{\"order_id\":\"e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c\",\"patient_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"ordering_provider_id\":\"11111111-1111-1111-1111-111111111111\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"order_date\":\"2025-11-15T16:00:00.000Z\",\"test_panel\":\"Viral Load\",\"priority\":\"urgent\",\"status\":\"cancelled\",\"collection_date\":\"2025-11-15T16:00:00.000Z\",\"notes\":null,\"created_at\":\"2025-11-16T13:35:53.000Z\"}', NULL, 'Cancelled lab order: Viral Load', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 12:46:50', '2025-11-17 12:46:50'),
('e205223e-f54b-442e-a749-c0da543d4acb', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, NULL, NULL, NULL, '::1', NULL, 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36', NULL, 'failed', 'dispense_events is not defined', '2025-11-16 14:41:25', '2025-11-16 14:41:25'),
('e2809df2-9701-4e3c-a979-7681a6ca459c', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 18:43:23', '2025-11-17 18:43:23'),
('e2f32dfa-c9b3-4a34-a197-2888f17744de', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Successful login: case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 17:28:12', '2025-11-17 17:28:12'),
('e3e10940-204b-4106-b92d-5ea52edc7f91', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', '', 'Prescriptions', 'prescription', '8201188a-a4eb-4677-816f-08e0998056c2', '8201188a-a4eb-4677-816f-08e0998056c2', NULL, '{\"prescription_id\":\"8201188a-a4eb-4677-816f-08e0998056c2\",\"prescription_number\":\"RX-20251116-0001\",\"dispense_events\":[{\"dispense_id\":\"5c4e5a12-976c-4355-9a8a-a6a74e97ab02\",\"medication_name\":\"Efavirenz 600mg\",\"quantity_dispensed\":1}]}', 'Dispensed medication for prescription RX-20251116-0001', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:21:53', '2025-11-16 14:21:53'),
('e55ce961-342a-41c1-9abd-b55ac0d8a4f6', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', 'Hanna N. Sarabia', 'admin', 'UPDATE', 'Clinical Visits', 'clinical_visit', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '3202ceae-5caf-4a5b-8eb9-b087f9679d51', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-11T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-31T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:14:51.000Z\"}', '{\"visit_id\":\"3202ceae-5caf-4a5b-8eb9-b087f9679d51\",\"patient_id\":\"169b7991-2e21-4f62-8672-f06f129a8cbb\",\"provider_id\":\"ffa85dab-263d-48e6-9cb1-fdef46b9b4a8\",\"facility_id\":\"7092d90f-5986-44fc-a56d-87abbf6b003d\",\"visit_date\":\"2025-11-10T16:00:00.000Z\",\"visit_type\":\"follow_up\",\"who_stage\":\"Stage 2\",\"chief_complaint\":\"dadas\",\"clinical_notes\":\"\",\"assessment\":\"dasdaa\",\"plan\":\"dasda\",\"follow_up_date\":\"2025-10-30T16:00:00.000Z\",\"follow_up_reason\":\"Laging Galit sa buhay\",\"created_at\":\"2025-11-15T04:54:11.000Z\",\"updated_at\":\"2025-11-15T08:15:10.000Z\"}', 'Updated clinical visit 3202ceae-5caf-4a5b-8eb9-b087f9679d51', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 16:15:10', '2025-11-15 16:15:10'),
('e55d97b2-2470-4aa8-906d-f8410f3101fd', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Dela Cruz', 'physician', 'LOGIN', 'Authentication', 'user', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, NULL, 'Successful login: physician', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:12:28', '2025-11-17 16:12:28'),
('e6b87bfa-e42c-40e9-bf2f-93ea84d251eb', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 16:22:27', '2025-11-17 16:22:27'),
('e8552eef-98f4-48d0-ad0d-65c5a5d6c93a', '66666666-6666-6666-6666-666666666666', 'Jose Reyes', 'patient', 'LOGIN', 'Authentication', 'user', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NULL, NULL, 'Successful login: patient', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-17 15:31:26', '2025-11-17 15:31:26'),
('ea244ee3-c934-4ef0-b896-aa45d9a358c7', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'CREATE', 'Inventory', 'medication_inventory', '79642a00-11ce-47eb-934a-1e9c3be7dd5c', '79642a00-11ce-47eb-934a-1e9c3be7dd5c', NULL, '{\"inventory_id\":\"79642a00-11ce-47eb-934a-1e9c3be7dd5c\",\"medication_id\":\"9117b66c-a29f-43cc-ac78-5724222f7a38\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"quantity_on_hand\":150,\"reorder_level\":200,\"expiry_date\":\"2026-11-16\"}', 'Added inventory for Efavirenz 600mg at MyHubCares Main Facility', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 12:48:17', '2025-11-16 12:48:17'),
('ec59ecc4-44fc-420e-97a1-7b7bbea262c3', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:24:41', '2025-11-18 22:24:41'),
('f6fa9a26-39f5-43b5-81aa-225acc59d70e', '11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin', 'LOGIN', 'Authentication', 'user', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'Failed login attempt: Invalid password for admin', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-18 22:02:00', '2025-11-18 22:02:00'),
('f76a5cab-28eb-4af1-b2e8-0c4e5be58ff2', '33333333-3333-3333-3333-333333333333', 'Maria Santos', 'nurse', 'LOGIN', 'Authentication', 'user', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', NULL, NULL, 'Successful login: nurse', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-16 14:16:27', '2025-11-16 14:16:27'),
('fc86b285-667f-445b-bf60-39c4820ed4e0', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Failed login attempt: Invalid password for trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-15 20:33:55', '2025-11-15 20:33:55'),
('fcfdb490-f3b7-4690-9956-c70a4de4608d', '44444444-4444-4444-4444-444444444444', 'Pedro Garcia', 'case_manager', 'LOGIN', 'Authentication', 'user', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', NULL, NULL, 'Failed login attempt: Invalid password for case_manager', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'failed', 'Invalid password', '2025-11-17 18:09:54', '2025-11-17 18:09:54'),
('fd3198ed-32fb-4b5f-a41b-e5663f700305', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', 'trixie', 'physician', 'LOGIN', 'Authentication', 'user', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', NULL, NULL, 'Successful login: trixie', '::1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-15 20:33:59', '2025-11-15 20:33:59'),
('fd4fa85c-c0d7-4d11-aed7-54aabb7c699a', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanna N. Sarabia', 'patient', 'LOGIN', 'Authentication', 'user', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', NULL, NULL, 'Successful login: Hanapot', '127.0.0.1', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', NULL, 'success', NULL, '2025-11-18 22:00:31', '2025-11-18 22:00:31');

-- --------------------------------------------------------

--
-- Table structure for table `auth_sessions`
--

CREATE TABLE `auth_sessions` (
  `session_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `revoked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_sessions`
--

INSERT INTO `auth_sessions` (`session_id`, `user_id`, `token_hash`, `issued_at`, `expires_at`, `ip_address`, `user_agent`, `is_active`, `revoked_at`) VALUES
('000b52bb-d09e-4ddf-b828-f002275f2a5c', '11111111-1111-1111-1111-111111111111', '$2b$10$vaRUnCZW.FAthXIhXYJVWe80DK0b344Rz3Uw5fyAhDevpTnQMLi9W', '2025-11-17 19:57:44', '2025-11-18 19:57:44', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('02222689-04c2-48d5-85f3-324f9c1b93ab', '11111111-1111-1111-1111-111111111111', '$2b$10$HFJE6ldsIN2uocu9G1SPmOhELLkSRoviwSNny0zqRPE9lpGUYCkKK', '2025-11-16 12:01:45', '2025-11-17 12:01:45', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('08a60929-9b82-4b55-b268-4766337cf65d', '66666666-6666-6666-6666-666666666666', '$2b$10$Mr1HYprM9EcFvtA2wZWsnOMCa2GvxuVL9XdFfrxFVxEVkElP14OK.', '2025-11-16 19:43:22', '2025-11-17 19:43:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('09e593c3-8ada-46b8-ae32-0b24a35204d6', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$6N79gVNNKxOCKBckDCqxaeQu24WYetYwJL05.7sIm5TFSZXSC3Tma', '2025-11-17 19:43:44', '2025-11-18 19:43:44', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('0d647842-5671-4c0b-b386-f3e26b047b47', '11111111-1111-1111-1111-111111111111', '$2b$10$Ejuc8ldVq.DUeGIG7t9ObOAvfPmNQr4uCyvUwOuGazINpkdRqozri', '2025-11-18 22:02:02', '2025-11-19 22:02:02', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('0ee4bdf2-e29a-4fb9-982d-d79e75980b16', '11111111-1111-1111-1111-111111111111', '$2b$10$F7DsZCan40OCj99Z0is44OIIhGF1I./XEayblJhrVdIRrfp8D8HB.', '2025-11-16 12:17:33', '2025-11-17 12:17:33', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('1137a9a0-d05b-48c1-901b-ce1949d68643', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$Bk2nFTEYSAD.OJwvbMcuq.tOvQ..zd/PGT2/W9tMvUZ0iXc1vkM0e', '2025-11-13 13:00:25', '2025-11-14 13:00:25', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('13fa97ce-7a7a-4dec-9076-b8eff2687c05', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$b7L4DVel8lvDrwcprq5dROMUdw2K2EdzJSVnGjwMYjDk/JIJkW81i', '2025-11-11 21:49:37', '2025-11-12 21:49:37', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('15360f6c-3799-438b-bd57-5dfafdc81b97', '11111111-1111-1111-1111-111111111111', '$2b$10$sqWNCjOGsXq96HqhnPFOTOR/WHB7UzzMhxhPmFYzOR0xtUfU.4Zyy', '2025-11-16 12:20:18', '2025-11-17 12:20:18', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('167e22e1-aa23-4d3e-9ce5-69defa71ed0a', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$ccSVeVRubO.OM9OvgzpxWOQbGkt5/OjtP7eoB6bn5ijTdUq8Dlzgy', '2025-11-12 10:55:58', '2025-11-13 10:55:58', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('1b7acfe5-215c-4208-bf2c-2f82f3066884', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$TYn4DPcwrzbzZI1ePwmNl.xU5M6Ef/Y/9nIOX2qqsvZUJl6EHugDS', '2025-11-11 12:18:48', '2025-11-12 12:18:48', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('1ea6bd1d-f162-401b-a19b-137460707022', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$o78L0lCbouNGguoCKG7AlOIIIUESpMgHhExf/hFTr3VWOBBekCXQy', '2025-11-12 17:15:10', '2025-11-13 17:15:10', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('21107284-8353-4cad-88f5-77c2675bee9a', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$EJ0G8JW5y.pOzCgdnpxIluZiJ3MoLh.1mAUm33V9643LEwBX4OPN.', '2025-11-18 22:17:43', '2025-11-19 22:17:43', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('26ba98b1-abda-4b6f-84a6-c12f489fc5cb', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$6xa4vjPSQYqaH1Yq7wfcTOrsTRaixcjucVJkHRZoTtYWZ.sMurwLq', '2025-11-17 19:14:59', '2025-11-18 19:14:59', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('28baf7ce-5006-436e-b008-1b6256e996f0', '66666666-6666-6666-6666-666666666666', '$2b$10$Uy7aj4zGqGJzQKqa6/oOsem3nJCZWs9dWcx2htTtd03r5geXAI1me', '2025-11-17 15:52:57', '2025-11-18 15:52:57', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('28e9032a-b81a-4042-bdca-5f186aa65953', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$btFNRSKKoXDTo6QsjVQF4.qujXjOqtbGclNFjZwIhO4XRNnsb9W5y', '2025-11-14 11:58:35', '2025-11-15 11:58:35', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('2acecd6b-7b06-44a7-b612-f1233d7b22e0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$sjwk2VYr.dP0kGgKlTTcF.JC7U5p2Tb1n0vZyTF/aMw4bFf9h94SO', '2025-11-17 17:22:53', '2025-11-18 17:22:53', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('2b4a891e-3049-446a-8056-179fea3208d7', '66666666-6666-6666-6666-666666666666', '$2b$10$chdtg4.xDX6ZHLLYZ8o/Ru6bGHNioeHkPtyGSMCZnbkLXgtFCij26', '2025-11-16 15:25:07', '2025-11-17 15:25:07', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('301c59c6-fb45-4bdd-9a1e-891579f6e481', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$XdNQuHf45YlzhsC9bVrqH.LCkDQhnPs35cqGbuw6zle04an2pCAee', '2025-11-17 16:15:37', '2025-11-18 16:15:37', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('31bc237f-6edc-4971-baa8-cbcd1afd8cb6', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$SvPMCgTel3//.B47Zi7NvetemRwHMOdoyF45dl8s4cdVpm0ASiYAO', '2025-11-17 16:22:26', '2025-11-18 16:22:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('342b6923-6884-4df8-a7fb-78da0cf33ab3', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$71jpzEANuKQ62BRkVYI6ae.c1gMF2K0QSS1oDORIvJVcCTFHzskyu', '2025-11-17 19:40:16', '2025-11-18 19:40:16', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('35122fa5-deb9-41c3-b0c4-c9241cb2ff59', '11111111-1111-1111-1111-111111111111', '$2b$10$2RkG8y0CGEyyY3CXTMftgeWSkY0RktwHXJ1Z8Ox9xciIPrjVyaEKe', '2025-11-16 12:47:47', '2025-11-17 12:47:47', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('378f36d4-9ca3-489b-bc2e-f001460e0396', '22222222-2222-2222-2222-222222222222', '$2b$10$5vH0BQJYTQoe88BUd1xozetrRx.GBAipzTVAZZGGwg0v7.BC8r6J.', '2025-11-17 20:00:10', '2025-11-18 20:00:10', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('39842f46-547c-4d34-a340-20237d5cfb15', '44444444-4444-4444-4444-444444444444', '$2b$10$OyDXIkdDlx4fAzDTqcP3fuxwzQw8eZGBHAhVIOuCh/mwU0a.s5ULC', '2025-11-17 17:28:12', '2025-11-18 17:28:12', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('3a8067d9-906b-4885-9ff8-3c486f4ef1c1', '66666666-6666-6666-6666-666666666666', '$2b$10$wJ1JwFeG0R3.C7t95cf63u/4M1XYsTNOqvPID8YxeZQs59kw9cTDm', '2025-11-17 15:45:45', '2025-11-18 15:45:45', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('3b87d9e6-3f69-495a-a52b-13144c8f7fe7', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$WC4hKOCaczUPcsN4ffbjD.0STwo0Xoym7PKcNKNcP4azSq4/zt65a', '2025-11-11 13:50:46', '2025-11-12 13:50:46', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('3b908d89-2768-44c7-b5b5-28543d7f3ab9', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$7DeMAFXl0FTp4x/9PI2UReB6RQirew9n90K6Nfo4dQBkbytbAWpvK', '2025-11-18 22:01:54', '2025-11-19 22:01:54', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('3e049d24-aab4-4001-b3aa-05e3a0ac1016', '33333333-3333-3333-3333-333333333333', '$2b$10$ShD0KRofeyl5Okq2GhUoneo99Kkh.fseSFRBXLxRx.JVueez8w1BW', '2025-11-16 14:16:26', '2025-11-17 14:16:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('422e0386-36fc-4d4c-b221-4b5fa0210cf2', '22222222-2222-2222-2222-222222222222', '$2b$10$laEqK804Wy7X2Mx8lRp2i.01hCB0/4JTFO.ZsnFeHZ2tFcl62768u', '2025-11-18 23:53:35', '2025-11-19 23:53:35', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('4292a528-ef23-4148-949c-428fa31f1ffc', '44444444-4444-4444-4444-444444444444', '$2b$10$WuKN4suASmXREslo.tAIKeJT4cKoT4bk1h1D2LDf4D1l8dfv/YZZq', '2025-11-17 18:10:06', '2025-11-18 18:10:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('44820b53-2e0a-48db-ac16-0e83af936f4a', '66666666-6666-6666-6666-666666666666', '$2b$10$aAxIbgPb6gF0QZ3esRlR1eeXVlfcbGRmJotoEad0gt02g/OyCcm5K', '2025-11-16 12:30:32', '2025-11-17 12:30:32', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('4b07ee6e-ef41-49e7-8f51-a88c5894b0ce', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$tdsncwlh07OkHaRH1zTACerdD8BOeogAqIQREHstOC50dvSAOreu6', '2025-11-17 16:32:47', '2025-11-18 16:32:47', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('4fefa43e-3c72-4980-b7cd-9b3ff6445b60', '11111111-1111-1111-1111-111111111111', '$2b$10$WUFnJO.d2Hd0jrwoasxyBeQz1W2P4Krl798ZiEldhJ32xU6dSh1CS', '2025-11-16 19:19:43', '2025-11-17 19:19:43', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('504e8955-52f8-4b4a-a5dd-848baa4e836a', '66666666-6666-6666-6666-666666666666', '$2b$10$bPvDJG9dxPRI2Pcokp2HjekLSHb8j6B0ymyU02x2/sna2R5kzUzwy', '2025-11-17 13:05:50', '2025-11-18 13:05:50', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('58ebd118-63fb-4cc5-a530-9a35edc983d1', '44444444-4444-4444-4444-444444444444', '$2b$10$qRgiOSzPKx7b1TV2s99ToeyZwrcwiNzX/Bs9xr2HQULljYdq0QDuu', '2025-11-17 19:37:15', '2025-11-18 19:37:15', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('5d771e66-f7f0-464d-85a4-ea32c8b39b97', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$kQRBD9ORoSXw1JqNwx7FDeBxky3cNPA9sW3Q/wLgrDkuBwPdu8lnu', '2025-11-15 12:29:18', '2025-11-16 12:29:18', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('5d9d030a-bf0a-4a0f-b731-7cc9d6108f28', '22222222-2222-2222-2222-222222222222', '$2b$10$QQsmquKOA3IfM.LNmeQmpOK7ZJPnjhC2K0LcbVXG7Kl0GLtLRBO3K', '2025-11-17 18:24:06', '2025-11-18 18:24:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('662d2a2f-e22b-4fef-b8ea-59f4d09612bf', '22222222-2222-2222-2222-222222222222', '$2b$10$ZcIvuAL10RdJExZjMUZKneztNlvHo/jYQqwq.2FvplxNQNVYgt/Na', '2025-11-16 12:43:32', '2025-11-17 12:43:32', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('669a1f02-f1b8-46f3-8cce-a32956fd7198', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$VQcVk1j69VePUflIMrq97OvKDfqCbwjMRQiyL3xUeJh6PzQu6A6la', '2025-11-16 11:38:48', '2025-11-17 11:38:48', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('6eb4f21b-d4d1-4706-a72c-482923e83ee6', '66666666-6666-6666-6666-666666666666', '$2b$10$YzCtUGjIa6DieSBlRcOapeIndXfDufYfvgdD1iEZfWSY9AE0/UUGi', '2025-11-16 16:07:35', '2025-11-17 16:07:35', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('70d031f4-20da-4a46-81ce-5733e51c769a', '22222222-2222-2222-2222-222222222222', '$2b$10$hTmXNhUI0yvtYtSxCLCrFORpvSFLQ9oxpwlBAkJ7oyDWKUVZl7yNq', '2025-11-17 16:12:28', '2025-11-18 16:12:28', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('70e5abb2-6161-42d8-ac53-cdf10b7e31d2', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$RytNuhUNOTDF0nNZ4fO8FOFU5mkaAVs/9B5FWB01n3lOzmYpXbnX.', '2025-11-11 21:52:30', '2025-11-12 21:52:30', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('71f8d77a-9355-44d7-83bd-222443b4b574', '66666666-6666-6666-6666-666666666666', '$2b$10$6VIdXz57fynjdJEvgJYhL.bP8JJ6VVAUkD3bY4aaNX/fN004h470y', '2025-11-17 13:07:23', '2025-11-18 13:07:23', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('78509deb-3f1e-4d65-9454-3e1e8e099d09', '22222222-2222-2222-2222-222222222222', '$2b$10$2qik9vaX6h7PsyfRvc/aBOZ5V7DKClbdsebwxeZRG/mke0rmrGGSe', '2025-11-16 12:53:46', '2025-11-17 12:53:46', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('78f73c71-7400-4e46-8531-1d16d5c799ff', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$fIc0zmOVCdP2/1983QFoauwnvzUmlD7d4YLmlc8TJ1Csa4Of7N7Ru', '2025-11-17 20:06:12', '2025-11-18 20:06:12', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('7a20e92f-26cd-4a8a-b32f-25e9b70f16b5', '66666666-6666-6666-6666-666666666666', '$2b$10$.K18Q1Jd8U/xV9u.d1OUjOdLTZXjixXYvv2QFcYU1bjD5qOZ2n.4C', '2025-11-17 13:56:37', '2025-11-18 13:56:37', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('7a347503-c988-43d5-aa9f-5b24e362b88f', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$hfLeeZJumpMl18ZNCRsEZe1oyv5poAtM.jM5wC3RNOqc0cCwXQYXK', '2025-11-17 16:08:06', '2025-11-18 16:08:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('7d0121ba-4849-44ea-86e9-9b4af95d4e63', '66666666-6666-6666-6666-666666666666', '$2b$10$tXO7O4.eWKjnkez8IC/kBeXWKDm/59DViYINtOX4M4aAOyy.u7yca', '2025-11-17 15:31:26', '2025-11-18 15:31:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('7edb40fa-fa1a-4a19-9672-eb551c29cb62', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$dfCy6I30XyTQGjfXHau93O8FP8DxBQLrrMgTN/a1syfijgPaXhGsO', '2025-11-14 09:15:31', '2025-11-15 09:15:31', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('7f8ef546-aa43-4d56-9cb3-f17bd4ad0c28', '22222222-2222-2222-2222-222222222222', '$2b$10$4YLuqdYP9HtNYopBs9oc8.osFtrKqPavIJSmU6S/33vLEpKFsdOhC', '2025-11-17 12:26:10', '2025-11-18 12:26:10', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('832e9666-0375-4668-a058-db605e9a58db', '11111111-1111-1111-1111-111111111111', '$2b$10$unDW2E92tepxzKSV5fNdK.7i5Z1x9UTlXssy9BX.jLv1Mg2uy5lEG', '2025-11-16 14:16:05', '2025-11-17 14:16:05', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('832eec4a-bc57-4fca-8e47-90805e8303dc', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$cyXszGp.7TKXVp3j/7WoDusXatWRBay24MALByWyc9pgS4OA5KvwW', '2025-11-17 16:10:41', '2025-11-18 16:10:41', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('86332033-4db5-4bb9-85dd-15455e6c1d69', '66666666-6666-6666-6666-666666666666', '$2b$10$USrRtcwMNr8EhCYJijRij.dfVdSi.JPMMdAC2w0RMQ.WjaJ5LhROm', '2025-11-17 14:16:40', '2025-11-18 14:16:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('8702174d-4028-43d8-8a99-f0d53d03fb04', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$TwY9eDrcCedjNPnBCp3tdeln3mP64/2bZ/sb5tNrni2feYraECE6S', '2025-11-17 16:37:00', '2025-11-18 16:37:00', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('88763c24-0c45-497a-bee5-f2e0948c0099', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$7qPQAx..fxph2AlMtiOvVegiitO4Ph0PyxUb2kyXUqN21IWRCJMga', '2025-11-17 20:03:21', '2025-11-18 20:03:21', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('9144338a-cb05-4fc3-9cf4-b285a7351e13', '22222222-2222-2222-2222-222222222222', '$2b$10$9GhA/BPWMb5YYdDcaUQooOY36vFtHcOq4TpZ25x3ncWNpsRj8NDWi', '2025-11-17 16:33:43', '2025-11-18 16:33:43', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('972c0043-421b-428f-a172-987371ce6285', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$E3QdBhB3Ga6QgJ4LT4LGKO3W6dj04FMPO7vRUHYM/VfIYdaTtLkqa', '2025-11-18 22:10:47', '2025-11-19 22:10:47', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('9c80c5d9-b8d2-4834-b76b-9f37f3dc7fcc', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$WvUK5K3FkwuiljcOcT/r1eVnFwV.iQwcFAIzQLLTBkGkJ7pmTns5e', '2025-11-13 07:47:47', '2025-11-14 07:47:47', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('9d24d9b9-5291-40c3-b858-6b3fb485b7a1', '44444444-4444-4444-4444-444444444444', '$2b$10$o5cBSQGM9bwLQagaww7SzOviZb3GkmKLHSPVqgjsxTkU.Occ0KSvq', '2025-11-17 19:33:08', '2025-11-18 19:33:08', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('9d658ba4-04f5-4065-9ee5-fe78a6375bbe', '11111111-1111-1111-1111-111111111111', '$2b$10$Y4Q9vbvTxb3hiCGIqlODmOiPoA/QB9TG7cmRv6NrlHw0AHq8Oh6zq', '2025-11-17 12:20:05', '2025-11-18 12:20:05', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('a186521d-e769-45ac-af4e-43af9470662e', '66666666-6666-6666-6666-666666666666', '$2b$10$eHHviJ1vuvVAJEgTfoQ4Z.UwcI3e1sg/efXo9/fyeHUA13zYnrDvK', '2025-11-17 15:13:22', '2025-11-18 15:13:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('a294cc88-957f-431e-bbd6-6bbf5774ab1c', '11111111-1111-1111-1111-111111111111', '$2b$10$eAlQIaTWz8BH4DgPhj1CJusSn2o57QXyhv7BnYaeTzfUY71WX3.ca', '2025-11-16 21:30:11', '2025-11-17 21:30:11', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('a7560797-c057-48db-9157-1bb4cb1e092a', '66666666-6666-6666-6666-666666666666', '$2b$10$mdVAwR75w/I/Sn4WMs0eW.VJdc8uzSoB7mTv2EPw.cXmh0fq/TNFa', '2025-11-17 15:28:39', '2025-11-18 15:28:39', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('a83984dd-be87-48a3-99b0-fd1f1de05ebf', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$UxjLLYF28bQSG83HYZBTgueAUW4AMg.ckm4om8gUjdlPB.eUHp1CS', '2025-11-15 20:34:26', '2025-11-16 20:34:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('a9ea01ac-0ddf-48da-9d03-9ac6bdb8e3ee', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$DpaTcIa2CY.xvcLDHt.pcu73zucexqTkSp/mUGcCFwM2wCL82i5YG', '2025-11-17 18:42:17', '2025-11-18 18:42:17', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('ab6512a1-5bc7-477a-bcf2-5aa24df810a1', '44444444-4444-4444-4444-444444444444', '$2b$10$LSS1F1bjqyDAMq/en77R1.nXXHnmkiew1q0w1mLrMvA.0NSxR.uea', '2025-11-17 20:02:32', '2025-11-18 20:02:32', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('b61814ce-31e8-4e17-98e7-b5914479e970', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$KZk0lHtkJffpfdF/gB3b0.EIRQrFvgM6s9xri2h.pWwT8aNgoncFK', '2025-11-17 17:16:45', '2025-11-18 17:16:45', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('b66c0efd-1417-4c1d-bcba-5a8f0e14df95', '44444444-4444-4444-4444-444444444444', '$2b$10$5JbiSp2Z6GzvvdX6Odp.dOENOO2M.sTFnCQ8yvi4sr/d/1aCHcmq6', '2025-11-17 18:28:33', '2025-11-18 18:28:33', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('c519b4b0-3064-4f72-a978-285a883c04b0', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$7CFtqAFrhIa402Gra1WVR.iLVVXBg8awuwbR6KKPc9zK/2bidns2q', '2025-11-18 23:43:01', '2025-11-19 23:43:01', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('c55c2497-21ad-439c-aa6f-44df866571e3', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$4eieeivKZT0WoRbtHAv.p.jNv9X3khFTtICj41pXJATLhhW1JBp6.', '2025-11-11 12:19:24', '2025-11-12 12:19:24', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('c7cbecd9-d50d-4f33-bda1-95f015c5c7d9', '44444444-4444-4444-4444-444444444444', '$2b$10$l90Fb7.GwosrGoiTusJayuXK.c0SFWqeSYaCv5s5IsAHQtkOJwIWq', '2025-11-17 18:19:15', '2025-11-18 18:19:15', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('c803b40b-36f5-4e77-9916-22a806bb0af7', '22222222-2222-2222-2222-222222222222', '$2b$10$G2x4cuBE4BAybkJe3s1jNuBRpysRHz4bCQOaBK0pTp541tLjtUGoW', '2025-11-17 19:12:25', '2025-11-18 19:12:25', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('c9074578-a4fa-4a36-8bad-8925ec953b6d', '66666666-6666-6666-6666-666666666666', '$2b$10$Ab/jgGct5paN88S1/.YOiOMSQvBIq4JVH8VZoPhrvTGigra327Xce', '2025-11-17 13:53:40', '2025-11-18 13:53:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('d4879351-c848-40a8-a103-d86a2cedddfe', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$6U2s2iTigrIc9BiGmFaneuaeuDlIuL3sTVls6dw2StAZWgl1JSHoS', '2025-11-15 13:05:21', '2025-11-16 13:05:21', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('d637daa6-0d2e-4ed8-a5d0-35faa9744528', '44444444-4444-4444-4444-444444444444', '$2b$10$I8oYdvtoizg1UQqUON51/.WzoJeEXaUJPlzxfrTj3dTPJwP7Nxc.C', '2025-11-17 19:42:48', '2025-11-18 19:42:48', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('d9e36487-5a02-4a73-907c-3184c5731f02', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$EFSSmad.oOa2p65lXGswWurPj.1hJIwSH0RZ3yq15HL1Rh0Nqwx5y', '2025-11-18 22:24:41', '2025-11-19 22:24:41', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('dd381f38-c6b7-4c22-a7cb-740f13ca05ff', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$X.HcMJN4yu/Z32StOvmOnO6Ku8U4QRI2jwF1eJdgMIEziKrkZ10OG', '2025-11-12 12:36:27', '2025-11-13 12:36:27', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('dd5612a5-c0ac-409e-835d-8909887839f8', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$Hoh054J4MAowTBMIzDGzyu1/pQODWeY2lU8Jangm9Tdi653Ind8Xu', '2025-11-17 20:36:51', '2025-11-18 20:36:51', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('de31e964-d37d-45b2-8462-5c362f44f44b', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '$2b$10$XrrHRlXVJ3SdWBDDpfMPkeazfoVyu1bp0pMNjqmQrOI5CNqDq8gb6', '2025-11-15 20:33:59', '2025-11-16 20:33:59', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('e40ff8d5-3198-4c64-bd1d-ce4749bb4d47', '42356bf7-84ef-4aaa-9610-d74b65c3929f', '$2b$10$WzOS5kfTdwe7tYaGzanmT.EODB04HEntzloaFNCnbfpCX5aj93onq', '2025-11-17 19:13:26', '2025-11-18 19:13:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('e510fe3d-811c-4c55-ace5-358fc8335e4f', '33333333-3333-3333-3333-333333333333', '$2b$10$b3/V/iufnx.Jig89G7aGy.irZZMEfDogrn6t7LqqD/SPdebk37/cq', '2025-11-16 14:21:27', '2025-11-17 14:21:27', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('e5ecefa1-3b25-471a-a002-80498577181e', '33333333-3333-3333-3333-333333333333', '$2b$10$hR3br3QDv5Doh.K7vKzUAelKjags/Trpty4mCB.si7KIXmGZRETCe', '2025-11-16 12:58:22', '2025-11-17 12:58:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('e7d0658d-bc7e-4c83-b36d-a91c869cb61a', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$T7RaaNekXGwSoYUptEnZsugvwibAzV5xTOf6BzzKbunxZ780PtJPm', '2025-11-17 16:20:02', '2025-11-18 16:20:02', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('efc5d8f7-5bf5-4571-b117-dd7ee1685e92', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '$2b$10$Y4KzYJSd2nCB..1BaTbmBOe9QdwXGvXCBnWX9I3f7jiLWVjUQjnC6', '2025-11-16 10:42:17', '2025-11-17 10:42:17', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f0064fef-f013-4129-85a6-3d87b8b6ae90', '22222222-2222-2222-2222-222222222222', '$2b$10$UMzDiWD8/T6YhB6BGaItI.2b1c8Ta.4kkS1NeuZSyDMm5F5Fkoee2', '2025-11-17 16:30:41', '2025-11-18 16:30:41', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f09efb83-86ad-48b2-8f33-cf6b61428706', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$VnhrhTCc5JvIbSYuTFr.outYQqMF7QI/nRfaHk0ijppzPBnnyTrp2', '2025-11-18 23:52:40', '2025-11-19 23:52:40', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f16b32a6-c96a-42f9-becb-56fb938d05d5', '66666666-6666-6666-6666-666666666666', '$2b$10$lE2kEjjm0BaTcMUdvgjCEOcwUmp.terL09nHS/XP1OhRpsH3k4jHC', '2025-11-17 14:40:42', '2025-11-18 14:40:42', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f3213e56-d291-4e54-9e41-c26fe8defc0e', '22222222-2222-2222-2222-222222222222', '$2b$10$r9p6N/P2lCEWWsS1ki19FupdhIhsc4Zcx44kesh0M9/NWIvOcflwm', '2025-11-16 16:06:23', '2025-11-17 16:06:23', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f3729f66-a924-4adb-a034-be2315cf4261', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$1FixLCsi1DHM10v0XZ3kje/2d27wt4dRnnjMQoOsxDgOYY8GIhbWi', '2025-11-19 00:03:09', '2025-11-20 00:03:09', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f39e7a9d-1660-4923-baf2-e1720eb48c3b', '11111111-1111-1111-1111-111111111111', '$2b$10$Q7TimSsReKou4S0XL4o8H.8LArf1jIOqKDHi8By3sOS4iZK0Xpr6y', '2025-11-18 22:24:33', '2025-11-19 22:24:33', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f43a956b-5832-4481-8d88-cac845fc637c', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$b.wGTcHZrKD05cPNQcgpBOZ5qi5LAVxglOoxGNw/XfLU2J8yGd4A2', '2025-11-17 19:21:37', '2025-11-18 19:21:37', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f59c7f56-418e-4086-8102-4622ba83a89a', '3fdb00a0-7774-40f1-96f6-7d4c179bcd93', '$2b$10$QCdPEPHEce.aEadSQ.p1mexWkYx/zTgtKQwNXFpVcCczz.lnrkZ2W', '2025-11-14 11:32:28', '2025-11-15 11:32:28', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('f5cb319a-e4f2-4255-ac7a-b3153fce3f99', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$QFfiv9kxcG3ahMzqleWE5OP9qhh85qypJgWrd4TONL75xNb99N1OC', '2025-11-14 11:59:49', '2025-11-15 11:59:49', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('f79e1af2-1071-4b5b-930c-c1d9bbe548db', '22222222-2222-2222-2222-222222222222', '$2b$10$ofFgGMPq9KdTRXrL5jNTAed7o4o32DXUyQyxWhjazshu8OZvkhaDq', '2025-11-18 23:53:04', '2025-11-19 23:53:04', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f8036349-1f97-49a3-87f7-9b2a1a00a098', '42356bf7-84ef-4aaa-9610-d74b65c3929f', '$2b$10$7Tw3q3j9JO2zxrqEz7G/6OqdjwaB2DniWOEG5WQDwNvKWeL/I3bKm', '2025-11-17 16:15:10', '2025-11-18 16:15:10', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f8cf142d-5d6b-4b3b-aaca-b8ac3f3592e7', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$fDOTi2bG/mix6HV/bykihOkYFEGudooIBOkp9FRckeLLMiWqYQm.i', '2025-11-17 16:34:38', '2025-11-18 16:34:38', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('f9815dfd-bc29-4dab-9fd9-b43c045db314', '66666666-6666-6666-6666-666666666666', '$2b$10$qraRjbk2RtfI94lU2iuaiuRu8.mnlP5gPWN1M5VZWmklYrCEIytda', '2025-11-17 15:33:23', '2025-11-18 15:33:23', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('fd48ab79-95cf-4038-8622-52c359fcccf4', '16bec9d0-6123-4428-b9a3-fea81c3592a0', '$2b$10$30WR5vYBqaz40aj7mc.6vuJQiH.9UKJXsNonNxaW88F/2sCxnmTyW', '2025-11-18 22:00:30', '2025-11-19 22:00:30', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL),
('fdac6d0b-24ef-45e8-a07d-5fc10294cf33', 'ffa85dab-263d-48e6-9cb1-fdef46b9b4a8', '$2b$10$cf.wJb/.xM8KAoYrfWHZGO99q3MSOpJOIM4fiEU1tcoEi1keJHuBa', '2025-11-14 11:18:34', '2025-11-15 11:18:34', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 1, NULL),
('fe00deac-8729-49f1-9da3-78b7118eb76a', '22222222-2222-2222-2222-222222222222', '$2b$10$AueYTCkB4IgDyduPIhj2JegulUfCLtohpL7YpHYmwvrnIuV9nk4kG', '2025-11-17 18:43:23', '2025-11-18 18:43:23', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `availability_slots`
--

CREATE TABLE `availability_slots` (
  `slot_id` char(36) NOT NULL,
  `provider_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `slot_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_status` enum('available','booked','blocked','unavailable') DEFAULT 'available',
  `appointment_id` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `care_tasks`
--

CREATE TABLE `care_tasks` (
  `task_id` char(36) NOT NULL,
  `referral_id` char(36) DEFAULT NULL,
  `patient_id` char(36) NOT NULL,
  `assignee_id` char(36) NOT NULL,
  `task_type` enum('follow_up','referral','counseling','appointment','other') NOT NULL,
  `task_description` text NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_types`
--

CREATE TABLE `client_types` (
  `client_type_id` int(11) NOT NULL,
  `type_name` varchar(200) NOT NULL,
  `type_code` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clinical_visits`
--

CREATE TABLE `clinical_visits` (
  `visit_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `provider_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `visit_date` date NOT NULL,
  `visit_type` enum('initial','follow_up','emergency','routine','art_pickup') NOT NULL,
  `who_stage` enum('Stage 1','Stage 2','Stage 3','Stage 4','Not Applicable') DEFAULT NULL,
  `chief_complaint` text DEFAULT NULL,
  `clinical_notes` text DEFAULT NULL,
  `assessment` text DEFAULT NULL,
  `plan` text DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `follow_up_reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinical_visits`
--

INSERT INTO `clinical_visits` (`visit_id`, `patient_id`, `provider_id`, `facility_id`, `visit_date`, `visit_type`, `who_stage`, `chief_complaint`, `clinical_notes`, `assessment`, `plan`, `follow_up_date`, `follow_up_reason`, `created_at`, `updated_at`) VALUES
('062cea3c-ff0c-44a5-9879-ec40b501b375', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', '2025-11-14', 'emergency', 'Stage 1', 'Fever and body weakness for 2 days', 'Patient presented with mild fever, stable vitals.', 'Likely viral infection.', 'Hydration and rest. Paracetamol 500mg every 6 hours.', '2025-11-28', 'ART refill and viral load test.', '2025-11-16 12:47:06', '2025-11-16 12:51:55');

-- --------------------------------------------------------

--
-- Table structure for table `counseling_sessions`
--

CREATE TABLE `counseling_sessions` (
  `session_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `counselor_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `session_date` date DEFAULT curdate(),
  `session_type` enum('pre_test','post_test','adherence','mental_health','support','other') NOT NULL,
  `session_notes` text DEFAULT NULL,
  `follow_up_required` tinyint(1) DEFAULT 0,
  `follow_up_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_cache`
--

CREATE TABLE `dashboard_cache` (
  `cache_id` char(36) NOT NULL,
  `widget_id` varchar(100) NOT NULL,
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`parameters`)),
  `cached_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`cached_data`)),
  `cached_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `diagnoses`
--

CREATE TABLE `diagnoses` (
  `diagnosis_id` char(36) NOT NULL,
  `visit_id` char(36) NOT NULL,
  `icd10_code` varchar(10) DEFAULT NULL,
  `diagnosis_description` text NOT NULL,
  `diagnosis_type` enum('primary','secondary','differential','rule_out') DEFAULT 'primary',
  `is_chronic` tinyint(1) DEFAULT 0,
  `onset_date` date DEFAULT NULL,
  `resolved_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diagnoses`
--

INSERT INTO `diagnoses` (`diagnosis_id`, `visit_id`, `icd10_code`, `diagnosis_description`, `diagnosis_type`, `is_chronic`, `onset_date`, `resolved_date`) VALUES
('53b14af5-6f96-4a40-8749-00175687f846', '062cea3c-ff0c-44a5-9879-ec40b501b375', 'J11', 'Influenza due to unidentified influenza virus', 'primary', 0, '2025-01-08', '1899-11-29');

-- --------------------------------------------------------

--
-- Table structure for table `dispense_events`
--

CREATE TABLE `dispense_events` (
  `dispense_id` char(36) NOT NULL,
  `prescription_id` char(36) NOT NULL,
  `prescription_item_id` char(36) DEFAULT NULL,
  `nurse_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `dispensed_date` date DEFAULT curdate(),
  `quantity_dispensed` int(11) NOT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dispense_events`
--

INSERT INTO `dispense_events` (`dispense_id`, `prescription_id`, `prescription_item_id`, `nurse_id`, `facility_id`, `dispensed_date`, `quantity_dispensed`, `batch_number`, `notes`, `created_at`) VALUES
('18b81369-0723-475c-848d-1e42635e36ee', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 10, NULL, NULL, '2025-11-16 14:16:37'),
('4fe503a0-a9c0-4a4d-b3e5-8c199d274e07', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 12, NULL, NULL, '2025-11-16 14:40:56'),
('5c4e5a12-976c-4355-9a8a-a6a74e97ab02', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 1, NULL, NULL, '2025-11-16 14:21:53'),
('69c4d690-0433-4f6e-966a-efa5187c0537', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 1, NULL, NULL, '2025-11-16 14:22:19'),
('869e38b5-9591-4f4d-8357-dcf2d6b13d84', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 1, NULL, NULL, '2025-11-16 14:41:25'),
('d21ee17d-42f9-41b4-8d7e-ca12065de34f', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 4, NULL, NULL, '2025-11-16 14:45:22'),
('ebb1908b-a668-42c7-9e21-b96b27df753f', '8201188a-a4eb-4677-816f-08e0998056c2', '73771305-0ea9-4194-9997-4795ac0307dd', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 1, NULL, NULL, '2025-11-16 14:21:58');

-- --------------------------------------------------------

--
-- Table structure for table `facilities`
--

CREATE TABLE `facilities` (
  `facility_id` char(36) NOT NULL,
  `facility_name` varchar(150) NOT NULL,
  `facility_type` enum('main','branch','satellite','external') NOT NULL,
  `address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`address`)),
  `region_id` int(11) DEFAULT NULL,
  `contact_person` varchar(200) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `facilities`
--

INSERT INTO `facilities` (`facility_id`, `facility_name`, `facility_type`, `address`, `region_id`, `contact_person`, `contact_number`, `email`, `is_active`, `created_at`, `updated_at`) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'MyHubCares Main Facility', 'main', '{\"street\": \"123 Healthcare St\", \"city\": \"Manila\", \"province\": \"Metro Manila\", \"zip_code\": \"1000\"}', 1, 'Admin Office', '+63-2-1234-5678', 'main@myhubcares.com', 1, '2025-11-16 12:16:22', '2025-11-16 12:16:22');

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `feedback_id` char(36) NOT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `staff_id` char(36) DEFAULT NULL,
  `category` enum('service','system','staff','facility','other') DEFAULT 'service',
  `message` text NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_attachments`
--

CREATE TABLE `forum_attachments` (
  `attachment_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `uploaded_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_posts`
--

CREATE TABLE `forum_posts` (
  `post_id` char(36) NOT NULL,
  `topic_id` char(36) NOT NULL,
  `author_id` char(36) NOT NULL,
  `content` text NOT NULL,
  `parent_post_id` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_reactions`
--

CREATE TABLE `forum_reactions` (
  `reaction_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `reaction_type` enum('like','love','insightful','thankful','sad','angry') DEFAULT 'like',
  `reacted_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_threads`
--

CREATE TABLE `forum_threads` (
  `thread_id` char(36) NOT NULL,
  `group_id` char(36) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `created_by` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `last_post_at` datetime DEFAULT NULL,
  `status` enum('open','closed','archived') DEFAULT 'open',
  `views` int(11) DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_topics`
--

CREATE TABLE `forum_topics` (
  `topic_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('general','health','art','support','announcement') DEFAULT 'general',
  `created_by` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `group_id` char(36) NOT NULL,
  `group_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `group_type` enum('peer_support','education','admin','public') DEFAULT 'peer_support',
  `facility_id` char(36) DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_memberships`
--

CREATE TABLE `group_memberships` (
  `membership_id` char(36) NOT NULL,
  `group_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `role` enum('member','moderator','owner') DEFAULT 'member',
  `joined_at` datetime DEFAULT current_timestamp(),
  `joined_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hts_sessions`
--

CREATE TABLE `hts_sessions` (
  `hts_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `tester_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `test_date` date DEFAULT curdate(),
  `test_result` enum('positive','negative','indeterminate') NOT NULL,
  `test_type` varchar(50) DEFAULT NULL,
  `pre_test_counseling` tinyint(1) DEFAULT 0,
  `post_test_counseling` tinyint(1) DEFAULT 0,
  `linked_to_care` tinyint(1) DEFAULT 0,
  `care_link_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `item_id` char(36) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `item_category` enum('medical','lab','office','pharmacy','other') DEFAULT 'other',
  `unit` varchar(50) DEFAULT NULL,
  `reorder_level` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `in_app_messages`
--

CREATE TABLE `in_app_messages` (
  `message_id` char(36) NOT NULL,
  `sender_id` char(36) DEFAULT NULL,
  `recipient_id` char(36) DEFAULT NULL,
  `recipient_type` enum('user','patient','group') DEFAULT 'user',
  `group_id` char(36) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `is_read` tinyint(1) DEFAULT 0,
  `sent_at` datetime DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL,
  `priority` enum('low','normal','high') DEFAULT 'normal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `in_app_messages`
--

INSERT INTO `in_app_messages` (`message_id`, `sender_id`, `recipient_id`, `recipient_type`, `group_id`, `subject`, `body`, `payload`, `is_read`, `sent_at`, `read_at`, `priority`) VALUES
('016f557f-c8cc-4176-817a-3d46a103f46e', NULL, '22222222-2222-2222-2222-222222222222', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"57cfc6e9-db15-40fc-92c3-b776b3b8f37e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-17 19:17:08', NULL, 'high'),
('03d09fc0-ca33-4f7d-b61a-ee2766359df1', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Wednesday, November 19, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"8526a799-cfa0-41b9-84ba-7ac3ad4e0eb7\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"42356bf7-84ef-4aaa-9610-d74b65c3929f\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-18 22:42:34', '2025-11-18 22:45:01', 'normal'),
('19bd5e39-826b-4d78-98b2-89e85590d094', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Tuesday, November 18, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"622a6a79-2e6e-4368-af26-f6cc7a16918d\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-17 20:06:37', '2025-11-17 20:42:39', 'normal'),
('1b2abf7f-3b73-42a8-9861-e5183376e16b', NULL, '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"8526a799-cfa0-41b9-84ba-7ac3ad4e0eb7\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"42356bf7-84ef-4aaa-9610-d74b65c3929f\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 22:42:37', NULL, 'high'),
('2ce8fa36-dbd9-4382-ba2f-a30e2e28750e', NULL, '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Tuesday, November 18, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"622a6a79-2e6e-4368-af26-f6cc7a16918d\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-17 20:06:38', NULL, 'high'),
('30912b8b-f414-442a-bc14-59c58db0edd1', NULL, '22222222-2222-2222-2222-222222222222', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 12:00 PM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"952fa5c0-05c3-43f2-9d14-6236f057304b\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T04:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 23:14:34', NULL, 'high'),
('3fe5e1b7-623c-4ee9-957f-730d1de688ed', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"718dd879-e315-42d7-87ae-48fe7e55753e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 1, '2025-11-17 19:12:07', '2025-11-17 20:41:02', 'normal'),
('6cc2d45e-9b84-441c-a3f7-ae5bfc419e4e', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Tuesday, November 18, 2025 at 10:00 AM.', '{\"type\":\"appointment_created\",\"appointment_id\":\"5fd7a1d6-4ec7-4be6-b546-d589eca42c1f\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-17 18:58:12', '2025-11-17 20:41:04', 'normal'),
('8d77b52d-bc20-4f00-ba2d-c6655662e454', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"1d158955-a429-416c-95f4-8029225ca3b5\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 23:07:23', NULL, 'normal'),
('901f9f7e-beb1-4b9a-a7fa-6be528955d0f', NULL, '22222222-2222-2222-2222-222222222222', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Tuesday, November 18, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"622a6a79-2e6e-4368-af26-f6cc7a16918d\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-17 20:06:37', NULL, 'high'),
('9083255e-f926-4cf5-8614-e67f65e8256d', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"57cfc6e9-db15-40fc-92c3-b776b3b8f37e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 1, '2025-11-17 19:17:07', '2025-11-17 20:41:00', 'normal'),
('9e87b135-b107-416c-a9f4-dd603055f04e', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 12:00 PM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"952fa5c0-05c3-43f2-9d14-6236f057304b\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T04:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 23:14:34', NULL, 'normal'),
('a2ba4a3a-5856-4ebd-8cc1-ef55aeeae019', NULL, '22222222-2222-2222-2222-222222222222', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"1d158955-a429-416c-95f4-8029225ca3b5\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 23:07:23', NULL, 'high'),
('a47cb465-7d9f-4cc5-ab00-a24ae672e6eb', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Tuesday, November 18, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"622a6a79-2e6e-4368-af26-f6cc7a16918d\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 1, '2025-11-17 20:06:37', '2025-11-17 20:43:05', 'normal'),
('ac7a451f-1a3f-4c73-b2a1-52b2a6e3e3b6', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Wednesday, November 19, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"8526a799-cfa0-41b9-84ba-7ac3ad4e0eb7\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"42356bf7-84ef-4aaa-9610-d74b65c3929f\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-18 22:42:38', NULL, 'normal'),
('af200aac-2b18-4132-9800-2ca6ca9d3e33', NULL, '22222222-2222-2222-2222-222222222222', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"aebc132a-b44b-4600-8c8f-516ec55f28da\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-19 00:01:09', NULL, 'high'),
('c6c1d02d-3d98-463c-8c3e-e593820543b8', NULL, '44444444-4444-4444-4444-444444444444', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"aebc132a-b44b-4600-8c8f-516ec55f28da\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-19 00:01:09', NULL, 'normal'),
('c8087318-0da4-4a6b-8280-5af5735a170f', NULL, '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'user', NULL, 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', '{\"type\":\"appointment_created\",\"appointment_id\":\"57cfc6e9-db15-40fc-92c3-b776b3b8f37e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 1, '2025-11-17 19:17:08', '2025-11-17 19:31:21', 'high'),
('ce1683ef-ae48-4923-8f70-626becd8a7c4', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Thursday, November 20, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"57cfc6e9-db15-40fc-92c3-b776b3b8f37e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-17 19:17:07', '2025-11-17 20:42:48', 'normal'),
('e31f5fc0-e835-46f3-ab82-a88edce983b6', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Thursday, November 20, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"aebc132a-b44b-4600-8c8f-516ec55f28da\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 0, '2025-11-19 00:01:09', NULL, 'normal'),
('e6b1504b-0eb5-4e41-9aeb-b7a71173a93b', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Confirmation Required', 'Your initial appointment with Dr. Juan Dela Cruz at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM has been accepted. Please confirm to finalize your appointment.', '{\"type\":\"appointment_pending_confirmation\",\"appointment_id\":\"aebc132a-b44b-4600-8c8f-516ec55f28da\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-20T02:00:00.000Z\",\"appointment_type\":\"initial\",\"requires_confirmation\":true}', 0, '2025-11-19 00:01:33', NULL, 'high'),
('e81f506e-6c8e-45c7-a649-9012591a3080', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Wednesday, November 19, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"718dd879-e315-42d7-87ae-48fe7e55753e\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-17 19:12:06', '2025-11-17 20:35:36', 'normal'),
('f00c6521-3c8c-442e-b4ff-cf104aca3f12', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Wednesday, November 19, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"1d158955-a429-416c-95f4-8029225ca3b5\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 0, '2025-11-18 23:07:22', NULL, 'normal'),
('f526d268-1c22-44c0-a43b-9b873ca1fc18', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Request Submitted', 'Your initial appointment request for Wednesday, November 19, 2025 at 12:00 PM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', '{\"type\":\"appointment_created\",\"appointment_id\":\"952fa5c0-05c3-43f2-9d14-6236f057304b\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":\"22222222-2222-2222-2222-222222222222\",\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-19T04:00:00.000Z\",\"appointment_type\":\"initial\"}', 0, '2025-11-18 23:14:34', NULL, 'normal'),
('ff8d6b2d-ea3a-46b7-a220-d1e88ee1b58e', NULL, '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'user', NULL, 'Appointment Confirmed', 'Your initial appointment has been scheduled for Tuesday, November 18, 2025 at 10:00 AM at MyHubCares Main Facility.', '{\"type\":\"appointment_created\",\"appointment_id\":\"5fd7a1d6-4ec7-4be6-b546-d589eca42c1f\",\"patient_id\":\"80f7668b-3d92-42d0-a75c-eb4873fcc8c4\",\"provider_id\":null,\"facility_id\":\"550e8400-e29b-41d4-a716-446655440000\",\"scheduled_start\":\"2025-11-18T02:00:00.000Z\",\"appointment_type\":\"initial\"}', 1, '2025-11-17 18:58:11', '2025-11-18 23:54:18', 'normal');

-- --------------------------------------------------------

--
-- Table structure for table `lab_files`
--

CREATE TABLE `lab_files` (
  `file_id` char(36) NOT NULL,
  `result_id` char(36) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `uploaded_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lab_files`
--

INSERT INTO `lab_files` (`file_id`, `result_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_at`, `uploaded_by`) VALUES
('9573db2c-7c7c-4e96-9de9-eac49eaae743', 'd1cc561a-c533-4c17-bf09-4bc4d9841094', '545832021_1689460425052578_6722400524695115105_n.jpg', 'uploads\\lab-files\\1763354738746-355905833.jpg', 165137, 'image/jpeg', '2025-11-17 12:45:38', '22222222-2222-2222-2222-222222222222');

-- --------------------------------------------------------

--
-- Table structure for table `lab_orders`
--

CREATE TABLE `lab_orders` (
  `order_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `ordering_provider_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `order_date` date DEFAULT curdate(),
  `test_panel` varchar(100) NOT NULL,
  `priority` enum('routine','urgent','stat') DEFAULT 'routine',
  `status` enum('ordered','collected','in_progress','completed','cancelled') DEFAULT 'ordered',
  `collection_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lab_orders`
--

INSERT INTO `lab_orders` (`order_id`, `patient_id`, `ordering_provider_id`, `facility_id`, `order_date`, `test_panel`, `priority`, `status`, `collection_date`, `notes`, `created_at`) VALUES
('e3768174-a8b4-41f0-8579-83038959c1a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '2025-11-17', 'CD4 Count', 'routine', 'completed', '2025-11-30', NULL, '2025-11-17 12:28:23'),
('e4e5c4d0-e314-4c45-bf8f-bb3cacc27a9c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 'Viral Load', 'urgent', 'cancelled', '2025-11-16', NULL, '2025-11-16 21:35:53');

-- --------------------------------------------------------

--
-- Table structure for table `lab_results`
--

CREATE TABLE `lab_results` (
  `result_id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `test_code` varchar(50) NOT NULL,
  `test_name` varchar(150) NOT NULL,
  `result_value` varchar(100) NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `reference_range_min` decimal(10,2) DEFAULT NULL,
  `reference_range_max` decimal(10,2) DEFAULT NULL,
  `reference_range_text` varchar(100) DEFAULT NULL,
  `is_critical` tinyint(1) DEFAULT 0,
  `critical_alert_sent` tinyint(1) DEFAULT 0,
  `collected_at` date DEFAULT NULL,
  `reported_at` date DEFAULT curdate(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_id` char(36) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lab_results`
--

INSERT INTO `lab_results` (`result_id`, `order_id`, `patient_id`, `test_code`, `test_name`, `result_value`, `unit`, `reference_range_min`, `reference_range_max`, `reference_range_text`, `is_critical`, `critical_alert_sent`, `collected_at`, `reported_at`, `reviewed_at`, `reviewer_id`, `notes`, `created_at`, `created_by`) VALUES
('d1cc561a-c533-4c17-bf09-4bc4d9841094', 'e3768174-a8b4-41f0-8579-83038959c1a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CD4COUNT', 'CD4 Count', 'Okay naman siya', NULL, NULL, NULL, NULL, 0, 0, '2025-11-30', '2025-11-17', NULL, NULL, NULL, '2025-11-17 12:30:14', '22222222-2222-2222-2222-222222222222');

-- --------------------------------------------------------

--
-- Table structure for table `medications`
--

CREATE TABLE `medications` (
  `medication_id` char(36) NOT NULL,
  `medication_name` varchar(150) NOT NULL,
  `generic_name` varchar(150) DEFAULT NULL,
  `form` enum('tablet','capsule','syrup','injection','cream','other') NOT NULL,
  `strength` varchar(50) DEFAULT NULL,
  `atc_code` varchar(10) DEFAULT NULL,
  `is_art` tinyint(1) DEFAULT 0,
  `is_controlled` tinyint(1) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medications`
--

INSERT INTO `medications` (`medication_id`, `medication_name`, `generic_name`, `form`, `strength`, `atc_code`, `is_art`, `is_controlled`, `active`) VALUES
('65af6445-7630-4a2b-8851-d43fb66807ab', 'Tenofovir/Lamivudine/Dolutegravir (TLD)', 'TLD', 'tablet', '500mg', NULL, 1, 1, 1),
('9117b66c-a29f-43cc-ac78-5724222f7a38', 'Efavirenz 600mg', NULL, 'tablet', '600mg', NULL, 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `medication_adherence`
--

CREATE TABLE `medication_adherence` (
  `adherence_id` char(36) NOT NULL,
  `prescription_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `adherence_date` date DEFAULT curdate(),
  `taken` tinyint(1) DEFAULT 0,
  `missed_reason` text DEFAULT NULL,
  `adherence_percentage` decimal(5,2) DEFAULT NULL,
  `recorded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medication_adherence`
--

INSERT INTO `medication_adherence` (`adherence_id`, `prescription_id`, `patient_id`, `adherence_date`, `taken`, `missed_reason`, `adherence_percentage`, `recorded_at`) VALUES
('2ced69d2-8f05-4404-99e2-3f15062465f1', '69688306-fd70-41a5-8a71-9d41d0304072', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-11-16', 0, NULL, 100.00, '2025-11-16 19:17:38'),
('578827d5-0254-4a9d-b0ff-a91fdf6e9981', '8201188a-a4eb-4677-816f-08e0998056c2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-11-16', 1, NULL, 999.99, '2025-11-16 19:17:33');

-- --------------------------------------------------------

--
-- Table structure for table `medication_inventory`
--

CREATE TABLE `medication_inventory` (
  `inventory_id` char(36) NOT NULL,
  `medication_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `quantity_on_hand` int(11) DEFAULT 0,
  `unit` varchar(20) DEFAULT 'tablets',
  `expiry_date` date DEFAULT NULL,
  `reorder_level` int(11) DEFAULT 0,
  `last_restocked` date DEFAULT NULL,
  `supplier` varchar(200) DEFAULT NULL,
  `cost_per_unit` decimal(10,2) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medication_inventory`
--

INSERT INTO `medication_inventory` (`inventory_id`, `medication_id`, `facility_id`, `batch_number`, `quantity_on_hand`, `unit`, `expiry_date`, `reorder_level`, `last_restocked`, `supplier`, `cost_per_unit`, `created_at`) VALUES
('666db96b-ade7-4582-85d4-77e4edc49706', '65af6445-7630-4a2b-8851-d43fb66807ab', '550e8400-e29b-41d4-a716-446655440002', '1', 600, 'tablets', '2026-11-12', 200, '2025-11-15', 'MyHubCares Pharmacy', NULL, '2025-11-15 17:39:40'),
('79642a00-11ce-47eb-934a-1e9c3be7dd5c', '9117b66c-a29f-43cc-ac78-5724222f7a38', '550e8400-e29b-41d4-a716-446655440000', NULL, 270, 'tablets', '2026-11-16', 200, '2025-11-16', 'MyHubCares Pharmacy', 7.00, '2025-11-16 12:48:17'),
('f8788bf9-153b-4599-b162-3daee7bd95cb', '65af6445-7630-4a2b-8851-d43fb66807ab', '550e8400-e29b-41d4-a716-446655440000', NULL, 200, 'capsules', '2027-11-16', 50, NULL, NULL, NULL, '2025-11-16 12:48:51'),
('fcfefa31-7b0e-4e49-b11f-a11ef45c9694', '9117b66c-a29f-43cc-ac78-5724222f7a38', '550e8400-e29b-41d4-a716-446655440001', NULL, 100, 'tablets', '2026-11-15', 50, NULL, 'MyHubCares Pharmacy', 6.50, '2025-11-15 18:56:04');

-- --------------------------------------------------------

--
-- Table structure for table `medication_reminders`
--

CREATE TABLE `medication_reminders` (
  `reminder_id` char(36) NOT NULL,
  `prescription_id` char(36) DEFAULT NULL,
  `patient_id` char(36) NOT NULL,
  `medication_name` varchar(150) NOT NULL,
  `dosage` varchar(50) NOT NULL,
  `frequency` varchar(50) NOT NULL,
  `reminder_time` time NOT NULL,
  `sound_preference` enum('default','gentle','urgent') DEFAULT 'default',
  `browser_notifications` tinyint(1) DEFAULT 1,
  `special_instructions` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `missed_doses` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medication_reminders`
--

INSERT INTO `medication_reminders` (`reminder_id`, `prescription_id`, `patient_id`, `medication_name`, `dosage`, `frequency`, `reminder_time`, `sound_preference`, `browser_notifications`, `special_instructions`, `active`, `missed_doses`, `created_at`, `updated_at`) VALUES
('95875138-2098-424a-a8ca-5fe659480ca8', '8201188a-a4eb-4677-816f-08e0998056c2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Efavirenz 600mg', '1 tablet', 'Once daily', '09:00:00', 'default', 1, NULL, 1, 1, '2025-11-16 14:16:37', '2025-11-16 15:56:39');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` char(36) NOT NULL,
  `thread_id` char(36) NOT NULL,
  `sender_id` char(36) NOT NULL,
  `recipient_id` char(36) DEFAULT NULL,
  `content` text NOT NULL,
  `sent_at` datetime DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_threads`
--

CREATE TABLE `message_threads` (
  `thread_id` char(36) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `created_by` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mfa_tokens`
--

CREATE TABLE `mfa_tokens` (
  `mfa_token_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `method` enum('totp','sms','email') NOT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `code_hash` varchar(255) DEFAULT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` char(36) NOT NULL,
  `recipient_id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('system','reminder','alert','appointment','lab','custom') DEFAULT 'system',
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `recipient_id`, `title`, `message`, `type`, `is_read`, `read_at`, `created_at`) VALUES
('0d363ac7-4f78-4bb9-ad1c-8f36911dd944', '33333333-3333-3333-3333-333333333333', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:08'),
('22c00179-8d15-4172-88da-01be8a97bbcb', '42356bf7-84ef-4aaa-9610-d74b65c3929f', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('4bc141e4-b3fc-4de2-a6ea-cffe98f6af41', '22222222-2222-2222-2222-222222222222', 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', 'appointment', 1, NULL, '2025-11-19 00:01:09'),
('6c37e61d-d72f-4555-9a81-583f120563ba', '55555555-5555-5555-5555-555555555555', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('70f4420a-fbd5-45bf-9554-f1924fd651d0', '22222222-2222-2222-2222-222222222222', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:08'),
('7d5a5404-e148-4a43-a443-00194ae91935', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Appointment Confirmation Required', 'Your initial appointment with Dr. Juan Dela Cruz at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM has been accepted. Please confirm to finalize your appointment.', 'appointment', 1, NULL, '2025-11-19 00:01:33'),
('8e135a75-683f-49fe-a55b-0266621042a7', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Appointment Request Submitted', 'Your initial appointment request for Thursday, November 20, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('8ee0b820-ae73-46e7-8368-3f90b2905f35', '44444444-4444-4444-4444-444444444444', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('903c3cce-1b89-4b3c-a3c7-b062c789afde', '44444444-4444-4444-4444-444444444444', 'Appointment Confirmation Required: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM. Please accept or decline this appointment.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('a71e8623-8d2f-47d4-bc23-30b246ccfa9f', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Appointment Confirmation Required', 'Your appointment has been accepted. Please confirm.', 'appointment', 0, NULL, '2025-11-19 00:01:33'),
('d1e4d42e-8c54-448d-8c1f-acfe1a9cc471', '16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Appointment Request Submitted', 'Your initial appointment request for Thursday, November 20, 2025 at 10:00 AM at MyHubCares Main Facility has been submitted. Waiting for provider confirmation.', 'appointment', 0, NULL, '2025-11-19 00:01:09'),
('dd4ac8ce-ea69-4f17-9acb-0512e68d68d6', '11111111-1111-1111-1111-111111111111', 'New Appointment Scheduled: Hanna Sarabia', 'A new initial appointment has been scheduled for Hanna Sarabia at MyHubCares Main Facility on Thursday, November 20, 2025 at 10:00 AM.', 'appointment', 0, NULL, '2025-11-19 00:01:08');

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `patient_id` char(36) NOT NULL,
  `uic` varchar(30) NOT NULL,
  `philhealth_no` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `birth_date` date NOT NULL,
  `sex` enum('M','F','O') NOT NULL,
  `civil_status` enum('Single','Married','Divorced','Widowed','Separated') DEFAULT NULL,
  `nationality` varchar(50) DEFAULT 'Filipino',
  `current_city` varchar(100) DEFAULT NULL,
  `current_province` varchar(100) DEFAULT NULL,
  `current_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`current_address`)),
  `contact_phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `mother_name` varchar(200) DEFAULT NULL,
  `father_name` varchar(200) DEFAULT NULL,
  `birth_order` int(11) DEFAULT NULL,
  `guardian_name` varchar(200) DEFAULT NULL,
  `guardian_relationship` varchar(50) DEFAULT NULL,
  `facility_id` char(36) NOT NULL,
  `arpa_risk_score` decimal(5,2) DEFAULT NULL,
  `arpa_last_calculated` date DEFAULT NULL,
  `status` enum('active','inactive','deceased','transferred') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp(),
  `created_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`patient_id`, `uic`, `philhealth_no`, `first_name`, `middle_name`, `last_name`, `suffix`, `birth_date`, `sex`, `civil_status`, `nationality`, `current_city`, `current_province`, `current_address`, `contact_phone`, `email`, `mother_name`, `father_name`, `birth_order`, `guardian_name`, `guardian_relationship`, `facility_id`, `arpa_risk_score`, `arpa_last_calculated`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
('2fe2674f-5147-4d96-8c68-54caa67efcfc', 'GRJO0110-05-2002', NULL, 'Trixie', NULL, 'Morales', NULL, '2002-10-05', 'F', 'Single', 'Filipino', 'Sampaloc', 'Metro Manila', '{\"city\":\"Sampaloc\",\"province\":\"Metro Manila\"}', '09275649283', 'hannasarabia879@gmail.com', 'Grace Morales', 'John Morales', 1, NULL, NULL, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL, 'active', '2025-11-17 16:14:27', '2025-11-17 16:14:27', '42356bf7-84ef-4aaa-9610-d74b65c3929f'),
('80f7668b-3d92-42d0-a75c-eb4873fcc8c4', 'EDDE0106-01-2004', NULL, 'Hanna', 'N.', 'Sarabia', NULL, '2004-06-01', 'F', 'Single', 'Filipino', 'Caloocan', 'Metro Manila', '{\"city\":\"Caloocan\",\"province\":\"Metro Manila\"}', '0966-312-2562', 'sarabia.hanna.bsinfotech@gmail.com', 'Edita Narzoles Sarabia', 'Delfin Mirano Sarabia', 1, NULL, NULL, '550e8400-e29b-41d4-a716-446655440000', NULL, NULL, 'active', '2025-11-17 16:07:51', '2025-11-17 16:07:51', '16bec9d0-6123-4428-b9a3-fea81c3592a0'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MARJOS01-15-1990', 'PH123456789', 'Jose', 'Maria', 'Reyes', NULL, '1990-01-15', 'M', 'Single', 'Filipino', 'Manila', 'Metro Manila', '{\"street\": \"456 Patient Ave\", \"barangay\": \"Barangay 1\", \"city\": \"Manila\", \"province\": \"Metro Manila\", \"zip_code\": \"1001\"}', '+63-912-345-6794', 'patient@myhubcares.com', 'Maria Reyes', 'Jose Reyes Sr.', 1, NULL, NULL, '550e8400-e29b-41d4-a716-446655440000', 25.50, '2025-01-15', 'active', '2025-11-16 12:16:23', '2025-11-16 12:16:23', '11111111-1111-1111-1111-111111111111');

-- --------------------------------------------------------

--
-- Table structure for table `patient_art_history`
--

CREATE TABLE `patient_art_history` (
  `history_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `regimen_id` char(36) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason_for_change` text DEFAULT NULL,
  `outcome` enum('ongoing','completed','discontinued','transferred_out','died') DEFAULT 'ongoing',
  `recorded_by` char(36) DEFAULT NULL,
  `recorded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_documents`
--

CREATE TABLE `patient_documents` (
  `document_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `document_type` enum('consent','id_copy','medical_record','lab_result','other') NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `uploaded_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_identifiers`
--

CREATE TABLE `patient_identifiers` (
  `identifier_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `id_type` enum('passport','driver_license','sss','tin','other') NOT NULL,
  `id_value` varchar(100) NOT NULL,
  `issued_at` date DEFAULT NULL,
  `expires_at` date DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_identifiers`
--

INSERT INTO `patient_identifiers` (`identifier_id`, `patient_id`, `id_type`, `id_value`, `issued_at`, `expires_at`, `verified`) VALUES
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sss', '34-1234567-8', '2010-01-15', NULL, 1),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiij', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tin', '123-456-789-000', '2012-05-20', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `patient_risk_scores`
--

CREATE TABLE `patient_risk_scores` (
  `risk_score_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `calculated_on` date DEFAULT curdate(),
  `risk_factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`risk_factors`)),
  `recommendations` text DEFAULT NULL,
  `calculated_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_risk_scores`
--

INSERT INTO `patient_risk_scores` (`risk_score_id`, `patient_id`, `score`, `calculated_on`, `risk_factors`, `recommendations`, `calculated_by`) VALUES
('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 25.50, '2025-01-15', '{\"age\": 35, \"adherence_rate\": 85, \"cd4_count\": 450, \"viral_load\": 200, \"comorbidities\": [\"hypertension\"]}', 'Continue current ART regimen. Monitor blood pressure regularly. Schedule follow-up in 3 months.', '22222222-2222-2222-2222-222222222222'),
('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrs', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 23.75, '2024-12-15', '{\"age\": 35, \"adherence_rate\": 88, \"cd4_count\": 420, \"viral_load\": 150, \"comorbidities\": [\"hypertension\"]}', 'Good adherence. Continue monitoring.', '22222222-2222-2222-2222-222222222222');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `permission_id` char(36) NOT NULL,
  `permission_code` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`permission_id`, `permission_code`, `permission_name`, `module`, `action`, `description`) VALUES
('perm-0000-0000-0000-000000000001', 'patient.create', 'Create Patient', 'Patients', 'create', 'Create new patient records'),
('perm-0000-0000-0000-000000000002', 'patient.read', 'View Patient', 'Patients', 'read', 'View patient records and information'),
('perm-0000-0000-0000-000000000003', 'patient.update', 'Update Patient', 'Patients', 'update', 'Update patient records and information'),
('perm-0000-0000-0000-000000000004', 'patient.delete', 'Delete Patient', 'Patients', 'delete', 'Delete patient records'),
('perm-0000-0000-0000-000000000005', 'user.create', 'Create User', 'Users', 'create', 'Create new user accounts'),
('perm-0000-0000-0000-000000000006', 'user.read', 'View User', 'Users', 'read', 'View user accounts and information'),
('perm-0000-0000-0000-000000000007', 'user.update', 'Update User', 'Users', 'update', 'Update user accounts and information'),
('perm-0000-0000-0000-000000000008', 'user.delete', 'Delete User', 'Users', 'delete', 'Delete user accounts'),
('perm-0000-0000-0000-000000000009', 'clinical_visit.create', 'Create Clinical Visit', 'Clinical Visits', 'create', 'Create new clinical visit records'),
('perm-0000-0000-0000-000000000010', 'clinical_visit.read', 'View Clinical Visit', 'Clinical Visits', 'read', 'View clinical visit records'),
('perm-0000-0000-0000-000000000011', 'clinical_visit.update', 'Update Clinical Visit', 'Clinical Visits', 'update', 'Update clinical visit records'),
('perm-0000-0000-0000-000000000012', 'clinical_visit.delete', 'Delete Clinical Visit', 'Clinical Visits', 'delete', 'Delete clinical visit records'),
('perm-0000-0000-0000-000000000013', 'prescription.create', 'Create Prescription', 'Prescriptions', 'create', 'Create new prescriptions'),
('perm-0000-0000-0000-000000000014', 'prescription.read', 'View Prescription', 'Prescriptions', 'read', 'View prescription records'),
('perm-0000-0000-0000-000000000015', 'prescription.update', 'Update Prescription', 'Prescriptions', 'update', 'Update prescription records'),
('perm-0000-0000-0000-000000000016', 'prescription.delete', 'Delete Prescription', 'Prescriptions', 'delete', 'Delete prescription records'),
('perm-0000-0000-0000-000000000017', 'appointment.create', 'Create Appointment', 'Appointments', 'create', 'Create new appointments'),
('perm-0000-0000-0000-000000000018', 'appointment.read', 'View Appointment', 'Appointments', 'read', 'View appointment records'),
('perm-0000-0000-0000-000000000019', 'appointment.update', 'Update Appointment', 'Appointments', 'update', 'Update appointment records'),
('perm-0000-0000-0000-000000000020', 'appointment.delete', 'Delete Appointment', 'Appointments', 'delete', 'Delete appointment records'),
('perm-0000-0000-0000-000000000021', 'lab_test.create', 'Create Lab Test', 'Lab Tests', 'create', 'Create new lab test records'),
('perm-0000-0000-0000-000000000022', 'lab_test.read', 'View Lab Test', 'Lab Tests', 'read', 'View lab test records'),
('perm-0000-0000-0000-000000000023', 'lab_test.update', 'Update Lab Test', 'Lab Tests', 'update', 'Update lab test records'),
('perm-0000-0000-0000-000000000024', 'lab_test.delete', 'Delete Lab Test', 'Lab Tests', 'delete', 'Delete lab test records'),
('perm-0000-0000-0000-000000000025', 'inventory.create', 'Create Inventory', 'Inventory', 'create', 'Create new inventory items'),
('perm-0000-0000-0000-000000000026', 'inventory.read', 'View Inventory', 'Inventory', 'read', 'View inventory records'),
('perm-0000-0000-0000-000000000027', 'inventory.update', 'Update Inventory', 'Inventory', 'update', 'Update inventory records'),
('perm-0000-0000-0000-000000000028', 'inventory.delete', 'Delete Inventory', 'Inventory', 'delete', 'Delete inventory records'),
('perm-0000-0000-0000-000000000029', 'facility.create', 'Create Facility', 'Facilities', 'create', 'Create new facilities'),
('perm-0000-0000-0000-000000000030', 'facility.read', 'View Facility', 'Facilities', 'read', 'View facility records'),
('perm-0000-0000-0000-000000000031', 'facility.update', 'Update Facility', 'Facilities', 'update', 'Update facility records'),
('perm-0000-0000-0000-000000000032', 'facility.delete', 'Delete Facility', 'Facilities', 'delete', 'Delete facility records'),
('perm-0000-0000-0000-000000000033', 'role.create', 'Create Role', 'Roles', 'create', 'Create new roles'),
('perm-0000-0000-0000-000000000034', 'role.read', 'View Role', 'Roles', 'read', 'View role records'),
('perm-0000-0000-0000-000000000035', 'role.update', 'Update Role', 'Roles', 'update', 'Update role records'),
('perm-0000-0000-0000-000000000036', 'role.delete', 'Delete Role', 'Roles', 'delete', 'Delete role records'),
('perm-0000-0000-0000-000000000037', 'permission.manage', 'Manage Permissions', 'Permissions', 'manage', 'Manage permissions and role assignments'),
('perm-0000-0000-0000-000000000038', 'report.view', 'View Reports', 'Reports', 'read', 'View system reports and analytics'),
('perm-0000-0000-0000-000000000039', 'report.export', 'Export Reports', 'Reports', 'export', 'Export reports and data');

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `prescription_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `prescriber_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `prescription_date` date DEFAULT curdate(),
  `prescription_number` varchar(50) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `duration_days` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','completed','cancelled','expired') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `prescriptions`
--

INSERT INTO `prescriptions` (`prescription_id`, `patient_id`, `prescriber_id`, `facility_id`, `prescription_date`, `prescription_number`, `start_date`, `end_date`, `duration_days`, `notes`, `status`, `created_at`) VALUES
('69688306-fd70-41a5-8a71-9d41d0304072', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 'RX-20251116-0002', '2025-11-16', '2025-12-16', NULL, NULL, 'active', '2025-11-16 16:07:16'),
('8201188a-a4eb-4677-816f-08e0998056c2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '2025-11-16', 'RX-20251116-0001', '2025-11-16', '2025-12-16', NULL, 'if symptoms persist, please contact immediately the doctor', 'active', '2025-11-16 12:55:04'),
('82f27f2c-2eaa-44de-9661-488f51d92c4b', '80f7668b-3d92-42d0-a75c-eb4873fcc8c4', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '2025-11-17', 'RX-20251117-0001', '2025-11-17', '2025-12-17', NULL, NULL, 'active', '2025-11-17 16:31:30');

-- --------------------------------------------------------

--
-- Table structure for table `prescription_items`
--

CREATE TABLE `prescription_items` (
  `prescription_item_id` char(36) NOT NULL,
  `prescription_id` char(36) NOT NULL,
  `medication_id` char(36) NOT NULL,
  `dosage` varchar(50) NOT NULL,
  `frequency` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `instructions` text DEFAULT NULL,
  `duration_days` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `prescription_items`
--

INSERT INTO `prescription_items` (`prescription_item_id`, `prescription_id`, `medication_id`, `dosage`, `frequency`, `quantity`, `instructions`, `duration_days`) VALUES
('73771305-0ea9-4194-9997-4795ac0307dd', '8201188a-a4eb-4677-816f-08e0998056c2', '9117b66c-a29f-43cc-ac78-5724222f7a38', '1 tablet', 'Once daily', 1, 'After lunch, when the stomach is full', 30),
('acb91d51-cf61-4d84-bf8e-4278c739eefe', '82f27f2c-2eaa-44de-9661-488f51d92c4b', '9117b66c-a29f-43cc-ac78-5724222f7a38', '1 tablet', 'Once Daily', 1, NULL, 30),
('e527cebd-be4e-4e8e-a51a-405c5d3ddfaa', '69688306-fd70-41a5-8a71-9d41d0304072', '65af6445-7630-4a2b-8851-d43fb66807ab', '1 tablet', 'Once', 1, 'after lunch, 1 pm', 30);

-- --------------------------------------------------------

--
-- Table structure for table `procedures`
--

CREATE TABLE `procedures` (
  `procedure_id` char(36) NOT NULL,
  `visit_id` char(36) NOT NULL,
  `cpt_code` varchar(8) DEFAULT NULL,
  `procedure_name` varchar(200) NOT NULL,
  `procedure_description` text DEFAULT NULL,
  `outcome` text DEFAULT NULL,
  `performed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procedures`
--

INSERT INTO `procedures` (`procedure_id`, `visit_id`, `cpt_code`, `procedure_name`, `procedure_description`, `outcome`, `performed_at`) VALUES
('4b7f8aef-abfc-42dc-beb5-580148c154a3', '062cea3c-ff0c-44a5-9879-ec40b501b375', '71045', 'Chest X-ray', 'Standard PA chest radiograph performed.', 'No acute findings.', '2025-11-16 04:49:00');

-- --------------------------------------------------------

--
-- Table structure for table `program_indicators`
--

CREATE TABLE `program_indicators` (
  `indicator_id` char(36) NOT NULL,
  `indicator_name` varchar(200) NOT NULL,
  `indicator_code` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `current_value` decimal(10,2) DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `facility_id` char(36) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `push_notifications`
--

CREATE TABLE `push_notifications` (
  `push_id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `provider_response` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `referral_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `from_facility_id` char(36) NOT NULL,
  `to_facility_id` char(36) NOT NULL,
  `referral_reason` text NOT NULL,
  `urgency` enum('routine','urgent','emergency') DEFAULT 'routine',
  `status` enum('pending','accepted','in_transit','completed','rejected','cancelled') DEFAULT 'pending',
  `clinical_notes` text DEFAULT NULL,
  `referred_by` char(36) NOT NULL,
  `referred_at` datetime DEFAULT current_timestamp(),
  `accepted_at` datetime DEFAULT NULL,
  `accepted_by` char(36) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `regions`
--

CREATE TABLE `regions` (
  `region_id` int(11) NOT NULL,
  `region_name` varchar(150) NOT NULL,
  `region_code` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `regions`
--

INSERT INTO `regions` (`region_id`, `region_name`, `region_code`, `is_active`, `created_at`) VALUES
(1, 'National Capital Region (NCR)', 'NCR', 1, '2025-11-11 09:51:22'),
(2, 'Cordillera Administrative Region', 'CAR', 1, '2025-11-11 09:51:22'),
(3, 'Ilocos Region', 'I', 1, '2025-11-11 09:51:22'),
(4, 'Cagayan Valley', 'II', 1, '2025-11-11 09:51:22'),
(5, 'Central Luzon', 'III', 1, '2025-11-11 09:51:22'),
(6, 'CALABARZON', 'IV-A', 1, '2025-11-11 09:51:22'),
(7, 'MIMAROPA', 'IV-B', 1, '2025-11-11 09:51:22'),
(8, 'Bicol Region', 'V', 1, '2025-11-11 09:51:22'),
(9, 'Western Visayas', 'VI', 1, '2025-11-11 09:51:22'),
(10, 'Central Visayas', 'VII', 1, '2025-11-11 09:51:22');

-- --------------------------------------------------------

--
-- Table structure for table `remote_monitoring_data`
--

CREATE TABLE `remote_monitoring_data` (
  `data_id` char(36) NOT NULL,
  `device_id` char(36) NOT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `recorded_at` datetime DEFAULT current_timestamp(),
  `metric_key` varchar(100) DEFAULT NULL,
  `metric_value` varchar(200) DEFAULT NULL,
  `raw_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `processed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remote_monitoring_devices`
--

CREATE TABLE `remote_monitoring_devices` (
  `device_id` char(36) NOT NULL,
  `device_name` varchar(200) NOT NULL,
  `manufacturer` varchar(200) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `serial_number` varchar(200) DEFAULT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `last_synced_at` datetime DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_queries`
--

CREATE TABLE `report_queries` (
  `report_id` char(36) NOT NULL,
  `report_name` varchar(150) NOT NULL,
  `report_description` text DEFAULT NULL,
  `report_type` enum('patient','clinical','inventory','survey','custom') NOT NULL,
  `query_definition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`query_definition`)),
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parameters`)),
  `schedule` varchar(50) DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_runs`
--

CREATE TABLE `report_runs` (
  `run_id` char(36) NOT NULL,
  `report_id` char(36) NOT NULL,
  `started_at` datetime DEFAULT current_timestamp(),
  `finished_at` datetime DEFAULT NULL,
  `status` enum('running','completed','failed','cancelled') DEFAULT 'running',
  `parameters_used` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parameters_used`)),
  `output_ref` varchar(500) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `run_by` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` char(36) NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system_role` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_code`, `role_name`, `description`, `is_system_role`, `created_at`) VALUES
('role-0000-0000-0000-000000000001', 'admin', 'Administrator', 'System administrator with full access to all features and settings', 1, '2025-11-16 12:18:28'),
('role-0000-0000-0000-000000000002', 'physician', 'Physician', 'Medical doctor with access to patient records, prescriptions, and clinical visits', 1, '2025-11-16 12:18:28'),
('role-0000-0000-0000-000000000003', 'nurse', 'Nurse', 'Nursing staff with access to patient care, appointments, and clinical documentation', 1, '2025-11-16 12:18:28'),
('role-0000-0000-0000-000000000004', 'case_manager', 'Case Manager', 'Case manager with access to patient coordination, referrals, and counseling', 1, '2025-11-16 12:18:28'),
('role-0000-0000-0000-000000000005', 'lab_personnel', 'Lab Personnel', 'Laboratory staff with access to lab tests and inventory management', 1, '2025-11-16 12:18:28'),
('role-0000-0000-0000-000000000006', 'patient', 'Patient', 'Patient with access to their own records, appointments, and profile', 1, '2025-11-16 12:18:28');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_permission_id` char(36) NOT NULL,
  `role_id` char(36) NOT NULL,
  `permission_id` char(36) NOT NULL,
  `granted_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `granted_at`) VALUES
('rp-admin-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000001', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000002', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000003', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000004', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000004', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000005', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000005', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000006', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000006', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000007', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000007', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000008', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000008', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000009', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000010', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000011', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000012', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000012', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000013', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000013', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000014', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000015', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000015', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000016', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000016', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000017', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000018', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000019', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000020', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000020', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000021', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000021', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000022', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000023', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000023', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000024', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000024', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000025', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000025', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000026', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000026', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000027', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000027', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000028', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000028', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000029', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000029', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000030', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000030', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000031', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000031', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000032', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000032', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000033', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000033', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000034', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000034', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000035', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000035', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000036', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000036', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000037', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000037', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000038', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000038', '2025-11-16 12:18:28'),
('rp-admin-0001-0001-0001-000000000039', 'role-0000-0000-0000-000000000001', 'perm-0000-0000-0000-000000000039', '2025-11-16 12:18:28'),
('rp-case-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000002', '2025-11-16 12:18:29'),
('rp-case-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000003', '2025-11-16 12:18:29'),
('rp-case-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000010', '2025-11-16 12:18:29'),
('rp-case-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000018', '2025-11-16 12:18:29'),
('rp-case-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000004', 'perm-0000-0000-0000-000000000019', '2025-11-16 12:18:29'),
('rp-labp-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000021', '2025-11-16 12:18:29'),
('rp-labp-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000022', '2025-11-16 12:18:29'),
('rp-labp-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000023', '2025-11-16 12:18:29'),
('rp-labp-0001-0001-0001-000000000004', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000026', '2025-11-16 12:18:29'),
('rp-labp-0001-0001-0001-000000000005', 'role-0000-0000-0000-000000000005', 'perm-0000-0000-0000-000000000027', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000002', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000003', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000009', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000010', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000011', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000014', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000017', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000018', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000019', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000021', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000021', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000022', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000023', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000023', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000026', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000026', '2025-11-16 12:18:29'),
('rp-nurs-0001-0001-0001-000000000027', 'role-0000-0000-0000-000000000003', 'perm-0000-0000-0000-000000000027', '2025-11-16 12:18:29'),
('rp-pat-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000002', '2025-11-16 12:18:29'),
('rp-pat-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000018', '2025-11-16 12:18:29'),
('rp-pat-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000006', 'perm-0000-0000-0000-000000000022', '2025-11-16 12:18:29'),
('rp-phys-0001-0001-0001-000000000001', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000001', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000002', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000002', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000003', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000003', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000009', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000009', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000010', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000010', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000011', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000011', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000013', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000013', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000014', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000014', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000015', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000015', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000017', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000017', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000018', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000018', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000019', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000019', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000022', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000022', '2025-11-16 12:18:28'),
('rp-phys-0001-0001-0001-000000000038', 'role-0000-0000-0000-000000000002', 'perm-0000-0000-0000-000000000038', '2025-11-16 12:18:28');

-- --------------------------------------------------------

--
-- Table structure for table `sms_queue`
--

CREATE TABLE `sms_queue` (
  `sms_id` char(36) NOT NULL,
  `to_number` varchar(50) NOT NULL,
  `patient_id` char(36) DEFAULT NULL,
  `message` text NOT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `provider_response` text DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_entries`
--

CREATE TABLE `stock_entries` (
  `stock_id` char(36) NOT NULL,
  `item_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `received_at` datetime DEFAULT current_timestamp(),
  `received_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `movement_id` char(36) NOT NULL,
  `item_id` char(36) NOT NULL,
  `from_facility_id` char(36) DEFAULT NULL,
  `to_facility_id` char(36) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `movement_type` enum('transfer','adjustment','return','damage') NOT NULL,
  `notes` text DEFAULT NULL,
  `moved_by` char(36) DEFAULT NULL,
  `moved_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` char(36) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`address`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `surveys`
--

CREATE TABLE `surveys` (
  `survey_id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `target_audience` enum('patients','staff','all') DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT 1,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_answers`
--

CREATE TABLE `survey_answers` (
  `answer_id` char(36) NOT NULL,
  `response_id` char(36) NOT NULL,
  `question_id` char(36) NOT NULL,
  `answer_text` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_questions`
--

CREATE TABLE `survey_questions` (
  `question_id` char(36) NOT NULL,
  `survey_id` char(36) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('text','multiple_choice','rating','boolean') NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `position` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_responses`
--

CREATE TABLE `survey_responses` (
  `response_id` char(36) NOT NULL,
  `survey_id` char(36) NOT NULL,
  `respondent_id` char(36) DEFAULT NULL,
  `submitted_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`setting_value`)),
  `description` text DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp(),
  `updated_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teleconsultations`
--

CREATE TABLE `teleconsultations` (
  `consult_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `provider_id` char(36) DEFAULT NULL,
  `facility_id` char(36) DEFAULT NULL,
  `scheduled_start` datetime NOT NULL,
  `scheduled_end` datetime DEFAULT NULL,
  `join_url` varchar(1000) DEFAULT NULL,
  `consult_type` enum('video','phone','chat') DEFAULT 'video',
  `status` enum('scheduled','in_progress','completed','cancelled','no_show') DEFAULT 'scheduled',
  `summary` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teleconsult_notes`
--

CREATE TABLE `teleconsult_notes` (
  `note_id` char(36) NOT NULL,
  `consult_id` char(36) NOT NULL,
  `author_id` char(36) NOT NULL,
  `note_text` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` char(36) NOT NULL,
  `username` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `role` enum('admin','physician','nurse','case_manager','lab_personnel','patient') NOT NULL,
  `status` enum('active','inactive','suspended','pending') DEFAULT 'active',
  `facility_id` char(36) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `mfa_enabled` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp(),
  `created_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `full_name`, `role`, `status`, `facility_id`, `phone`, `last_login`, `failed_login_attempts`, `locked_until`, `mfa_enabled`, `created_at`, `updated_at`, `created_by`) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@myhubcares.com', '$2b$10$y.8OIKHZgCeiQiugZ.zG/uh2KMlKm43mW0MQD0bZhV4s83chdJEJm', 'System Administrator', 'admin', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6789', '2025-11-18 22:24:33', 0, NULL, 0, '2025-11-16 12:16:22', '2025-11-16 12:16:22', NULL),
('16bec9d0-6123-4428-b9a3-fea81c3592a0', 'Hanapot', 'sarabia.hanna.bsinfotech@gmail.com', '$2b$10$aLwTcLHqWtUvn899h6lWXeuUXn/qWIS6YmqIn6l0fQn/Cnzm/Ofde', 'Hanna N. Sarabia', 'patient', 'active', '550e8400-e29b-41d4-a716-446655440000', '0966-312-2562', '2025-11-19 00:03:09', 0, NULL, 0, '2025-11-17 16:07:50', '2025-11-17 16:07:50', NULL),
('22222222-2222-2222-2222-222222222222', 'physician', 'physician@myhubcares.com', '$2b$10$ofhNZLH1Fz0Ifa3MXDszw.mmdF.//52oSfNwBnmAqPFugn2U4.oXy', 'Dr. Juan Dela Cruz', 'physician', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6790', '2025-11-18 23:53:35', 0, NULL, 0, '2025-11-16 12:16:22', '2025-11-16 12:16:22', NULL),
('33333333-3333-3333-3333-333333333333', 'nurse', 'nurse@myhubcares.com', '$2b$10$BYMKMtPXH6J1jAPGZIcGN.hKRkV5jjUEePcqYnscOvdE99gpn1jn.', 'Maria Santos', 'nurse', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6791', '2025-11-16 14:21:27', 0, NULL, 0, '2025-11-16 12:16:23', '2025-11-16 12:16:23', NULL),
('42356bf7-84ef-4aaa-9610-d74b65c3929f', 'Trixie', 'hannasarabia879@gmail.com', '$2b$10$vJRdKCkyHjJy2CbEG0oJMuZJkTzUYNONxs/YmyluIGIf9wOzJIfp.', 'Trixie Morales', 'physician', 'active', '550e8400-e29b-41d4-a716-446655440000', '09275649283', '2025-11-17 19:13:26', 0, NULL, 0, '2025-11-17 16:14:27', '2025-11-17 16:14:27', NULL),
('44444444-4444-4444-4444-444444444444', 'case_manager', 'casemanager@myhubcares.com', '$2b$10$jTwo7uslBQw3H7IIExQhy.AcOr9/WoEKbCYESggVsRnAQ2458UXD6', 'Pedro Garcia', 'case_manager', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6792', '2025-11-17 20:02:32', 0, NULL, 0, '2025-11-16 12:16:23', '2025-11-16 12:16:23', NULL),
('55555555-5555-5555-5555-555555555555', 'lab_personnel', 'lab@myhubcares.com', '$2b$10$r9sKBgkbSVBEcyKsjhjhUupcIrmWooCUDkVokj.GVvbuRd9ZcD/uu', 'Ana Rodriguez', 'lab_personnel', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6793', NULL, 0, NULL, 0, '2025-11-16 12:16:23', '2025-11-16 12:16:23', NULL),
('66666666-6666-6666-6666-666666666666', 'patient', 'patient@myhubcares.com', '$2b$10$fOHLfsU/xrmSwXWJygw3luHwaj4GO90abp.Kzcp.EPPDuBHqfeJCi', 'Jose Reyes', 'patient', 'active', '550e8400-e29b-41d4-a716-446655440000', '+63-912-345-6794', '2025-11-17 15:52:57', 0, NULL, 0, '2025-11-16 12:16:23', '2025-11-16 12:16:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_facility_assignments`
--

CREATE TABLE `user_facility_assignments` (
  `assignment_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `assigned_at` datetime DEFAULT current_timestamp(),
  `assigned_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_role_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `role_id` char(36) NOT NULL,
  `assigned_at` datetime DEFAULT current_timestamp(),
  `assigned_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`user_role_id`, `user_id`, `role_id`, `assigned_at`, `assigned_by`) VALUES
('ur-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'role-0000-0000-0000-000000000001', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'role-0000-0000-0000-000000000002', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'role-0000-0000-0000-000000000003', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'role-0000-0000-0000-000000000004', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'role-0000-0000-0000-000000000005', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111'),
('ur-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'role-0000-0000-0000-000000000006', '2025-11-16 12:18:30', '11111111-1111-1111-1111-111111111111');

-- --------------------------------------------------------

--
-- Table structure for table `vaccination_records`
--

CREATE TABLE `vaccination_records` (
  `vaccination_id` char(36) NOT NULL,
  `patient_id` char(36) NOT NULL,
  `vaccine_id` char(36) NOT NULL,
  `provider_id` char(36) NOT NULL,
  `facility_id` char(36) NOT NULL,
  `dose_number` int(11) NOT NULL,
  `total_doses` int(11) NOT NULL,
  `date_given` date DEFAULT curdate(),
  `next_dose_due` date DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `administration_site` enum('left_arm','right_arm','left_thigh','right_thigh','other') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('complete','in_progress','due_soon','overdue') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vaccine_catalog`
--

CREATE TABLE `vaccine_catalog` (
  `vaccine_id` char(36) NOT NULL,
  `vaccine_name` varchar(150) NOT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `series_length` int(11) NOT NULL,
  `dose_intervals` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dose_intervals`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vital_signs`
--

CREATE TABLE `vital_signs` (
  `vital_id` char(36) NOT NULL,
  `visit_id` char(36) NOT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `systolic_bp` int(11) DEFAULT NULL,
  `diastolic_bp` int(11) DEFAULT NULL,
  `pulse_rate` int(11) DEFAULT NULL,
  `temperature_c` decimal(4,1) DEFAULT NULL,
  `respiratory_rate` int(11) DEFAULT NULL,
  `oxygen_saturation` decimal(4,1) DEFAULT NULL,
  `recorded_at` datetime DEFAULT current_timestamp(),
  `recorded_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vital_signs`
--

INSERT INTO `vital_signs` (`vital_id`, `visit_id`, `height_cm`, `weight_kg`, `bmi`, `systolic_bp`, `diastolic_bp`, `pulse_rate`, `temperature_c`, `respiratory_rate`, `oxygen_saturation`, `recorded_at`, `recorded_by`) VALUES
('c9853565-9700-4b99-8eb3-3f85054856e5', '062cea3c-ff0c-44a5-9879-ec40b501b375', 170.00, 63.50, 21.97, 120, 80, 82, 37.8, 18, NULL, '2025-11-16 12:47:06', '22222222-2222-2222-2222-222222222222');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `booked_by` (`booked_by`),
  ADD KEY `cancelled_by` (`cancelled_by`);

--
-- Indexes for table `appointment_reminders`
--
ALTER TABLE `appointment_reminders`
  ADD PRIMARY KEY (`reminder_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `art_regimens`
--
ALTER TABLE `art_regimens`
  ADD PRIMARY KEY (`regimen_id`),
  ADD UNIQUE KEY `regimen_code` (`regimen_code`);

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_module` (`module`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `availability_slots`
--
ALTER TABLE `availability_slots`
  ADD PRIMARY KEY (`slot_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `care_tasks`
--
ALTER TABLE `care_tasks`
  ADD PRIMARY KEY (`task_id`),
  ADD KEY `referral_id` (`referral_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `assignee_id` (`assignee_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `client_types`
--
ALTER TABLE `client_types`
  ADD PRIMARY KEY (`client_type_id`),
  ADD UNIQUE KEY `type_code` (`type_code`);

--
-- Indexes for table `clinical_visits`
--
ALTER TABLE `clinical_visits`
  ADD PRIMARY KEY (`visit_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `counseling_sessions`
--
ALTER TABLE `counseling_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `counselor_id` (`counselor_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `dashboard_cache`
--
ALTER TABLE `dashboard_cache`
  ADD PRIMARY KEY (`cache_id`);

--
-- Indexes for table `diagnoses`
--
ALTER TABLE `diagnoses`
  ADD PRIMARY KEY (`diagnosis_id`),
  ADD KEY `visit_id` (`visit_id`);

--
-- Indexes for table `dispense_events`
--
ALTER TABLE `dispense_events`
  ADD PRIMARY KEY (`dispense_id`),
  ADD KEY `prescription_id` (`prescription_id`),
  ADD KEY `prescription_item_id` (`prescription_item_id`),
  ADD KEY `nurse_id` (`nurse_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `facilities`
--
ALTER TABLE `facilities`
  ADD PRIMARY KEY (`facility_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`feedback_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `staff_id` (`staff_id`);

--
-- Indexes for table `forum_attachments`
--
ALTER TABLE `forum_attachments`
  ADD PRIMARY KEY (`attachment_id`),
  ADD KEY `post_id` (`post_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `forum_posts`
--
ALTER TABLE `forum_posts`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `topic_id` (`topic_id`),
  ADD KEY `author_id` (`author_id`),
  ADD KEY `parent_post_id` (`parent_post_id`);

--
-- Indexes for table `forum_reactions`
--
ALTER TABLE `forum_reactions`
  ADD PRIMARY KEY (`reaction_id`),
  ADD UNIQUE KEY `uq_reaction` (`post_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `forum_threads`
--
ALTER TABLE `forum_threads`
  ADD PRIMARY KEY (`thread_id`),
  ADD KEY `group_id` (`group_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `forum_topics`
--
ALTER TABLE `forum_topics`
  ADD PRIMARY KEY (`topic_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`group_id`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `group_memberships`
--
ALTER TABLE `group_memberships`
  ADD PRIMARY KEY (`membership_id`),
  ADD UNIQUE KEY `uq_group_user` (`group_id`,`user_id`,`patient_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `joined_by` (`joined_by`);

--
-- Indexes for table `hts_sessions`
--
ALTER TABLE `hts_sessions`
  ADD PRIMARY KEY (`hts_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `tester_id` (`tester_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `in_app_messages`
--
ALTER TABLE `in_app_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `recipient_id` (`recipient_id`),
  ADD KEY `group_id` (`group_id`);

--
-- Indexes for table `lab_files`
--
ALTER TABLE `lab_files`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `result_id` (`result_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `lab_orders`
--
ALTER TABLE `lab_orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `ordering_provider_id` (`ordering_provider_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `lab_results`
--
ALTER TABLE `lab_results`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `medications`
--
ALTER TABLE `medications`
  ADD PRIMARY KEY (`medication_id`);

--
-- Indexes for table `medication_adherence`
--
ALTER TABLE `medication_adherence`
  ADD PRIMARY KEY (`adherence_id`),
  ADD KEY `prescription_id` (`prescription_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `medication_inventory`
--
ALTER TABLE `medication_inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `medication_id` (`medication_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `medication_reminders`
--
ALTER TABLE `medication_reminders`
  ADD PRIMARY KEY (`reminder_id`),
  ADD KEY `prescription_id` (`prescription_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `thread_id` (`thread_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `message_threads`
--
ALTER TABLE `message_threads`
  ADD PRIMARY KEY (`thread_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `mfa_tokens`
--
ALTER TABLE `mfa_tokens`
  ADD PRIMARY KEY (`mfa_token_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`patient_id`),
  ADD UNIQUE KEY `uic` (`uic`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `patient_art_history`
--
ALTER TABLE `patient_art_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `regimen_id` (`regimen_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `patient_documents`
--
ALTER TABLE `patient_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `patient_identifiers`
--
ALTER TABLE `patient_identifiers`
  ADD PRIMARY KEY (`identifier_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `patient_risk_scores`
--
ALTER TABLE `patient_risk_scores`
  ADD PRIMARY KEY (`risk_score_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `calculated_by` (`calculated_by`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `permission_code` (`permission_code`);

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`prescription_id`),
  ADD UNIQUE KEY `prescription_number` (`prescription_number`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `prescriber_id` (`prescriber_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD PRIMARY KEY (`prescription_item_id`),
  ADD KEY `prescription_id` (`prescription_id`),
  ADD KEY `medication_id` (`medication_id`);

--
-- Indexes for table `procedures`
--
ALTER TABLE `procedures`
  ADD PRIMARY KEY (`procedure_id`),
  ADD KEY `visit_id` (`visit_id`);

--
-- Indexes for table `program_indicators`
--
ALTER TABLE `program_indicators`
  ADD PRIMARY KEY (`indicator_id`),
  ADD UNIQUE KEY `indicator_code` (`indicator_code`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `push_notifications`
--
ALTER TABLE `push_notifications`
  ADD PRIMARY KEY (`push_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`referral_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `from_facility_id` (`from_facility_id`),
  ADD KEY `to_facility_id` (`to_facility_id`),
  ADD KEY `referred_by` (`referred_by`),
  ADD KEY `accepted_by` (`accepted_by`);

--
-- Indexes for table `regions`
--
ALTER TABLE `regions`
  ADD PRIMARY KEY (`region_id`),
  ADD UNIQUE KEY `region_code` (`region_code`);

--
-- Indexes for table `remote_monitoring_data`
--
ALTER TABLE `remote_monitoring_data`
  ADD PRIMARY KEY (`data_id`),
  ADD KEY `device_id` (`device_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `remote_monitoring_devices`
--
ALTER TABLE `remote_monitoring_devices`
  ADD PRIMARY KEY (`device_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `report_queries`
--
ALTER TABLE `report_queries`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `report_runs`
--
ALTER TABLE `report_runs`
  ADD PRIMARY KEY (`run_id`),
  ADD KEY `report_id` (`report_id`),
  ADD KEY `run_by` (`run_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_code` (`role_code`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_permission_id`),
  ADD UNIQUE KEY `role_id` (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `sms_queue`
--
ALTER TABLE `sms_queue`
  ADD PRIMARY KEY (`sms_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `stock_entries`
--
ALTER TABLE `stock_entries`
  ADD PRIMARY KEY (`stock_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `received_by` (`received_by`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`movement_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `from_facility_id` (`from_facility_id`),
  ADD KEY `to_facility_id` (`to_facility_id`),
  ADD KEY `moved_by` (`moved_by`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `surveys`
--
ALTER TABLE `surveys`
  ADD PRIMARY KEY (`survey_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `survey_answers`
--
ALTER TABLE `survey_answers`
  ADD PRIMARY KEY (`answer_id`),
  ADD KEY `response_id` (`response_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `survey_questions`
--
ALTER TABLE `survey_questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `survey_id` (`survey_id`);

--
-- Indexes for table `survey_responses`
--
ALTER TABLE `survey_responses`
  ADD PRIMARY KEY (`response_id`),
  ADD KEY `survey_id` (`survey_id`),
  ADD KEY `respondent_id` (`respondent_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `teleconsultations`
--
ALTER TABLE `teleconsultations`
  ADD PRIMARY KEY (`consult_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `teleconsult_notes`
--
ALTER TABLE `teleconsult_notes`
  ADD PRIMARY KEY (`note_id`),
  ADD KEY `consult_id` (`consult_id`),
  ADD KEY `author_id` (`author_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `user_facility_assignments`
--
ALTER TABLE `user_facility_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD UNIQUE KEY `uq_user_facility_primary` (`user_id`,`facility_id`,`is_primary`),
  ADD KEY `facility_id` (`facility_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_role_id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`role_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `vaccination_records`
--
ALTER TABLE `vaccination_records`
  ADD PRIMARY KEY (`vaccination_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `vaccine_id` (`vaccine_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `facility_id` (`facility_id`);

--
-- Indexes for table `vaccine_catalog`
--
ALTER TABLE `vaccine_catalog`
  ADD PRIMARY KEY (`vaccine_id`);

--
-- Indexes for table `vital_signs`
--
ALTER TABLE `vital_signs`
  ADD PRIMARY KEY (`vital_id`),
  ADD KEY `visit_id` (`visit_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`booked_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `appointments_ibfk_5` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `appointment_reminders`
--
ALTER TABLE `appointment_reminders`
  ADD CONSTRAINT `appointment_reminders_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`);

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD CONSTRAINT `auth_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `availability_slots`
--
ALTER TABLE `availability_slots`
  ADD CONSTRAINT `availability_slots_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `availability_slots_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `availability_slots_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`);

--
-- Constraints for table `care_tasks`
--
ALTER TABLE `care_tasks`
  ADD CONSTRAINT `care_tasks_ibfk_1` FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`referral_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `care_tasks_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `care_tasks_ibfk_3` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `care_tasks_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `clinical_visits`
--
ALTER TABLE `clinical_visits`
  ADD CONSTRAINT `clinical_visits_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `clinical_visits_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `clinical_visits_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `counseling_sessions`
--
ALTER TABLE `counseling_sessions`
  ADD CONSTRAINT `counseling_sessions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `counseling_sessions_ibfk_2` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `counseling_sessions_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `diagnoses`
--
ALTER TABLE `diagnoses`
  ADD CONSTRAINT `diagnoses_ibfk_1` FOREIGN KEY (`visit_id`) REFERENCES `clinical_visits` (`visit_id`) ON DELETE CASCADE;

--
-- Constraints for table `dispense_events`
--
ALTER TABLE `dispense_events`
  ADD CONSTRAINT `dispense_events_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`),
  ADD CONSTRAINT `dispense_events_ibfk_2` FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_items` (`prescription_item_id`),
  ADD CONSTRAINT `dispense_events_ibfk_3` FOREIGN KEY (`nurse_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `dispense_events_ibfk_4` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `feedback_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `forum_attachments`
--
ALTER TABLE `forum_attachments`
  ADD CONSTRAINT `forum_attachments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `forum_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `forum_posts`
--
ALTER TABLE `forum_posts`
  ADD CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`topic_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `forum_posts_ibfk_3` FOREIGN KEY (`parent_post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE SET NULL;

--
-- Constraints for table `forum_reactions`
--
ALTER TABLE `forum_reactions`
  ADD CONSTRAINT `forum_reactions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `forum_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `forum_threads`
--
ALTER TABLE `forum_threads`
  ADD CONSTRAINT `forum_threads_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `forum_threads_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `forum_topics`
--
ALTER TABLE `forum_topics`
  ADD CONSTRAINT `forum_topics_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `groups_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `group_memberships`
--
ALTER TABLE `group_memberships`
  ADD CONSTRAINT `group_memberships_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_memberships_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_memberships_ibfk_3` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_memberships_ibfk_4` FOREIGN KEY (`joined_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `hts_sessions`
--
ALTER TABLE `hts_sessions`
  ADD CONSTRAINT `hts_sessions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hts_sessions_ibfk_2` FOREIGN KEY (`tester_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `hts_sessions_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `in_app_messages`
--
ALTER TABLE `in_app_messages`
  ADD CONSTRAINT `in_app_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `in_app_messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `in_app_messages_ibfk_3` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`);

--
-- Constraints for table `lab_files`
--
ALTER TABLE `lab_files`
  ADD CONSTRAINT `lab_files_ibfk_1` FOREIGN KEY (`result_id`) REFERENCES `lab_results` (`result_id`),
  ADD CONSTRAINT `lab_files_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `lab_orders`
--
ALTER TABLE `lab_orders`
  ADD CONSTRAINT `lab_orders_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `lab_orders_ibfk_2` FOREIGN KEY (`ordering_provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `lab_orders_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `lab_results`
--
ALTER TABLE `lab_results`
  ADD CONSTRAINT `lab_results_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `lab_orders` (`order_id`),
  ADD CONSTRAINT `lab_results_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `lab_results_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `lab_results_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `medication_adherence`
--
ALTER TABLE `medication_adherence`
  ADD CONSTRAINT `medication_adherence_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`),
  ADD CONSTRAINT `medication_adherence_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);

--
-- Constraints for table `medication_inventory`
--
ALTER TABLE `medication_inventory`
  ADD CONSTRAINT `medication_inventory_ibfk_1` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`medication_id`),
  ADD CONSTRAINT `medication_inventory_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `medication_reminders`
--
ALTER TABLE `medication_reminders`
  ADD CONSTRAINT `medication_reminders_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`),
  ADD CONSTRAINT `medication_reminders_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`thread_id`) REFERENCES `message_threads` (`thread_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `message_threads`
--
ALTER TABLE `message_threads`
  ADD CONSTRAINT `message_threads_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `mfa_tokens`
--
ALTER TABLE `mfa_tokens`
  ADD CONSTRAINT `mfa_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patients`
--
ALTER TABLE `patients`
  ADD CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `patients_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patient_art_history`
--
ALTER TABLE `patient_art_history`
  ADD CONSTRAINT `patient_art_history_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `patient_art_history_ibfk_2` FOREIGN KEY (`regimen_id`) REFERENCES `art_regimens` (`regimen_id`),
  ADD CONSTRAINT `patient_art_history_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patient_documents`
--
ALTER TABLE `patient_documents`
  ADD CONSTRAINT `patient_documents_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `patient_documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patient_identifiers`
--
ALTER TABLE `patient_identifiers`
  ADD CONSTRAINT `patient_identifiers_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_risk_scores`
--
ALTER TABLE `patient_risk_scores`
  ADD CONSTRAINT `patient_risk_scores_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `patient_risk_scores_ibfk_2` FOREIGN KEY (`calculated_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `prescriptions_ibfk_2` FOREIGN KEY (`prescriber_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `prescriptions_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD CONSTRAINT `prescription_items_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `prescription_items_ibfk_2` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`medication_id`);

--
-- Constraints for table `procedures`
--
ALTER TABLE `procedures`
  ADD CONSTRAINT `procedures_ibfk_1` FOREIGN KEY (`visit_id`) REFERENCES `clinical_visits` (`visit_id`) ON DELETE CASCADE;

--
-- Constraints for table `program_indicators`
--
ALTER TABLE `program_indicators`
  ADD CONSTRAINT `program_indicators_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `push_notifications`
--
ALTER TABLE `push_notifications`
  ADD CONSTRAINT `push_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `push_notifications_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `referrals_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `referrals_ibfk_2` FOREIGN KEY (`from_facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `referrals_ibfk_3` FOREIGN KEY (`to_facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `referrals_ibfk_4` FOREIGN KEY (`referred_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `referrals_ibfk_5` FOREIGN KEY (`accepted_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `remote_monitoring_data`
--
ALTER TABLE `remote_monitoring_data`
  ADD CONSTRAINT `remote_monitoring_data_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `remote_monitoring_devices` (`device_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remote_monitoring_data_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);

--
-- Constraints for table `remote_monitoring_devices`
--
ALTER TABLE `remote_monitoring_devices`
  ADD CONSTRAINT `remote_monitoring_devices_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);

--
-- Constraints for table `report_queries`
--
ALTER TABLE `report_queries`
  ADD CONSTRAINT `report_queries_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `report_runs`
--
ALTER TABLE `report_runs`
  ADD CONSTRAINT `report_runs_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `report_queries` (`report_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `report_runs_ibfk_2` FOREIGN KEY (`run_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE;

--
-- Constraints for table `sms_queue`
--
ALTER TABLE `sms_queue`
  ADD CONSTRAINT `sms_queue_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `sms_queue_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_entries`
--
ALTER TABLE `stock_entries`
  ADD CONSTRAINT `stock_entries_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`item_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stock_entries_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `stock_entries_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `stock_entries_ibfk_4` FOREIGN KEY (`received_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`item_id`),
  ADD CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`from_facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`to_facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`moved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `surveys`
--
ALTER TABLE `surveys`
  ADD CONSTRAINT `surveys_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `survey_answers`
--
ALTER TABLE `survey_answers`
  ADD CONSTRAINT `survey_answers_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `survey_responses` (`response_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `survey_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `survey_questions` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `survey_questions`
--
ALTER TABLE `survey_questions`
  ADD CONSTRAINT `survey_questions_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`survey_id`) ON DELETE CASCADE;

--
-- Constraints for table `survey_responses`
--
ALTER TABLE `survey_responses`
  ADD CONSTRAINT `survey_responses_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`survey_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `survey_responses_ibfk_2` FOREIGN KEY (`respondent_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `teleconsultations`
--
ALTER TABLE `teleconsultations`
  ADD CONSTRAINT `teleconsultations_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teleconsultations_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `teleconsultations_ibfk_3` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `teleconsultations_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `teleconsult_notes`
--
ALTER TABLE `teleconsult_notes`
  ADD CONSTRAINT `teleconsult_notes_ibfk_1` FOREIGN KEY (`consult_id`) REFERENCES `teleconsultations` (`consult_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teleconsult_notes_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_facility_assignments`
--
ALTER TABLE `user_facility_assignments`
  ADD CONSTRAINT `user_facility_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_facility_assignments_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_facility_assignments_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `vaccination_records`
--
ALTER TABLE `vaccination_records`
  ADD CONSTRAINT `vaccination_records_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `vaccination_records_ibfk_2` FOREIGN KEY (`vaccine_id`) REFERENCES `vaccine_catalog` (`vaccine_id`),
  ADD CONSTRAINT `vaccination_records_ibfk_3` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `vaccination_records_ibfk_4` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`facility_id`);

--
-- Constraints for table `vital_signs`
--
ALTER TABLE `vital_signs`
  ADD CONSTRAINT `vital_signs_ibfk_1` FOREIGN KEY (`visit_id`) REFERENCES `clinical_visits` (`visit_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `vital_signs_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

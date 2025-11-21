# Sample Database for Modules 1-8

This SQL file (`sample_data_modules_1_to_8.sql`) contains sample data for testing and development of the MyHubCares Healthcare Management System.

## User Accounts

### Admin (1)
- **Username**: `admin`
- **Email**: `admin@myhubcares.com`
- **Password**: `password123` (hashed with bcrypt)
- **User ID**: `11111111-1111-1111-1111-111111111111`

### Physicians (2)
1. **Dr. John Smith**
   - Username: `dr.smith`
   - Email: `dr.smith@myhubcares.com`
   - User ID: `22222222-2222-2222-2222-222222222222`

2. **Dr. Sarah Jones**
   - Username: `dr.jones`
   - Email: `dr.jones@myhubcares.com`
   - User ID: `33333333-3333-3333-3333-333333333333`

### Case Managers (2)
1. **Maria Martin**
   - Username: `case.martin`
   - Email: `case.martin@myhubcares.com`
   - User ID: `44444444-4444-4444-4444-444444444444`

2. **Robert Wilson**
   - Username: `case.wilson`
   - Email: `case.wilson@myhubcares.com`
   - User ID: `55555555-5555-5555-5555-555555555555`

### Lab Personnel (2)
1. **Jennifer Brown**
   - Username: `lab.brown`
   - Email: `lab.brown@myhubcares.com`
   - User ID: `66666666-6666-6666-6666-666666666666`

2. **Michael Davis**
   - Username: `lab.davis`
   - Email: `lab.davis@myhubcares.com`
   - User ID: `77777777-7777-7777-7777-777777777777`

### Nurses (2)
1. **Emily Taylor**
   - Username: `nurse.taylor`
   - Email: `nurse.taylor@myhubcares.com`
   - User ID: `88888888-8888-8888-8888-888888888888`

2. **David Anderson**
   - Username: `nurse.anderson`
   - Email: `nurse.anderson@myhubcares.com`
   - User ID: `99999999-9999-9999-9999-999999999999`

## Patients (5)

1. **John Doe** - Patient ID: `10000001-0000-0000-0000-000000000001`
2. **Jane Smith** - Patient ID: `10000001-0000-0000-0000-000000000002`
3. **Michael Johnson** - Patient ID: `10000001-0000-0000-0000-000000000003`
4. **Sarah Williams** - Patient ID: `10000001-0000-0000-0000-000000000004`
5. **David Brown** - Patient ID: `10000001-0000-0000-0000-000000000005`

## Sample Data Included

### Module 1: User Authentication & Authorization
- ✅ Roles (admin, physician, case_manager, lab_personnel, nurse, patient)
- ✅ Users (1 admin, 2 physicians, 2 case managers, 2 lab personnel, 2 nurses)
- ✅ User-Role assignments
- ✅ MFA tokens (TOTP and SMS)

### Module 2: Patient Management
- ✅ 5 Patients with complete information
- ✅ Patient documents (3 sample documents)
- ✅ ARPA risk scores (3 risk assessments)
- ✅ Clinical visits (2 visits for ARPA calculation)

### Module 4: Medication Management
- ✅ Medications (5 medications including ART drugs)
- ✅ Medication inventory (4 inventory items)
- ✅ Prescriptions (3 prescriptions)
- ✅ Prescription items (3 items)
- ✅ Medication reminders (2 reminders)
- ✅ Medication adherence records (3 adherence records)

### Module 5: Lab Test Management
- ✅ Lab orders (3 orders)
- ✅ Lab results (3 results, including 1 critical value)
- ✅ Lab files (2 PDF files)

### Module 6: Appointment Scheduling
- ✅ Availability slots (3 slots)
- ✅ Appointments (3 appointments)
- ✅ Appointment reminders (3 reminders)

### Module 7: Care Coordination & Referrals
- ✅ Referrals (2 referrals)
- ✅ Counseling sessions (2 sessions)
- ✅ HTS sessions (2 sessions)
- ✅ Care tasks (3 tasks)

### Module 8: Reporting & Analytics
- ✅ Report queries (3 queries)
- ✅ Report runs (2 completed runs)
- ✅ Dashboard cache (2 cached widgets)

## ID Format

All IDs use **numeric-only UUIDs** following the pattern:
- Users: `11111111-1111-1111-1111-111111111111` (all numeric)
- Patients: `10000001-0000-0000-0000-000000000001` (all numeric)
- Roles: `role-0000-0000-0000-000000000001` (prefix pattern from existing SQL)
- User Roles: `ur-0000-0000-0000-000000000001` (prefix pattern from existing SQL)

## Login Credentials

### Staff Users

- **Admin**
  - Username: `admin`
  - Password: `admin123`

- **Physicians**
  - Usernames: `dr.smith`, `dr.jones`
  - Password: `doc123`

- **Case Managers**
  - Usernames: `case.martin`, `case.wilson`
  - Password: `case123`

- **Lab Personnel**
  - Usernames: `lab.brown`, `lab.davis`
  - Password: `lab123`

- **Nurses**
  - Usernames: `nurse.taylor`, `nurse.anderson`
  - Password: `nurse123`

### Patient Users

All 5 patients have login credentials with password: **`patient123`**

- `john.doe` / `patient123`
- `jane.smith` / `patient123`
- `michael.johnson` / `patient123`
- `sarah.williams` / `patient123`
- `david.brown` / `patient123`

## Usage

1. Import the SQL file into your MySQL database:
   ```sql
   source sample_data_modules_1_to_8.sql;
   ```

2. Or use MySQL command line:
   ```bash
   mysql -u username -p database_name < sample_data_modules_1_to_8.sql
   ```

3. Login with any of the user accounts above using password `password123`

## Notes

- The SQL file uses `ON DUPLICATE KEY UPDATE` to prevent errors if data already exists
- Facility ID is set using a variable `@facility_id` that defaults to `550e8400-e29b-41d4-a716-446655440000` if no facility exists
- All dates use relative functions (CURDATE(), NOW(), DATE_ADD, DATE_SUB) for dynamic date generation
- Patient addresses are stored as JSON strings
- All foreign key relationships are properly maintained


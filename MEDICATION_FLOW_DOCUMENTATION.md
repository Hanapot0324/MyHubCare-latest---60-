# Medication Management System Flow

Based on the database structure, here's the complete flow of medication management from prescription creation to adherence tracking.

## 📊 **Complete Medication Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MEDICATION MANAGEMENT FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

1. PRESCRIPTION CREATION (P4.1) - Physician
   ┌─────────────────────────────────────────────────────────────┐
   │ Physician creates prescription                               │
   └─────────────────────────────────────────────────────────────┘
   │
   ├─→ Query: patients (D2) - Get patient info
   ├─→ Query: medications - Get medication details
   ├─→ Query: medication_inventory (D4) - Check stock availability
   │   └─→ Check: quantity_on_hand >= quantity needed
   │
   ├─→ INSERT: prescriptions
   │   ├─ prescription_id (UUID)
   │   ├─ patient_id (from patients)
   │   ├─ prescriber_id (from users)
   │   ├─ facility_id (from facilities)
   │   ├─ prescription_date (CURRENT_DATE)
   │   ├─ prescription_number (generated)
   │   ├─ start_date, end_date
   │   ├─ status = 'active'
   │   └─ notes
   │
   ├─→ INSERT: prescription_items (for each medication)
   │   ├─ prescription_item_id (UUID)
   │   ├─ prescription_id (FK → prescriptions)
   │   ├─ medication_id (FK → medications)
   │   ├─ dosage, frequency, quantity
   │   ├─ instructions, duration_days
   │   └─ (One row per medication in prescription)
   │
   └─→ Log: audit_log (D8) - Prescription created

2. DISPENSE MEDICATION (P4.3) - Nurse
   ┌─────────────────────────────────────────────────────────────┐
   │ Nurse dispenses medication from prescription                │
   └─────────────────────────────────────────────────────────────┘
   │
   ├─→ Query: prescriptions + prescription_items (D4)
   │   └─→ Get prescription details and items
   │
   ├─→ Query: medication_inventory (D4)
   │   └─→ WHERE medication_id = ? AND facility_id = ?
   │   └─→ Verify: quantity_on_hand >= quantity_dispensed
   │
   ├─→ INSERT: dispense_events
   │   ├─ dispense_id (UUID)
   │   ├─ prescription_id (FK → prescriptions)
   │   ├─ prescription_item_id (FK → prescription_items)
   │   ├─ nurse_id (FK → users)
   │   ├─ facility_id (FK → facilities)
   │   ├─ dispensed_date (CURRENT_DATE)
   │   ├─ quantity_dispensed
   │   ├─ batch_number (optional)
   │   └─ notes (optional)
   │
   ├─→ UPDATE: medication_inventory
   │   └─→ SET quantity_on_hand = quantity_on_hand - quantity_dispensed
   │   └─→ WHERE inventory_id = ?
   │
   ├─→ INSERT: medication_reminders (if not exists)
   │   ├─ reminder_id (UUID)
   │   ├─ prescription_id (FK → prescriptions)
   │   ├─ patient_id (FK → patients)
   │   ├─ medication_name (from prescription_item)
   │   ├─ dosage, frequency (from prescription_item)
   │   ├─ reminder_time (default: '09:00:00')
   │   ├─ active = TRUE
   │   └─ missed_doses = 0
   │
   └─→ Log: audit_log (D8) - Medication dispensed

3. INVENTORY MANAGEMENT (P4.4) - Nurse/Admin
   ┌─────────────────────────────────────────────────────────────┐
   │ Nurse manages inventory                                     │
   └─────────────────────────────────────────────────────────────┘
   │
   ├─→ Query: medication_inventory (D4)
   │   └─→ WHERE facility_id = ?
   │
   ├─→ UPDATE: medication_inventory
   │   ├─→ Adjust quantity_on_hand (restock/adjustment)
   │   ├─→ Update reorder_level
   │   ├─→ Update expiry_date
   │   └─→ Update supplier, cost_per_unit
   │
   ├─→ Check: reorder_level alert
   │   └─→ IF quantity_on_hand <= reorder_level
   │       └─→ Generate alert (low stock)
   │
   ├─→ Check: expiry_date alert
   │   └─→ IF expiry_date <= CURRENT_DATE + 30 days
   │       └─→ Generate alert (expiring soon)
   │
   └─→ Log: audit_log (D8) - Inventory updated

4. ADHERENCE TRACKING (P4.6) - Patient/Nurse
   ┌─────────────────────────────────────────────────────────────┐
   │ Patient reports medication taken/missed                      │
   └─────────────────────────────────────────────────────────────┘
   │
   ├─→ Query: prescriptions + prescription_items (D4)
   │   └─→ Get prescription details for calculation
   │
   ├─→ Calculate: total_expected_doses
   │   └─→ Based on frequency, duration_days, days since start
   │
   ├─→ Calculate: adherence_percentage
   │   └─→ Formula: (taken_doses / total_expected_doses) * 100
   │
   ├─→ INSERT/UPDATE: medication_adherence
   │   ├─ adherence_id (UUID)
   │   ├─ prescription_id (FK → prescriptions)
   │   ├─ patient_id (FK → patients)
   │   ├─ adherence_date (date of report)
   │   ├─ taken (BOOLEAN: true/false)
   │   ├─ missed_reason (if taken = false)
   │   ├─ adherence_percentage (calculated)
   │   └─ recorded_at (timestamp)
   │
   ├─→ UPDATE: medication_reminders (if missed)
   │   └─→ SET missed_doses = missed_doses + 1
   │   └─→ WHERE prescription_id = ?
   │
   └─→ Log: audit_log (D8) - Adherence recorded

```

## 🔄 **Detailed Step-by-Step Flows**

### **Flow 1: Create Prescription (P4.1)**

**Actor**: Physician

**Steps**:
1. **Select Patient**
   - Query: `SELECT * FROM patients WHERE patient_id = ?`
   - Returns: Patient demographics

2. **Select Medication**
   - Query: `SELECT * FROM medications WHERE medication_id = ? AND active = TRUE`
   - Returns: Medication details (name, form, strength, etc.)

3. **Check Inventory**
   - Query: `SELECT quantity_on_hand, reorder_level FROM medication_inventory 
            WHERE medication_id = ? AND facility_id = ?`
   - Validation: Ensure `quantity_on_hand` is sufficient (optional check)

4. **Create Prescription**
   ```sql
   INSERT INTO prescriptions (
     prescription_id, patient_id, prescriber_id, facility_id,
     prescription_date, prescription_number, start_date, end_date,
     notes, status
   ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, 'active')
   ```

5. **Add Prescription Items**
   ```sql
   INSERT INTO prescription_items (
     prescription_item_id, prescription_id, medication_id,
     dosage, frequency, quantity, instructions, duration_days
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ```
   - One row per medication in the prescription

6. **Log Audit**
   - INSERT into `audit_log` (D8)

---

### **Flow 2: Dispense Medication (P4.3)**

**Actor**: Nurse

**Steps**:
1. **Select Prescription**
   - Query: `SELECT p.*, pi.* FROM prescriptions p
            JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
            WHERE p.prescription_id = ? AND p.status = 'active'`
   - Returns: Prescription with all items

2. **Check Inventory Availability**
   - Query: `SELECT inventory_id, quantity_on_hand, reorder_level
            FROM medication_inventory
            WHERE medication_id = ? AND facility_id = ?`
   - Validation: `quantity_on_hand >= quantity_dispensed`
   - If insufficient: Return error

3. **Create Dispense Event**
   ```sql
   INSERT INTO dispense_events (
     dispense_id, prescription_id, prescription_item_id,
     nurse_id, facility_id, dispensed_date,
     quantity_dispensed, batch_number, notes
   ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, ?)
   ```

4. **Update Inventory**
   ```sql
   UPDATE medication_inventory
   SET quantity_on_hand = quantity_on_hand - ?
   WHERE inventory_id = ?
   ```
   - Reduces stock by `quantity_dispensed`

5. **Create Medication Reminder** (if not exists)
   ```sql
   INSERT INTO medication_reminders (
     reminder_id, prescription_id, patient_id,
     medication_name, dosage, frequency,
     reminder_time, active
   ) VALUES (?, ?, ?, ?, ?, ?, '09:00:00', TRUE)
   ```
   - Only if reminder doesn't already exist for this prescription + medication

6. **Log Audit**
   - INSERT into `audit_log` (D8)

---

### **Flow 3: Manage Inventory (P4.4)**

**Actor**: Nurse/Admin

**Steps**:
1. **View Inventory**
   - Query: `SELECT mi.*, m.medication_name
            FROM medication_inventory mi
            JOIN medications m ON mi.medication_id = m.medication_id
            WHERE mi.facility_id = ?`
   - Returns: All inventory items for facility

2. **Check Alerts**
   - **Low Stock**: `WHERE quantity_on_hand <= reorder_level`
   - **Expiring Soon**: `WHERE expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 3 MONTH)`

3. **Update Stock** (Restock/Adjustment)
   ```sql
   UPDATE medication_inventory
   SET quantity_on_hand = ?,
       reorder_level = ?,
       expiry_date = ?,
       supplier = ?,
       cost_per_unit = ?,
       last_restocked = CURRENT_DATE
   WHERE inventory_id = ?
   ```

4. **Generate Alerts** (if applicable)
   - If `quantity_on_hand <= reorder_level` → Create low stock alert
   - If `expiry_date <= CURRENT_DATE + 90 days` → Create expiry alert

5. **Log Audit**
   - INSERT into `audit_log` (D8)

---

### **Flow 4: Track Adherence (P4.6)**

**Actor**: Patient/Nurse

**Steps**:
1. **Select Prescription**
   - Query: `SELECT p.*, pi.* FROM prescriptions p
            JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
            WHERE p.prescription_id = ? AND p.patient_id = ?`
   - Returns: Prescription with items

2. **Calculate Expected Doses**
   - Get `start_date`, `end_date` from prescription
   - Get `frequency`, `duration_days` from prescription_items
   - Calculate: `doses_per_day` from frequency (e.g., "Once daily" = 1, "Twice daily" = 2)
   - Calculate: `total_expected_doses = doses_per_day * days_since_start`

3. **Get Existing Adherence Records**
   - Query: `SELECT COUNT(*) as total, SUM(CASE WHEN taken = TRUE THEN 1 ELSE 0 END) as taken
            FROM medication_adherence
            WHERE prescription_id = ? AND adherence_date <= ?`

4. **Calculate Adherence Percentage**
   - Formula: `adherence_percentage = (taken_doses / total_expected_doses) * 100`

5. **Record Adherence**
   ```sql
   INSERT INTO medication_adherence (
     adherence_id, prescription_id, patient_id,
     adherence_date, taken, missed_reason,
     adherence_percentage
   ) VALUES (?, ?, ?, ?, ?, ?, ?)
   ```
   - Or UPDATE if record exists for that date

6. **Update Missed Doses Counter** (if missed)
   ```sql
   UPDATE medication_reminders
   SET missed_doses = missed_doses + 1,
       updated_at = NOW()
   WHERE prescription_id = ?
   ```

7. **Log Audit**
   - INSERT into `audit_log` (D8)

---

## 🔗 **Table Relationships**

```
medications (Master Catalog)
    │
    ├─→ prescription_items (which medications are in prescription)
    │       │
    │       └─→ prescriptions (prescription header)
    │               │
    │               ├─→ dispense_events (when medication was dispensed)
    │               │       │
    │               │       └─→ medication_inventory (stock reduced)
    │               │
    │               ├─→ medication_reminders (reminders for patient)
    │               │
    │               └─→ medication_adherence (patient compliance tracking)
    │
    └─→ medication_inventory (stock at each facility)
            │
            └─→ dispense_events (inventory reduced when dispensed)
```

## 📋 **Key Data Flows**

### **1. Prescription → Dispensing Flow**
```
prescriptions (created by physician)
    ↓
prescription_items (medications in prescription)
    ↓
dispense_events (nurse dispenses)
    ↓
medication_inventory (stock reduced)
    ↓
medication_reminders (reminder created)
```

### **2. Adherence Tracking Flow**
```
prescriptions (active prescription)
    ↓
medication_adherence (patient reports taken/missed)
    ↓
medication_reminders (missed_doses updated if missed)
    ↓
adherence_percentage (calculated: taken/total * 100)
```

### **3. Inventory Management Flow**
```
medication_inventory (stock levels)
    ↓
Check: quantity_on_hand <= reorder_level → Alert
    ↓
Check: expiry_date <= CURRENT_DATE + 90 days → Alert
    ↓
Restock → Update quantity_on_hand
```

## 🎯 **Key Business Rules**

1. **Prescription Creation**:
   - Must have at least one `prescription_item`
   - Each `prescription_item` references a `medication_id`
   - Inventory check is optional (warning, not blocking)

2. **Dispensing**:
   - Can only dispense from `active` prescriptions
   - Must verify `quantity_on_hand >= quantity_dispensed`
   - Each dispense creates a `dispense_events` record
   - Inventory is automatically reduced
   - Reminder is created only once per prescription item

3. **Inventory Management**:
   - Each medication can have multiple inventory records (one per facility)
   - Alerts generated when stock is low or expiring
   - Stock can be adjusted via restock or manual adjustment

4. **Adherence Tracking**:
   - One record per prescription per date
   - Percentage calculated based on total expected vs. taken doses
   - Missed doses increment `medication_reminders.missed_doses`
   - Used for ARPA risk calculation (P2.4)

## 🔍 **Query Patterns**

### **Get Prescription with Items**
```sql
SELECT p.*, pi.*, m.medication_name
FROM prescriptions p
JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
JOIN medications m ON pi.medication_id = m.medication_id
WHERE p.prescription_id = ?
```

### **Check Inventory for Dispensing**
```sql
SELECT inventory_id, quantity_on_hand, reorder_level
FROM medication_inventory
WHERE medication_id = ? AND facility_id = ?
```

### **Get Dispense History**
```sql
SELECT de.*, u.full_name as nurse_name, m.medication_name
FROM dispense_events de
JOIN users u ON de.nurse_id = u.user_id
JOIN prescription_items pi ON de.prescription_item_id = pi.prescription_item_id
JOIN medications m ON pi.medication_id = m.medication_id
WHERE de.prescription_id = ?
ORDER BY de.dispensed_date DESC
```

### **Calculate Adherence**
```sql
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN taken = TRUE THEN 1 ELSE 0 END) as taken_doses,
  AVG(adherence_percentage) as avg_adherence
FROM medication_adherence
WHERE prescription_id = ?
```

---

This flow ensures complete traceability from prescription creation through dispensing to adherence tracking, with proper inventory management and audit logging at each step.









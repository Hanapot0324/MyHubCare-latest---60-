# ARPA (Automated Risk Prediction Algorithm) Implementation

## Overview
ARPA is an automated risk prediction algorithm that calculates patient risk scores based on multiple factors from various system components. It automatically triggers when relevant events occur and can also be manually triggered.

## Algorithm Components

The ARPA algorithm considers the following factors:

### 1. Visit Frequency (D3 - Clinical Visits)
- Days since last visit
- Total visit count
- Emergency visit rate
- Follow-up visit frequency

**Risk Scoring:**
- >180 days: +25 points
- >90 days: +20 points
- >60 days: +15 points
- >30 days: +10 points
- >14 days: +5 points

### 2. Medication Adherence (D4 - Medications)
- Average adherence percentage
- Missed dose rate
- ART regimen missed doses
- Days since last adherence record

**Risk Scoring:**
- <70% adherence: +30 points
- <80% adherence: +25 points
- <90% adherence: +15 points
- <95% adherence: +10 points
- <100% adherence: +5 points
- >30% missed dose rate: +15 points
- >20% missed dose rate: +10 points
- >10% missed dose rate: +5 points

### 3. Appointment Attendance (D6 - Appointments)
- Missed appointment rate
- Attendance rate
- Total appointments
- Completed vs. no-show ratio

**Risk Scoring:**
- >40% missed rate: +25 points
- >30% missed rate: +20 points
- >20% missed rate: +15 points
- >10% missed rate: +10 points
- >5% missed rate: +5 points
- <50% attendance (if >3 appointments): +15 points

### 4. Lab Compliance (D5 - Lab Results)
- Days since last lab test
- Critical lab results count
- Lab test frequency

**Risk Scoring:**
- >180 days: +20 points
- >120 days: +15 points
- >90 days: +10 points
- >60 days: +5 points

### 5. CD4 Trends (D5 - Lab Results)
- Latest CD4 count
- CD4 trend (increasing/decreasing)
- CD4 change percentage

**Risk Scoring:**
- CD4 <200: +20 points
- CD4 <350: +10 points
- CD4 <500: +5 points
- >20% decline: +15 points
- >10% decline: +10 points

### 6. Viral Load (D5 - Lab Results)
- Latest viral load value
- Detectable vs. undetectable

**Risk Scoring:**
- >1000 copies/mL: +25 points
- >500 copies/mL: +20 points
- >200 copies/mL: +15 points
- >50 copies/mL: +10 points
- >20 copies/mL: +5 points

### 7. Emergency Visits (D3 - Clinical Visits)
- Emergency visit rate
- Total emergency visits

**Risk Scoring:**
- >30% emergency rate: +15 points
- >20% emergency rate: +10 points
- >10% emergency rate: +5 points

### 8. Prescription Status (D4 - Prescriptions)
- Cancelled prescription rate
- Active prescriptions count

**Risk Scoring:**
- >30% cancelled rate: +10 points
- >20% cancelled rate: +7 points
- >10% cancelled rate: +5 points
- No active prescriptions (if visits exist): +10 points

## Risk Levels

- **HIGH** (≥70): Immediate intervention required
- **MEDIUM-HIGH** (50-69): Schedule follow-up within 2 weeks
- **MEDIUM** (40-49): Schedule follow-up, review adherence
- **LOW-MEDIUM** (20-39): Continue monitoring
- **LOW** (<20): Low risk, routine care

## Auto-Trigger Events

ARPA automatically calculates risk scores when:

1. **Clinical Visit Created/Updated** (`clinical-visits.js`)
   - After visit is saved to database
   - Triggers: New visit, visit update

2. **Lab Result Created/Updated** (`lab-results.js`)
   - After lab result is saved
   - Triggers: New result, result update, critical values

3. **Prescription Created** (`prescriptions.js`)
   - After prescription is created
   - Triggers: New prescription

4. **Medication Adherence Recorded** (`medication-adherence.js`)
   - After adherence is recorded
   - Triggers: Medication taken/missed

5. **Appointment Status Changed** (`appointments.js`)
   - After appointment status changes
   - Triggers: Completed, no-show, cancelled

## API Endpoints

### Get Current ARPA Score
**GET** `/api/arpa/patient/:patientId`

Get the current ARPA risk score for a patient.

**Response:**
```json
{
  "success": true,
  "data": {
    "risk_score_id": "uuid",
    "patient_id": "uuid",
    "score": 45.5,
    "risk_level": "MEDIUM",
    "risk_factors": {...},
    "recommendations": "...",
    "calculated_on": "2025-01-01",
    "calculated_by": "uuid"
  }
}
```

### Get ARPA History
**GET** `/api/arpa/patient/:patientId/history?limit=10`

Get ARPA score calculation history for a patient.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "risk_score_id": "uuid",
      "score": 45.5,
      "risk_level": "MEDIUM",
      "calculated_on": "2025-01-01",
      ...
    }
  ]
}
```

### Manually Calculate ARPA
**POST** `/api/arpa/patient/:patientId/calculate`

Manually trigger ARPA calculation for a patient (staff only).

**Response:**
```json
{
  "success": true,
  "message": "ARPA risk score calculated successfully",
  "data": {...}
}
```

### Get High-Risk Patients
**GET** `/api/arpa/high-risk?threshold=50`

Get all patients with risk scores above threshold (staff only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "patient_id": "uuid",
      "uic": "MIFI0111-15-1990",
      "first_name": "John",
      "last_name": "Doe",
      "arpa_risk_score": 75.5,
      "risk_level": "HIGH",
      "arpa_last_calculated": "2025-01-01"
    }
  ],
  "count": 10,
  "threshold": 50
}
```

## Database Integration

### Tables Used
- `patients` - Stores current ARPA score (`arpa_risk_score`, `arpa_last_calculated`)
- `patient_risk_scores` - Stores calculation history
- `clinical_visits` - Visit data
- `prescriptions` - Prescription data
- `medication_adherence` - Adherence data
- `lab_results` - Lab test data
- `appointments` - Appointment data
- `art_regimens` - ART regimen data (if applicable)

### Data Flow
1. Event occurs (visit, lab result, etc.)
2. Data saved to respective table
3. ARPA service automatically triggered
4. Service queries all relevant tables
5. Calculates risk score
6. Saves to `patient_risk_scores`
7. Updates `patients.arpa_risk_score`
8. Logs to `audit_log`

## Service Functions

### `calculateARPARiskScore(patientId, calculatedBy, options)`
Main function to calculate ARPA risk score.

**Parameters:**
- `patientId` (string) - Patient ID
- `calculatedBy` (string|null) - User ID who triggered calculation
- `options` (object) - Options like `skipAudit`

**Returns:** Promise<object> - Risk score result

### `getARPAHistory(patientId, limit)`
Get ARPA calculation history for a patient.

**Parameters:**
- `patientId` (string) - Patient ID
- `limit` (number) - Number of records to return

**Returns:** Promise<array> - Array of risk score records

### `getCurrentARPAScore(patientId)`
Get current ARPA score for a patient.

**Parameters:**
- `patientId` (string) - Patient ID

**Returns:** Promise<object|null> - Current risk score or null

## Error Handling

ARPA calculations are designed to be non-blocking:
- If ARPA calculation fails, it logs an error but doesn't fail the main operation
- Errors are logged to console for debugging
- Audit logs are created for successful calculations

## Performance Considerations

- ARPA calculations are asynchronous
- Calculations run after main database transactions commit
- Multiple calculations for the same patient are safe (latest overwrites)
- Calculations are optimized with proper database indexes

## Future Enhancements

1. **Machine Learning Integration**: Use ML models for more accurate predictions
2. **Real-time Alerts**: Send alerts when risk score crosses thresholds
3. **Trend Analysis**: Analyze risk score trends over time
4. **Customizable Weights**: Allow administrators to adjust factor weights
5. **Predictive Analytics**: Predict future risk based on current trends


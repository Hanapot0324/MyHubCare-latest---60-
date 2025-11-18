-- Create Profile module tables

CREATE TABLE IF NOT EXISTS patients (
    patient_id CHAR(36) PRIMARY KEY,
    uic VARCHAR(30) UNIQUE NOT NULL,
    philhealth_no VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(10),
    birth_date DATE NOT NULL,
    sex ENUM('M','F','O') NOT NULL,
    civil_status ENUM('Single','Married','Divorced','Widowed','Separated'),
    nationality VARCHAR(50) DEFAULT 'Filipino',
    current_city VARCHAR(100),
    current_province VARCHAR(100),
    current_address JSON,
    contact_phone VARCHAR(30),
    email VARCHAR(255),
    mother_name VARCHAR(200),
    father_name VARCHAR(200),
    birth_order INT,
    guardian_name VARCHAR(200),
    guardian_relationship VARCHAR(50),
    facility_id CHAR(36) NOT NULL,
    arpa_risk_score DECIMAL(5,2),
    arpa_last_calculated DATE,
    status ENUM('active','inactive','deceased','transferred') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS patient_identifiers (
    identifier_id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    id_type ENUM('passport','driver_license','sss','tin','other') NOT NULL,
    id_value VARCHAR(100) NOT NULL,
    issued_at DATE,
    expires_at DATE,
    verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS patient_risk_scores (
    risk_score_id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    calculated_on DATE DEFAULT CURRENT_DATE,
    risk_factors JSON,
    recommendations TEXT,
    calculated_by CHAR(36),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (calculated_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS patient_documents (
    document_id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    document_type ENUM('consent','id_copy','medical_record','lab_result','other') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by CHAR(36),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;














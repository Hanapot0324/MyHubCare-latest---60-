-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT','PRINT','DOWNLOAD') NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) DEFAULT NULL,
  entity_id CHAR(36) DEFAULT NULL,
  record_id VARCHAR(50) DEFAULT NULL,
  old_value LONGTEXT DEFAULT NULL,
  new_value LONGTEXT DEFAULT NULL,
  change_summary TEXT DEFAULT NULL,
  ip_address VARCHAR(50) DEFAULT NULL,
  device_type ENUM('Desktop','Mobile','Tablet') DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  status ENUM('success','failed','error') DEFAULT 'success',
  error_message TEXT DEFAULT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_module (module),
  INDEX idx_timestamp (timestamp),
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
















-- ============================================================================
-- WEBGIS Maritime Security Monitoring - Object Detection Schema
-- ============================================================================

-- Object detection events from port security cameras
CREATE TABLE IF NOT EXISTS object_detection_events (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  detection_type VARCHAR(100) NOT NULL, -- 'intrusion', 'unauthorized_access', 'vessel', 'container', 'person', etc
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100% confidence level
  detected_objects TEXT, -- JSON array of detected object types
  image_url VARCHAR(500), -- URL to stored detection image
  video_url VARCHAR(500), -- URL to stored detection video
  video_duration INT, -- Duration in seconds if video available
  location_description VARCHAR(255), -- e.g., "Port Entrance", "Cargo Dock", "Security Perimeter"
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  processed BOOLEAN DEFAULT FALSE, -- Whether event has been reviewed/processed
  processed_by INT, -- User ID who processed the event
  processed_at TIMESTAMP, -- When event was processed
  alert_id INT REFERENCES alerts(id), -- Link to generated alert
  notes TEXT, -- Additional notes from security personnel
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maritime vessel and object registry for port
CREATE TABLE IF NOT EXISTS registered_vessels (
  id SERIAL PRIMARY KEY,
  vessel_id VARCHAR(50) UNIQUE NOT NULL,
  vessel_name VARCHAR(255) NOT NULL,
  vessel_type VARCHAR(50), -- 'cargo_ship', 'container_ship', 'tanker', etc
  imo_number VARCHAR(20), -- International Maritime Organization number
  mmsi VARCHAR(20), -- Maritime Mobile Service Identity
  flag_state VARCHAR(50),
  gross_tonnage INT,
  registered_owner VARCHAR(255),
  registration_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'revoked'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Intrusion and unauthorized access incidents
CREATE TABLE IF NOT EXISTS intrusion_incidents (
  id SERIAL PRIMARY KEY,
  detection_event_id INT NOT NULL REFERENCES object_detection_events(id),
  incident_type VARCHAR(50), -- 'unauthorized_entry', 'trespassing', 'cargo_tampering', 'suspicious_activity'
  threat_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  individuals_detected INT, -- Number of people detected
  description TEXT,
  response_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'investigating', 'responded', 'resolved'
  security_personnel_notified BOOLEAN DEFAULT FALSE,
  notification_time TIMESTAMP,
  incident_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security alert log for audit trail
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50), -- 'detection', 'alert', 'incident', 'response', 'resolution'
  detection_event_id INT REFERENCES object_detection_events(id),
  incident_id INT REFERENCES intrusion_incidents(id),
  action_taken TEXT,
  personnel_id INT, -- Security personnel or system ID
  personnel_name VARCHAR(255),
  notes TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Storage for image/video metadata
CREATE TABLE IF NOT EXISTS media_storage (
  id SERIAL PRIMARY KEY,
  detection_event_id INT NOT NULL REFERENCES object_detection_events(id),
  media_type VARCHAR(20), -- 'image' or 'video'
  storage_path VARCHAR(500),
  storage_provider VARCHAR(50), -- 's3', 'gcs', 'local', 'azure'
  file_size INT, -- in bytes
  file_hash VARCHAR(256), -- for integrity verification
  retention_until TIMESTAMP, -- when to delete (1 year from creation)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_detection_device ON object_detection_events(device_id);
CREATE INDEX idx_detection_created ON object_detection_events(created_at DESC);
CREATE INDEX idx_detection_severity ON object_detection_events(severity);
CREATE INDEX idx_detection_processed ON object_detection_events(processed);
CREATE INDEX idx_detection_type ON object_detection_events(detection_type);
CREATE INDEX idx_intrusion_detection ON intrusion_incidents(detection_event_id);
CREATE INDEX idx_intrusion_threat ON intrusion_incidents(threat_level);
CREATE INDEX idx_intrusion_status ON intrusion_incidents(response_status);
CREATE INDEX idx_audit_detection ON security_audit_log(detection_event_id);
CREATE INDEX idx_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX idx_media_detection ON media_storage(detection_event_id);
CREATE INDEX idx_media_retention ON media_storage(retention_until);
CREATE INDEX idx_vessels_status ON registered_vessels(status);

-- Sample security data for development
INSERT INTO object_detection_events (device_id, detection_type, confidence_score, detected_objects, severity, location_description) VALUES
(3, 'unauthorized_access', 92.5, '["person", "backpack"]', 'high', 'Port Entrance Gate'),
(4, 'vessel', 88.3, '["cargo_vessel", "container_ship"]', 'medium', 'Cargo Dock Area'),
(3, 'person', 85.1, '["person"]', 'low', 'Perimeter Monitor');

INSERT INTO registered_vessels (vessel_id, vessel_name, vessel_type, mmsi, flag_state, status) VALUES
('VESSEL_001', 'Pacific Trader', 'cargo_ship', '123456789', 'Singapore', 'active'),
('VESSEL_002', 'Ocean Express', 'container_ship', '987654321', 'Hong Kong', 'active');

INSERT INTO monitoring_modules (name, total_devices, normal_count) VALUES
('maritime_security', 2, 2) ON CONFLICT (name) DO NOTHING;

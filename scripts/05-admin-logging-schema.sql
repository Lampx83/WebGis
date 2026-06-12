-- ============================================================================
-- WEBGIS Admin Logging & API Analytics Schema
-- ============================================================================

-- IoT Raw Data Logging (Input/Output tracking)
CREATE TABLE IF NOT EXISTS iot_data_logging (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  log_type VARCHAR(20) NOT NULL, -- 'input', 'output'
  data_type VARCHAR(50) NOT NULL, -- 'environmental', 'water_level', 'camera_event'
  payload JSONB NOT NULL,
  payload_size INT,
  status VARCHAR(20) DEFAULT 'received', -- 'received', 'processed', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- API Usage Analytics
CREATE TABLE IF NOT EXISTS api_analytics (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
  status_code INT,
  response_time_ms INT,
  request_size INT,
  response_size INT,
  error_message TEXT,
  client_ip VARCHAR(45),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INT NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'export'
  resource_type VARCHAR(50), -- 'threshold', 'device', 'user'
  resource_id INT,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_iot_logging_device ON iot_data_logging(device_id);
CREATE INDEX idx_iot_logging_created ON iot_data_logging(created_at DESC);
CREATE INDEX idx_iot_logging_status ON iot_data_logging(status);
CREATE INDEX idx_api_analytics_endpoint ON api_analytics(endpoint);
CREATE INDEX idx_api_analytics_created ON api_analytics(created_at DESC);
CREATE INDEX idx_api_analytics_status ON api_analytics(status_code);
CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);

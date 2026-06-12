-- ============================================================================
-- WEBGIS Threshold Configuration Schema
-- ============================================================================

-- Threshold configurations for alert triggering
CREATE TABLE IF NOT EXISTS threshold_configurations (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  parameter_type VARCHAR(50) NOT NULL, -- 'wind_speed', 'rainfall', 'water_level', 'aqi', 'temperature', 'humidity', 'pm25', 'pm10'
  warning_threshold DECIMAL(10, 2) NOT NULL,
  alert_threshold DECIMAL(10, 2) NOT NULL,
  comparison_operator VARCHAR(10) DEFAULT '>', -- '>', '<', '>=', '<='
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id)
);

-- Alert history and threshold violation tracking
CREATE TABLE IF NOT EXISTS alert_threshold_violations (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  parameter_type VARCHAR(50) NOT NULL,
  current_value DECIMAL(10, 2) NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  violation_type VARCHAR(20), -- 'warning', 'alert'
  alert_id INT REFERENCES alerts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_threshold_device ON threshold_configurations(device_id);
CREATE INDEX idx_threshold_parameter ON threshold_configurations(parameter_type);
CREATE INDEX idx_threshold_enabled ON threshold_configurations(enabled);
CREATE INDEX idx_violations_device ON alert_threshold_violations(device_id);
CREATE INDEX idx_violations_created ON alert_threshold_violations(created_at DESC);
CREATE INDEX idx_violations_parameter ON alert_threshold_violations(parameter_type);

-- Sample threshold configurations
INSERT INTO threshold_configurations (device_id, parameter_type, warning_threshold, alert_threshold, comparison_operator, description)
SELECT 1, 'wind_speed', 20.0, 30.0, '>', 'Wind speed thresholds for weather station 1'
UNION ALL
SELECT 1, 'rainfall', 50.0, 100.0, '>', 'Rainfall intensity thresholds for weather station 1'
UNION ALL
SELECT 5, 'water_level', 2.5, 3.0, '>', 'Water level thresholds for station 1'
UNION ALL
SELECT 1, 'aqi', 100.0, 150.0, '>=', 'Air quality index thresholds for station 1'
WHERE NOT EXISTS (SELECT 1 FROM threshold_configurations WHERE parameter_type = 'wind_speed' LIMIT 1);

-- ============================================================================
-- WEBGIS Environmental Anomaly Monitoring Schema
-- ============================================================================

-- Tracks environmental anomalies detected via 80% threshold window analysis
CREATE TABLE IF NOT EXISTS environmental_anomalies (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  parameter_type VARCHAR(50) NOT NULL, -- 'wind_speed', 'rainfall'
  anomaly_detected BOOLEAN DEFAULT FALSE,
  violation_percentage DECIMAL(5, 2),
  readings_count INT DEFAULT 0,
  violations_count INT DEFAULT 0,
  max_value DECIMAL(10, 2),
  avg_value DECIMAL(10, 2),
  threshold_80_percent DECIMAL(10, 2),
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_anomalies_device ON environmental_anomalies(device_id);
CREATE INDEX idx_anomalies_parameter ON environmental_anomalies(parameter_type);
CREATE INDEX idx_anomalies_detected ON environmental_anomalies(anomaly_detected);
CREATE INDEX idx_anomalies_window ON environmental_anomalies(window_start DESC, window_end DESC);

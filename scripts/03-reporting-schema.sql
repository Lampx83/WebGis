-- ============================================================================
-- WEBGIS Statistical Reporting - Data Retention & Aggregation Schema
-- ============================================================================

-- Daily aggregated data (keeps 1 year of daily summaries)
CREATE TABLE IF NOT EXISTS readings_daily (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  module_type VARCHAR(50),
  reading_type VARCHAR(50),
  avg_value DECIMAL(10, 2),
  min_value DECIMAL(10, 2),
  max_value DECIMAL(10, 2),
  sample_count INT,
  day_start TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly aggregated data (permanent storage)
CREATE TABLE IF NOT EXISTS readings_monthly (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  module_type VARCHAR(50),
  reading_type VARCHAR(50),
  avg_value DECIMAL(10, 2),
  min_value DECIMAL(10, 2),
  max_value DECIMAL(10, 2),
  sample_count INT,
  month_start TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data archival log for tracking cleanup operations
CREATE TABLE IF NOT EXISTS data_archival_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  records_archived INT,
  archived_date TIMESTAMP,
  retention_days INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient date range queries
CREATE INDEX idx_daily_device_date ON readings_daily(device_id, day_start DESC);
CREATE INDEX idx_daily_module_date ON readings_daily(module_type, day_start DESC);
CREATE INDEX idx_monthly_device_date ON readings_monthly(device_id, month_start DESC);
CREATE INDEX idx_daily_created ON readings_daily(created_at DESC);
CREATE INDEX idx_monthly_created ON readings_monthly(created_at DESC);
CREATE INDEX idx_env_readings_date ON environmental_readings(device_id, created_at DESC);
CREATE INDEX idx_water_readings_date ON water_level_readings(device_id, created_at DESC);
CREATE INDEX idx_camera_events_date ON camera_events(device_id, created_at DESC);

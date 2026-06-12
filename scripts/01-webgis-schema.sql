-- ============================================================================
-- WEBGIS Smart Port Monitor System - Database Schema
-- ============================================================================

-- IoT Devices table
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'weather', 'camera', 'water_level'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'online', -- 'online', 'offline', 'error'
  last_signal_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  battery_level INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environmental readings (Air Quality, Temperature, Humidity, Wind)
CREATE TABLE IF NOT EXISTS environmental_readings (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  wind_speed DECIMAL(6, 2),
  wind_direction VARCHAR(10),
  rainfall DECIMAL(8, 2),
  air_quality_index INT,
  pm25 DECIMAL(6, 2),
  pm10 DECIMAL(6, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Water level readings
CREATE TABLE IF NOT EXISTS water_level_readings (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  water_level DECIMAL(8, 3),
  predicted_value DECIMAL(8, 3),
  alarm_level DECIMAL(8, 3),
  status VARCHAR(20), -- 'normal', 'warning', 'alert'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CCTV/Camera status and events
CREATE TABLE IF NOT EXISTS camera_events (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  event_type VARCHAR(50), -- 'motion', 'alarm', 'connection_loss'
  description TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts and alarms
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  alert_type VARCHAR(50), -- 'device_signal', 'monitoring_warning', 'battery'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'dismissed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INT
);

-- Monitoring modules tracking
CREATE TABLE IF NOT EXISTS monitoring_modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- 'air_quality', 'cctv', 'water_level'
  total_devices INT DEFAULT 0,
  normal_count INT DEFAULT 0,
  warning_count INT DEFAULT 0,
  alarm_count INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historical data aggregation (hourly)
CREATE TABLE IF NOT EXISTS readings_hourly (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  module_type VARCHAR(50),
  reading_type VARCHAR(50), -- 'temperature', 'humidity', 'aqi', etc
  avg_value DECIMAL(10, 2),
  min_value DECIMAL(10, 2),
  max_value DECIMAL(10, 2),
  sample_count INT,
  hour_start TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_environmental_device ON environmental_readings(device_id);
CREATE INDEX idx_environmental_created ON environmental_readings(created_at DESC);
CREATE INDEX idx_water_device ON water_level_readings(device_id);
CREATE INDEX idx_water_created ON water_level_readings(created_at DESC);
CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_camera_device ON camera_events(device_id);
CREATE INDEX idx_camera_created ON camera_events(created_at DESC);

-- Sample data for development
INSERT INTO devices (device_id, name, type, latitude, longitude, status, battery_level) VALUES
('WEATHER_001', 'Weather Station 1', 'weather', 20.8449, 106.6881, 'online', 95),
('WEATHER_002', 'Weather Station 2', 'weather', 20.8465, 106.6900, 'online', 88),
('CAMERA_001', 'Port Entrance CCTV', 'camera', 20.8445, 106.6875, 'online', 100),
('CAMERA_002', 'Cargo Dock CCTV', 'camera', 20.8470, 106.6905, 'online', 92),
('WATER_001', 'Water Level Station 1', 'water_level', 20.8450, 106.6880, 'online', 85),
('WATER_002', 'Water Level Station 2', 'water_level', 20.8460, 106.6895, 'online', 90);

INSERT INTO monitoring_modules (name, total_devices, normal_count) VALUES
('air_quality', 2, 2),
('cctv', 2, 2),
('water_level', 2, 2);

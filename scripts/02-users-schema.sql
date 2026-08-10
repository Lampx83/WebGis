-- ============================================================================
-- WEBGIS — Users / Access Control schema (Nội dung 8.2)
-- Phải chạy TRƯỚC 04 & 05 (các bảng đó tham chiếu users(id)).
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'admin' | 'operator' | 'viewer'
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Lịch sử đăng nhập / hoạt động xác thực (giám sát hoạt động — 8.2)
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  username VARCHAR(100),
  action VARCHAR(50) NOT NULL,       -- 'login_success' | 'login_failed' | 'logout'
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);

-- Tài khoản quản trị mặc định.
-- Mật khẩu mặc định: Admin@123  (ĐỔI NGAY sau lần đăng nhập đầu)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
  'admin',
  'admin@webgis.local',
  '$2b$10$qVUSfDNhBQ6/eEMqNNomeeg0k9dIphm4RyVFZzTkvnrGyqDlx0gGC',
  'Quản trị hệ thống',
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- WEBGIS — Session revocation + admin audit log (idempotent migration)
--
-- Chạy được cả khi khởi tạo DB lần đầu (docker-entrypoint-initdb.d) lẫn thủ công
-- trên DB đã có dữ liệu, và chạy lại nhiều lần không lỗi. Xem DEPLOY-PORTAINER.md.
--   docker exec -i <db-container> psql -U webgis -d webgis -v ON_ERROR_STOP=1 \
--     < scripts/08-session-revocation-and-audit.sql
-- ============================================================================

-- 1) Thu hồi phiên: mỗi lần tăng token_version, mọi JWT đã cấp trước đó đều vô hiệu.
--    (Token cũ không có claim `tv` được coi là 0 = giá trị mặc định, nên phiên đang
--    đăng nhập vẫn hợp lệ ngay sau khi migrate.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;

-- 2) admin_audit_log: lưu thêm username người thao tác (không mất khi user bị xóa)
--    và cho phép admin_id = NULL sau khi tài khoản đó bị xóa.
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS actor_username VARCHAR(100);
ALTER TABLE admin_audit_log ALTER COLUMN admin_id DROP NOT NULL;

UPDATE admin_audit_log l
SET actor_username = u.username
FROM users u
WHERE l.admin_id = u.id AND l.actor_username IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON admin_audit_log(resource_type, resource_id);

-- 3) Khóa ngoại tới users(id) của hai bảng nhật ký → ON DELETE SET NULL.
--    Nếu không, xóa một tài khoản đã từng đăng nhập / thao tác sẽ bị FK chặn.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'users'::regclass
      AND c.confdeltype <> 'n'
      AND c.conrelid IN ('admin_audit_log'::regclass, 'auth_audit_log'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE SET NULL',
      r.tbl, r.conname, r.col
    );
  END LOOP;
END $$;

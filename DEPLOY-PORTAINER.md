# Deploy lên Portainer

Stack gồm 2 service:

- **web** — ứng dụng WebGIS (Next.js standalone), build từ `Dockerfile`
- **db** — PostgreSQL + PostGIS (`postgis/postgis:16-3.4`), tự chạy các file
  `scripts/*.sql` để tạo bảng trong **lần khởi tạo đầu tiên**

App đã chuyển từ driver Neon sang `postgres.js`, nên kết nối thẳng tới Postgres
thường trong cùng Docker network (`db:5432`).

---

## Cách 1 — Portainer build từ Git (đang dùng)

1. **Commit & push** toàn bộ thay đổi lên Git remote (Portainer sẽ clone repo này).

2. Trong Portainer: **Stacks → Add stack → Repository**
   - **Repository URL**: URL Git của repo
   - **Compose path**: `docker-compose.yml`
   - Nếu repo private: thêm Authentication (username + token).

3. **Environment variables** (mục *Environment variables* của stack) — đổi mật khẩu:
   | Biến | Mặc định | Ghi chú |
   |------|----------|---------|
   | `POSTGRES_USER` | `webgis` | user DB |
   | `POSTGRES_PASSWORD` | `webgis` | **đổi trước khi chạy thật** |
   | `POSTGRES_DB` | `webgis` | tên DB |
   | `WEB_PORT` | `8043` | cổng publish ra host |
   | `AUTH_SECRET` | *(bắt buộc)* | chuỗi ngẫu nhiên ≥ 32 ký tự (`openssl rand -base64 48`); thiếu thì web không khởi động |
   | `INGEST_API_KEY` | *(tuỳ chọn)* | khóa cho thiết bị IoT gửi dữ liệu, ≥ 16 ký tự |

4. **Deploy the stack**. Portainer sẽ build image `web` và kéo image `db`.

5. Truy cập: `http://<host>:<WEB_PORT>` (mặc định `:8043`).

> **Lưu ý:** mỗi lần sửa code, push lên Git rồi bấm **Pull and redeploy** (bật
> *Re-pull image and redeploy* / rebuild) để Portainer build lại.

---

## Cách 2 — Build & push image trước (tùy chọn)

Nếu host Portainer không build được từ Git, build ở nơi khác rồi push lên registry:

```bash
docker build -t <registry>/webgis:latest .
docker push <registry>/webgis:latest
```

Rồi sửa `docker-compose.yml`: thay block `build:` của service `web` bằng
`image: <registry>/webgis:latest`, và deploy stack theo dạng **Web editor**.

---

## Database

- Schema được tạo **tự động chỉ ở lần đầu** (khi volume `db_data` còn rỗng), bằng
  cách nạp `scripts/01..07-*.sql` theo thứ tự tên file.
- Muốn nạp lại từ đầu: xóa volume `db_data` (Portainer → Volumes) rồi redeploy.
- Thêm bảng/seed mới về sau: chạy SQL thủ công qua **Portainer → Containers →
  db → Console** (`psql -U webgis -d webgis`), vì initdb không chạy lại trên
  volume đã có dữ liệu.
- Nếu chưa đặt `DATABASE_URL`, app chạy **mock data mode** (không cần DB) — hữu ích để
  kiểm tra nhanh giao diện. Ở production chế độ này bị tắt tài khoản admin giả, trừ khi
  đặt `DEMO_MODE=true`.

## Tài khoản & phân quyền

- Tài khoản seed `admin` / `Admin@123` **bắt buộc đổi mật khẩu** ở lần đăng nhập đầu
  (trang `/admin/change-password`); trước đó mọi API quản trị đều trả 403.
- `GET` các API dữ liệu (thiết bị, cảnh báo, bản đồ…) vẫn công khai cho dashboard; mọi
  thao tác ghi cần đăng nhập với vai trò `operator` trở lên, xóa thiết bị / dọn dữ liệu /
  quản lý người dùng cần `admin`.
- Thiết bị gửi dữ liệu dùng header `x-api-key: <INGEST_API_KEY>`:

```bash
curl -X POST http://<host>:8043/api/devices/1/readings \
  -H "x-api-key: $INGEST_API_KEY" -H "Content-Type: application/json" \
  -d '{"temperature": 28.5, "rainfall": 0, "wind_speed": 3.2}'
```

- Đăng nhập sai quá 5 lần (cùng IP + tài khoản) hoặc 10 lần (mọi IP) trong 15 phút sẽ bị
  khóa tạm thời (HTTP 429). Bộ đếm nằm trong bộ nhớ của từng container.

## Smoke test sau khi deploy

```bash
curl http://<host>:8043/                 # trang chủ → 200
curl http://<host>:8043/api/devices      # trả JSON danh sách thiết bị (từ DB)
```

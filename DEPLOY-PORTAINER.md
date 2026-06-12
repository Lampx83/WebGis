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
   | `WEB_PORT` | `3000` | cổng publish ra host |

4. **Deploy the stack**. Portainer sẽ build image `web` và kéo image `db`.

5. Truy cập: `http://<host>:<WEB_PORT>` (mặc định `:3000`).

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
- Nếu chưa đặt `DATABASE_URL`, app tự chạy **mock data mode** (không cần DB) —
  hữu ích để kiểm tra nhanh giao diện.

## Smoke test sau khi deploy

```bash
curl http://<host>:3000/                 # trang chủ → 200
curl http://<host>:3000/api/devices      # trả JSON danh sách thiết bị (từ DB)
```

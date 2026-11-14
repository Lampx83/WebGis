# WebGIS Quản lý Cảng biển

Hệ thống WebGIS giám sát cảng biển Hải Phòng: bản đồ lớp quy hoạch (GeoJSON), giám sát IoT
(quan trắc môi trường, mực nước, CCTV, an ninh hàng hải), cảnh báo theo ngưỡng, báo cáo thống kê
và trang quản trị (thiết bị, ngưỡng, người dùng, nhật ký IoT).

Next.js 16 (App Router) · React 19 · Tailwind · Leaflet · PostgreSQL (`postgres.js`).

## Chạy local

```bash
npm ci
npm run dev          # http://localhost:3000 — không cần DATABASE_URL (dùng dữ liệu mẫu)
```

Có cơ sở dữ liệu: đặt `DATABASE_URL`, nạp `scripts/01..07-*.sql` theo thứ tự tên file, xem `.env.example`.
Ở dev, tài khoản mẫu là `admin` / `Admin@123` (production bắt buộc đổi mật khẩu ở lần đăng nhập đầu).

## Kiểm tra chất lượng

```bash
npm run typecheck    # tsc --noEmit (build cũng kiểm tra kiểu)
npm test             # vitest: chính sách truy cập, ngưỡng, rate-limit, phiên đăng nhập
npm run build
```

CI (`.github/workflows/ci.yml`) chạy cả ba bước trên mỗi push / pull request.

## Cấu trúc chính

| Đường dẫn | Nội dung |
|---|---|
| `middleware.ts`, `lib/access-policy.ts` | Chính sách truy cập API/Admin (ai được đọc/ghi gì, khóa cho thiết bị IoT) |
| `lib/session.ts`, `lib/auth.ts` | Phiên JWT, đăng nhập, đổi mật khẩu mặc định |
| `lib/alerting.ts`, `lib/thresholds.ts` | So số đo với ngưỡng, tạo/đóng cảnh báo khi nhận dữ liệu |
| `lib/jobs.ts`, `instrumentation.ts` | Tác vụ nền: thiết bị offline/pin yếu, tổng hợp theo giờ, dọn dữ liệu (tùy chọn) |
| `app/api/**` | API JSON; `GET /api/health` để giám sát |
| `public/gis/` | Lớp bản đồ đã số hóa (`manifest.json` liệt kê các lớp) |
| `scripts/` | Schema SQL (chạy tự động lần đầu trong Docker) và script chuyển `.gdb` → GeoJSON |

## Triển khai

Docker Compose / Portainer: xem [DEPLOY-PORTAINER.md](DEPLOY-PORTAINER.md). Bắt buộc đặt `AUTH_SECRET`
(≥ 32 ký tự ngẫu nhiên); thiết bị IoT gửi dữ liệu bằng header `x-api-key` khớp `INGEST_API_KEY`.

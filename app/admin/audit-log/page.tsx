"use client"

import { Fragment, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollText } from "lucide-react"

interface AuditRow {
  id: number
  admin_id: number | null
  actor_username: string | null
  action: string
  resource_type: string | null
  resource_id: number | null
  changes: unknown
  created_at: string
}

const PAGE_SIZE = 25

const RESOURCE_LABEL: Record<string, string> = {
  device: "Thiết bị",
  threshold: "Ngưỡng",
  user: "Người dùng",
  data_retention: "Dọn dữ liệu",
}

const ACTION_LABEL: Record<string, string> = {
  "device.create": "Tạo thiết bị",
  "device.update": "Sửa thiết bị",
  "device.delete": "Xóa thiết bị",
  "threshold.create": "Tạo ngưỡng",
  "threshold.update": "Sửa ngưỡng",
  "threshold.delete": "Xóa ngưỡng",
  "user.create": "Tạo người dùng",
  "user.update": "Sửa người dùng",
  "user.delete": "Xóa người dùng",
  "user.role_change": "Đổi vai trò",
  "user.password_reset": "Đặt lại mật khẩu",
  "user.change_password": "Đổi mật khẩu",
  "retention.cleanup": "Dọn dữ liệu quá hạn",
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [resourceType, setResourceType] = useState("all")
  const [actor, setActor] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    // Debounce the free-text actor filter so each keystroke does not hit the API.
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const q = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
        if (resourceType !== "all") q.set("resource_type", resourceType)
        if (actor.trim()) q.set("actor", actor.trim())
        const res = await fetch(`/api/admin/audit-log?${q}`)
        if (res.ok) {
          const data = await res.json()
          setRows(data.items ?? [])
          setTotal(data.total ?? 0)
        } else {
          setRows([])
          setTotal(0)
          setError(
            res.status === 401
              ? "Phiên đăng nhập đã hết hạn"
              : res.status === 403
                ? "Chỉ quản trị viên mới xem được nhật ký thao tác"
                : "Không tải được nhật ký thao tác",
          )
        }
      } catch (e) {
        console.error("Failed to fetch audit log:", e)
        setRows([])
        setError("Không kết nối được máy chủ")
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [page, resourceType, actor])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ScrollText className="h-7 w-7" /> Nhật ký thao tác quản trị
        </h2>
        <p className="text-muted-foreground mt-2">Ai đã thay đổi thiết bị, ngưỡng cảnh báo, tài khoản và dữ liệu hệ thống</p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Loại đối tượng</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
            >
              <option value="all">Tất cả</option>
              {Object.entries(RESOURCE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Người thao tác</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              placeholder="Tên đăng nhập..."
              value={actor}
              onChange={(e) => {
                setActor(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tổng số bản ghi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bản ghi gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4">Thời gian</th>
                  <th className="py-2 pr-4">Người thao tác</th>
                  <th className="py-2 pr-4">Hành động</th>
                  <th className="py-2 pr-4">Đối tượng</th>
                  <th className="py-2">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-border align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                      <td className="py-2 pr-4">{r.actor_username ?? <span className="text-muted-foreground">(đã xóa)</span>}</td>
                      <td className="py-2 pr-4">{ACTION_LABEL[r.action] ?? r.action}</td>
                      <td className="py-2 pr-4">
                        {r.resource_type ? (RESOURCE_LABEL[r.resource_type] ?? r.resource_type) : "—"}
                        {r.resource_id != null && <span className="text-muted-foreground"> #{r.resource_id}</span>}
                      </td>
                      <td className="py-2">
                        {r.changes ? (
                          <button
                            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            className="text-primary hover:underline"
                          >
                            {expandedId === r.id ? "Ẩn" : "Xem"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr className="border-b border-border">
                        <td colSpan={5} className="py-2">
                          <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                            {JSON.stringify(r.changes, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!loading && rows.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Chưa có bản ghi nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">
              Trang {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1 border border-input rounded-lg disabled:opacity-50 hover:bg-muted"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount || loading}
                className="px-3 py-1 border border-input rounded-lg disabled:opacity-50 hover:bg-muted"
              >
                Sau
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

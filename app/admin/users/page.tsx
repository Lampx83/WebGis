"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Edit2, Plus, ShieldCheck } from "lucide-react"

interface User {
  id: number
  username: string
  email: string | null
  full_name: string | null
  role: "admin" | "operator" | "viewer"
  is_active: boolean
  last_login: string | null
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị",
  operator: "Vận hành",
  viewer: "Xem",
}

const emptyForm = { username: "", password: "", email: "", full_name: "", role: "viewer", is_active: true }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      setUsers(await res.json())
    } catch (e) {
      console.error("Failed to fetch users:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const d = await res.json()
          alert(d.error || "Lỗi tạo người dùng")
          return
        }
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({ ...emptyForm })
      fetchUsers()
    } catch (e) {
      console.error("Failed to save user:", e)
    }
  }

  const handleEdit = (u: User) => {
    setFormData({
      username: u.username,
      password: "",
      email: u.email || "",
      full_name: u.full_name || "",
      role: u.role,
      is_active: u.is_active,
    })
    setEditingId(u.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa người dùng này?")) return
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || "Không xóa được")
    }
    fetchUsers()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" /> Quản trị người dùng
          </h2>
          <p className="text-muted-foreground mt-2">Tạo, phân quyền và quản lý tài khoản truy cập hệ thống</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ ...emptyForm })
            setShowForm(true)
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Thêm người dùng
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Sửa người dùng" : "Thêm người dùng"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tên đăng nhập</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background disabled:opacity-60"
                    required
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Mật khẩu {editingId && <span className="text-muted-foreground">(để trống nếu không đổi)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                    required={!editingId}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Họ tên</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Vai trò</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                  >
                    <option value="admin">Quản trị (toàn quyền)</option>
                    <option value="operator">Vận hành (cấu hình, cảnh báo)</option>
                    <option value="viewer">Xem (chỉ đọc)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Kích hoạt tài khoản
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Hủy
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Đang tải…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tên đăng nhập</th>
                    <th className="py-2 pr-4">Họ tên</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Vai trò</th>
                    <th className="py-2 pr-4">Trạng thái</th>
                    <th className="py-2 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 pr-4 font-medium">{u.username}</td>
                      <td className="py-2 pr-4">{u.full_name || "-"}</td>
                      <td className="py-2 pr-4">{u.email || "-"}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            u.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {u.is_active ? "Hoạt động" : "Khóa"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(u)} className="p-1.5 hover:bg-muted rounded" title="Sửa">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded disabled:opacity-40"
                            title="Xóa"
                            disabled={u.id === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"
import { Trash2, Edit2, Plus } from "lucide-react"

interface Device {
  id: number
  device_id: string
  name: string
  type: "weather" | "camera" | "water_level"
  latitude: number
  longitude: number
  status: "online" | "offline" | "error"
  last_signal_time: string
  battery_level: number
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: "", type: "weather", latitude: 0, longitude: 0 })
  const { t } = useTranslation()

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices")
      const data = await response.json()
      setDevices(data)
    } catch (error) {
      console.error("Failed to fetch devices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await fetch(`/api/devices/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
      }
      fetchDevices()
      setShowForm(false)
      setEditingId(null)
      setFormData({ name: "", type: "weather", latitude: 0, longitude: 0 })
    } catch (error) {
      console.error("Failed to save device:", error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin", "confirmDelete") || "Are you sure?")) return
    try {
      await fetch(`/api/devices/${id}`, { method: "DELETE" })
      fetchDevices()
    } catch (error) {
      console.error("Failed to delete device:", error)
    }
  }

  const handleEdit = (device: Device) => {
    setFormData({ name: device.name, type: device.type, latitude: device.latitude, longitude: device.longitude })
    setEditingId(device.id)
    setShowForm(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{t("admin", "deviceManagement")}</h2>
          <p className="text-muted-foreground mt-2">{t("admin", "manageIotDevices")}</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ name: "", type: "weather", latitude: 0, longitude: 0 })
            setShowForm(true)
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("admin", "addNewDevice")}
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t("admin", "editDevice") : t("admin", "addNewDevice")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("admin", "deviceName")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("admin", "deviceType")}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                >
                  <option value="weather">{t("admin", "weatherStation")}</option>
                  <option value="camera">{t("admin", "cctvCamera")}</option>
                  <option value="water_level">{t("admin", "waterLevelSensor")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("admin", "latitude")}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: Number.parseFloat(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("admin", "longitude")}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: Number.parseFloat(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                  {t("admin", "save")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  {t("admin", "cancel")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin", "deviceList")} ({devices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceId")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceName")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceType")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "status")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "battery")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "lastSignal")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground">
                      {t("common", "loadingEllipsis")}
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground">
                      {t("admin", "noDevices")}
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-xs">{device.device_id}</td>
                      <td className="py-3 px-4">{device.name}</td>
                      <td className="py-3 px-4">{device.type}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            device.status === "online"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                              : device.status === "offline"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{device.battery_level}%</td>
                      <td className="py-3 px-4 text-xs">{new Date(device.last_signal_time).toLocaleString()}</td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => handleEdit(device)}
                          className="p-2 hover:bg-muted rounded"
                          title={t("admin", "editDevice")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                          title={t("admin", "deleteDevice")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

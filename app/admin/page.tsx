"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"
import { BarChart3, Database, AlertCircle, TrendingUp, Activity, AlertTriangle, CheckCircle2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface AdminStats {
  total_api_calls: number
  error_rate: number
  avg_response_time: number
  active_devices: number
  data_logs_24h: number
}

interface Device {
  id: number
  device_id: string
  name: string
  type: string
  status: "online" | "offline" | "error"
  battery_level: number
  last_signal_time: string
}

interface IoTLog {
  id: number
  device_id: number
  data_type: string
  payload: any
  created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [logs, setLogs] = useState<IoTLog[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch API analytics
        try {
          const apiResponse = await fetch("/api/analytics/api-usage?days=1")
          if (apiResponse.ok) {
            const apiData = await apiResponse.json()
            setStats(
              (prev) =>
                ({
                  ...prev,
                  total_api_calls: apiData?.total_calls || 0,
                  error_rate:
                    apiData?.total_calls > 0
                      ? Number.parseFloat(((apiData.error_count / apiData.total_calls) * 100).toFixed(2))
                      : 0,
                  avg_response_time: apiData?.avg_response_time || 0,
                }) as AdminStats,
            )
          }
        } catch (error) {
          console.error("[v0] Error fetching API analytics:", error)
        }

        // Fetch devices
        try {
          const devicesResponse = await fetch("/api/devices")
          if (devicesResponse.ok) {
            const devicesData = await devicesResponse.json()
            setDevices(Array.isArray(devicesData) ? devicesData.slice(0, 5) : [])
          }
        } catch (error) {
          console.error("[v0] Error fetching devices:", error)
          setDevices([])
        }

        // Fetch IoT logs
        try {
          const logsResponse = await fetch("/api/logging/iot?limit=5")
          if (logsResponse.ok) {
            const logsData = await logsResponse.json()
            setLogs(Array.isArray(logsData?.logs) ? logsData.logs : [])
          }
        } catch (error) {
          console.error("[v0] Error fetching logs:", error)
          setLogs([])
        }
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const deviceStats = {
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    error: devices.filter((d) => d.status === "error").length,
  }

  // Generate mock trend data
  const trendData = Array.from({ length: 12 }, (_, i) => ({
    time: `${i}:00`,
    calls: Math.floor(Math.random() * 500) + 100,
    errors: Math.floor(Math.random() * 50),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t("admin", "adminDashboard")}</h2>
        <p className="text-muted-foreground mt-2">{t("admin", "systemOverviewMetrics")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin", "totalApiCalls24h")}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.total_api_calls || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t("admin", "apiRequestsProcessed")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin", "errorRate")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.error_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{t("admin", "last24Hours")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin", "avgResponseTime")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avg_response_time || 0}ms</div>
            <p className="text-xs text-muted-foreground">{t("admin", "apiPerformance")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin", "activeDevices")}</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deviceStats.online}</div>
            <p className="text-xs text-muted-foreground">{t("admin", "onlineDevices")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin", "dataLogs24h")}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.data_logs_24h || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t("admin", "iotDataLogged")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin", "deviceHealth")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">{t("admin", "online")}</span>
              </div>
              <span className="text-lg font-bold text-green-600">{deviceStats.online}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">{t("admin", "offline")}</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{deviceStats.offline}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">{t("admin", "error")}</span>
              </div>
              <span className="text-lg font-bold text-red-600">{deviceStats.error}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t("admin", "recentIotLogs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("admin", "noLogsFound")}</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Device {log.device_id}</div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{log.data_type}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin", "apiPerformanceTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} name={t("admin", "totalCalls")} />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name={t("admin", "errors")} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin", "deviceStatusPreview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceName")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceType")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "status")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "battery")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "lastSignal")}</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">
                      {t("common", "loadingEllipsis")}
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{device.name}</td>
                      <td className="py-3 px-4 text-xs">{device.type}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin", "quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/devices"
            className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
            title={t("admin", "manageIotDevices")}
          >
            <h3 className="font-semibold text-foreground mb-1">{t("admin", "deviceManagement")}</h3>
            <p className="text-sm text-muted-foreground">{t("admin", "addEditDeleteDevices")}</p>
          </a>
          <a
            href="/admin/api-management"
            className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
            title={t("admin", "monitorAnalyzeApiUsage")}
          >
            <h3 className="font-semibold text-foreground mb-1">{t("admin", "apiManagement")}</h3>
            <p className="text-sm text-muted-foreground">{t("admin", "monitorAnalyzeApiUsage")}</p>
          </a>
          <a
            href="/admin/raw-data"
            className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
            title={t("admin", "viewIotDeviceLogs")}
          >
            <h3 className="font-semibold text-foreground mb-1">{t("admin", "rawDataLogging")}</h3>
            <p className="text-sm text-muted-foreground">{t("admin", "viewIotDeviceLogs")}</p>
          </a>
          <a
            href="/admin/thresholds"
            className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
            title={t("admin", "configureAlertThresholds")}
          >
            <h3 className="font-semibold text-foreground mb-1">{t("admin", "thresholdSettings")}</h3>
            <p className="text-sm text-muted-foreground">{t("admin", "configureAlertThresholds")}</p>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

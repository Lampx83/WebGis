"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

interface IoTLog {
  id: number
  device_id: number
  log_type: string
  data_type: string
  payload: any
  status: string
  created_at: string
}

const MOCK_LOGS: IoTLog[] = [
  {
    id: 1,
    device_id: 1,
    log_type: "input",
    data_type: "weather_reading",
    payload: { temp: 28.5, humidity: 72, wind_speed: 12.3, rainfall: 2.1 },
    status: "processed",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 2,
    device_id: 3,
    log_type: "input",
    data_type: "water_level",
    payload: { level_m: 2.85, trend: "rising" },
    status: "processed",
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 3,
    device_id: 2,
    log_type: "input",
    data_type: "camera_event",
    payload: { event_type: "motion_detected", confidence: 0.92 },
    status: "processed",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 4,
    device_id: 1,
    log_type: "output",
    data_type: "alert_trigger",
    payload: { alert_type: "HIGH_WIND", threshold: 20, value: 22.5 },
    status: "processed",
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 5,
    device_id: 4,
    log_type: "input",
    data_type: "aqi_reading",
    payload: { aqi: 145, pm25: 85, pm10: 120 },
    status: "processed",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 6,
    device_id: 5,
    log_type: "input",
    data_type: "power_status",
    payload: { battery_level: 78, signal_strength: -85 },
    status: "pending",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
]

export default function RawDataPage() {
  const [logs, setLogs] = useState<IoTLog[]>(MOCK_LOGS)
  const [loading, setLoading] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<string>("all")
  const [logType, setLogType] = useState<string>("all")
  const [searchPayload, setSearchPayload] = useState<string>("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        let url = "/api/logging/iot?limit=100"
        if (selectedDevice !== "all") url += `&device_id=${selectedDevice}`
        if (logType !== "all") url += `&log_type=${logType}`

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          const logsArray = Array.isArray(data) ? data : data.logs || []
          setLogs(logsArray.length > 0 ? logsArray : MOCK_LOGS)
        } else {
          setLogs(MOCK_LOGS)
        }
      } catch (error) {
        console.error("Failed to fetch IoT logs:", error)
        setLogs(MOCK_LOGS)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [selectedDevice, logType])

  const filteredLogs = logs.filter((log) => {
    if (searchPayload && !JSON.stringify(log.payload).toLowerCase().includes(searchPayload.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t("admin", "rawIotDataLogging")}</h2>
        <p className="text-muted-foreground mt-2">{t("admin", "viewDeviceInputOutputLogs")}</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("admin", "filterByDevice")}</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
            >
              <option value="all">{t("admin", "allDevices")}</option>
              <option value="1">Device 1 - Weather Station</option>
              <option value="2">Device 2 - CCTV Camera</option>
              <option value="3">Device 3 - Water Level</option>
              <option value="4">Device 4 - Air Quality</option>
              <option value="5">Device 5 - Power Monitor</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("admin", "filterByLogType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
            >
              <option value="all">{t("admin", "allTypes")}</option>
              <option value="input">{t("admin", "inputDeviceToSystem")}</option>
              <option value="output">{t("admin", "outputSystemToDevice")}</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Search Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              placeholder="Search in payload..."
              value={searchPayload}
              onChange={(e) => setSearchPayload(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">records found</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin", "iotDataLogs")} ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold">ID</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "timestamp")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "deviceId")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "type")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "dataType")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "status")}</th>
                  <th className="text-center py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground">
                      {t("admin", "loadingLogs")}
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground">
                      {t("admin", "noLogsFound")}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tbody key={log.id}>
                      <tr className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono text-xs">{log.id}</td>
                        <td className="py-3 px-4 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold">{log.device_id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.log_type === "input"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {log.log_type === "input" ? t("admin", "input") : t("admin", "output")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">{log.data_type}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.status === "processed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {log.status === "processed" ? t("admin", "processed") : t("admin", "pending")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                          >
                            {expandedId === log.id ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={7} className="py-4 px-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Payload Details:</h4>
                                <pre className="bg-background p-3 rounded border border-border text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Record ID:</span>
                                  <p className="font-mono font-semibold">{log.id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Device ID:</span>
                                  <p className="font-mono font-semibold">{log.device_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Data Type:</span>
                                  <p className="font-mono">{log.data_type}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <p className="font-mono">{new Date(log.created_at).toISOString()}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
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

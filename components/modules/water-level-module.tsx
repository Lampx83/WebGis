"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { useTranslation } from "@/lib/use-translation"

interface Device {
  id: number
  name: string
  status: "online" | "offline" | "error"
}

interface Reading {
  created_at: string
  water_level: number
  predicted_value: number | null
  alarm_level: number | null
  status: string
}

export function WaterLevelModule({ devices }: { devices: Device[] }) {
  const [selectedDevice, setSelectedDevice] = useState<number | null>(devices[0]?.id || null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!selectedDevice) return

    const fetchReadings = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/devices/${selectedDevice}/readings`)
        const data = await res.json()
        setReadings(data.reverse())
      } catch (error) {
        console.error("Failed to fetch readings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReadings()
  }, [selectedDevice])

  const latestReading = readings[readings.length - 1] || {}
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "normal":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "alert":
        return "text-red-600"
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case "alert":
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{t("modules", "waterLevelMonitoring")}</h3>
          <p className="text-sm text-muted-foreground">{t("modules", "realTimeWaterLevelReadings")}</p>
        </div>
        <div className="flex gap-2">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDevice === device.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground border border-border hover:bg-accent"
              }`}
            >
              {device.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("modules", "currentLevel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{latestReading.water_level?.toFixed(2) || "-"}m</p>
            <p className="text-xs text-muted-foreground mt-2">{t("modules", "metersAboveReference")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("modules", "predictedValue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-600">{latestReading.predicted_value?.toFixed(2) || "-"}m</p>
            <p className="text-xs text-muted-foreground mt-2">{t("modules", "nextHourPrediction")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              {getStatusIcon(latestReading.status)}
              {t("modules", "status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold capitalize ${getStatusColor(latestReading.status)}`}>
              {latestReading.status || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{t("modules", "systemStatus")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Station Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modules", "stationDataLatestObservation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4">{t("modules", "station")}</th>
                  <th className="text-left py-2 px-4">{t("modules", "waterLevelM")}</th>
                  <th className="text-left py-2 px-4">{t("modules", "status")}</th>
                  <th className="text-left py-2 px-4">{t("modules", "lastSignal")}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const deviceLatestReading = readings.find(
                    (r) =>
                      new Date(r.created_at).getTime() ===
                      Math.max(...readings.map((rr) => new Date(rr.created_at).getTime())),
                  )
                  return (
                    <tr key={device.id} className="border-b border-border">
                      <td className="py-3 px-4">{device.name}</td>
                      <td className="py-3 px-4 font-semibold">{deviceLatestReading?.water_level?.toFixed(2) || "-"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            deviceLatestReading?.status === "normal"
                              ? "bg-green-100 text-green-700"
                              : deviceLatestReading?.status === "warning"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {deviceLatestReading?.status || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {deviceLatestReading ? new Date(deviceLatestReading.created_at).toLocaleTimeString() : "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modules", "waterLevelTrends24Hours")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">{t("common", "loadingEllipsis")}</div>
          ) : readings.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">{t("common", "noData")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                  formatter={(value: number) => value?.toFixed(3) || "-"}
                />
                <Legend />
                <Area type="monotone" dataKey="water_level" name="Water Level" fill="#0ea5e9" stroke="#0284c7" />
                <Area
                  type="monotone"
                  dataKey="predicted_value"
                  name="Predicted"
                  fill="#8b5cf6"
                  stroke="#7c3aed"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

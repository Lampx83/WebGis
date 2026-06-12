"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTranslation } from "@/lib/use-translation"

interface Device {
  id: number
  name: string
  status: "online" | "offline" | "error"
}

interface Reading {
  created_at: string
  air_quality_index: number | null
  pm25: number | null
  pm10: number | null
  temperature: number | null
  humidity: number | null
}

export function AirQualityModule({ devices }: { devices: Device[] }) {
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
  const getAQIColor = (aqi: number | null) => {
    if (!aqi) return "text-gray-500"
    if (aqi <= 50) return "text-green-600"
    if (aqi <= 100) return "text-yellow-600"
    if (aqi <= 150) return "text-orange-600"
    if (aqi <= 200) return "text-red-600"
    if (aqi <= 300) return "text-purple-600"
    return "text-maroon-600"
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{t("airQuality", "airQualityMonitoring")}</h3>
          <p className="text-sm text-muted-foreground">{t("airQuality", "realTimeAirQuality")}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("airQuality", "aqi")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${getAQIColor(latestReading.air_quality_index)}`}>
              {latestReading.air_quality_index || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{t("airQuality", "airQualityIndex")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("airQuality", "pm25")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{latestReading.pm25?.toFixed(1) || "-"}</p>
            <p className="text-xs text-muted-foreground mt-2">μg/m³</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("airQuality", "pm10")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{latestReading.pm10?.toFixed(1) || "-"}</p>
            <p className="text-xs text-muted-foreground mt-2">μg/m³</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("airQuality", "temperature")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{latestReading.temperature?.toFixed(1) || "-"}°C</p>
            <p className="text-xs text-muted-foreground mt-2">{t("airQuality", "celsius")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("airQuality", "humidity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-600">{latestReading.humidity?.toFixed(1) || "-"}%</p>
            <p className="text-xs text-muted-foreground mt-2">{t("airQuality", "relative")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("airQuality", "airQualityTrends")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">{t("common", "loadingEllipsis")}</div>
          ) : readings.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">{t("common", "noData")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                  formatter={(value: number) => value?.toFixed(1) || "-"}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="air_quality_index"
                  name={t("airQuality", "aqi")}
                  stroke="#f97316"
                  dot={false}
                />
                <Line type="monotone" dataKey="pm25" name={t("airQuality", "pm25")} stroke="#eab308" dot={false} />
                <Line type="monotone" dataKey="pm10" name={t("airQuality", "pm10")} stroke="#64748b" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

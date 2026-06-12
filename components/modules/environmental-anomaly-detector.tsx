"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { useTranslation } from "@/lib/use-translation"

interface AnomalyData {
  device_id: number
  parameter_type: string
  anomaly_detected: boolean
  violation_percentage: number
  readings_count: number
  violations_count: number
  max_value: number
  avg_value: number
  threshold_80_percent: number
  message: string
}

interface Device {
  id: number
  name: string
}

export function EnvironmentalAnomalyDetector({ devices }: { devices: Device[] }) {
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const checkAnomalies = async () => {
      try {
        const results: AnomalyData[] = []

        // Check wind_speed, rainfall, and water_level for all weather devices
        for (const device of devices) {
          for (const paramType of ["wind_speed", "rainfall", "water_level"]) {
            try {
              const res = await fetch("/api/thresholds/check-window", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  device_id: device.id,
                  parameter_type: paramType,
                }),
              })

              const data = await res.json()
              if (data.anomalies && data.anomalies.length > 0) {
                results.push(...data.anomalies)
              }
            } catch (error) {
              console.error(`Failed to check ${paramType} for device ${device.id}:`, error)
            }
          }
        }

        setAnomalies(results.filter((a) => a.anomaly_detected))
      } catch (error) {
        console.error("Failed to check anomalies:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAnomalies()
    const interval = setInterval(checkAnomalies, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [devices])

  const getParameterLabel = (param: string) => {
    switch (param) {
      case "wind_speed":
        return t("environmentalMonitor", "windSpeed")
      case "rainfall":
        return t("environmentalMonitor", "rainfallIntensity")
      case "water_level":
        return t("environmentalMonitor", "waterLevel")
      default:
        return param
    }
  }

  if (loading) {
    return <div className="p-4 text-muted-foreground">{t("environmentalMonitor", "checkingForAnomalies")}</div>
  }

  if (anomalies.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <p className="text-green-700">{t("environmentalMonitor", "noEnvironmentalAnomaliesDetected")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-6 w-6 text-orange-600" />
        <h3 className="text-lg font-semibold text-orange-700">
          {t("environmentalMonitor", "environmentalAnomaliesDetected")}
        </h3>
      </div>

      {anomalies.map((anomaly, idx) => {
        const device = devices.find((d) => d.id === anomaly.device_id)
        return (
          <Card key={idx} className="border-orange-300 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="text-orange-900">
                  {device?.name} - {getParameterLabel(anomaly.parameter_type)}
                </span>
                <span className="text-xs bg-orange-200 text-orange-800 px-3 py-1 rounded-full font-semibold">
                  {anomaly.violation_percentage.toFixed(1)}% {t("sidebar", "warning")}s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-orange-800">{anomaly.message}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-orange-700">
                <div>
                  <p className="font-semibold">{t("environmentalMonitor", "maxValue")}</p>
                  <p>
                    {anomaly.max_value}{" "}
                    {anomaly.parameter_type === "wind_speed"
                      ? "m/s"
                      : anomaly.parameter_type === "water_level"
                        ? "m"
                        : "mm"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{t("environmentalMonitor", "avgValue")}</p>
                  <p>
                    {anomaly.avg_value}{" "}
                    {anomaly.parameter_type === "wind_speed"
                      ? "m/s"
                      : anomaly.parameter_type === "water_level"
                        ? "m"
                        : "mm"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{t("environmentalMonitor", "eightPercentThreshold")}</p>
                  <p>
                    {anomaly.threshold_80_percent}{" "}
                    {anomaly.parameter_type === "wind_speed"
                      ? "m/s"
                      : anomaly.parameter_type === "water_level"
                        ? "m"
                        : "mm"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{t("environmentalMonitor", "readingsIn1h")}</p>
                  <p>
                    {anomaly.readings_count} ({anomaly.violations_count} {t("sidebar", "alarm")}ed)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

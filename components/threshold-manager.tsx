"use client"

import { useEffect, useState } from "react"
import { Trash2, Edit2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

interface Threshold {
  id: number
  device_id: number
  parameter_type: string
  warning_threshold: number
  alert_threshold: number
  comparison_operator: string
  enabled: boolean
  description: string | null
}

interface Device {
  id: number
  name: string
  type: string
}

const PARAMETERS = [
  { value: "wind_speed", label: "windSpeed" },
  { value: "rainfall", label: "rainfall" },
  { value: "water_level", label: "waterLevel" },
  { value: "aqi", label: "aqi" },
  { value: "temperature", label: "temperature" },
  { value: "humidity", label: "humidity" },
  { value: "pm25", label: "pm25" },
  { value: "pm10", label: "pm10" },
]

const OPERATORS = [
  { value: ">", label: "greaterThan" },
  { value: "<", label: "lessThan" },
  { value: ">=", label: "greaterOrEqual" },
  { value: "<=", label: "lessOrEqual" },
]

export function ThresholdManager() {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<Device[]>([])
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const devicesRes = await fetch("/api/devices")
        const devicesData = await devicesRes.json()
        setDevices(devicesData)

        if (devicesData.length > 0) {
          setSelectedDevice(devicesData[0].id.toString())
        }
      } catch (error) {
        console.error("Failed to fetch devices:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!selectedDevice) return

    const fetchThresholds = async () => {
      try {
        const res = await fetch(`/api/thresholds?device_id=${selectedDevice}`)
        const data = await res.json()
        setThresholds(data)
      } catch (error) {
        console.error("Failed to fetch thresholds:", error)
      }
    }

    fetchThresholds()
  }, [selectedDevice])

  const handleDelete = async (id: number) => {
    if (!confirm(t("common", "noData"))) return

    try {
      await fetch(`/api/thresholds/${id}`, { method: "DELETE" })
      setThresholds(thresholds.filter((t) => t.id !== id))
    } catch (error) {
      console.error("Failed to delete threshold:", error)
    }
  }

  if (isLoading) {
    return <div className="p-4">{t("common", "loading")}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("thresholds", "thresholdSettings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t("thresholds", "selectDevice")}</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {thresholds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common", "noData")}</p>
          ) : (
            <div className="space-y-2">
              {thresholds.map((threshold) => (
                <div key={threshold.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">
                      {PARAMETERS.find((p) => p.value === threshold.parameter_type)?.label || threshold.parameter_type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("thresholds", "warningThreshold")}: {threshold.warning_threshold}{" "}
                      {threshold.comparison_operator} {t("thresholds", "alertThreshold")}: {threshold.alert_threshold}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-muted rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(threshold.id)} className="p-2 hover:bg-muted rounded">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

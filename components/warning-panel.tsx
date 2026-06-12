"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

interface Alert {
  id: number
  device_id: number
  alert_type: string
  title: string
  severity: "low" | "medium" | "high"
  created_at: string
  device_name?: string
}

interface MonitoringStatus {
  summary: {
    total_devices: number
    normal_count: number
    warning_count: number
    alarm_count: number
  }
}

export function WarningPanel({ monitoringStatus }: { monitoringStatus: MonitoringStatus | null }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts?status=active&limit=5")
        const data = await res.json()
        setAlerts(data)
      } catch (error) {
        console.error("Failed to fetch alerts:", error)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sidebar-foreground">{t("sidebar", "warningManagement")}</h3>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-xs text-muted-foreground">{t("alerts", "normalDevices")}</p>
            <p className="font-bold text-foreground">{monitoringStatus?.summary.normal_count || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-xs text-muted-foreground">{t("dashboard", "warnings")}</p>
            <p className="font-bold text-foreground">{monitoringStatus?.summary.warning_count || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-xs text-muted-foreground">{t("dashboard", "alarms")}</p>
            <p className="font-bold text-foreground">{monitoringStatus?.summary.alarm_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold mb-2">{t("alerts", "recentAlerts")}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-xs text-primary-foreground">{t("alerts", "noActiveAlerts")}</p>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="bg-card-foreground/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {alert.severity === "high" ? (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : alert.severity === "medium" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

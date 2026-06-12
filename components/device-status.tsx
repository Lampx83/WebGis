"use client"

import { useTranslation } from "@/lib/use-translation"

interface Device {
  id: number
  name: string
  type: "weather" | "camera" | "water_level"
  status: "online" | "offline" | "error"
  battery_level: number
}

export function DeviceStatus({ devices }: { devices: Device[] }) {
  const { t } = useTranslation()

  const statusCounts = {
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    error: devices.filter((d) => d.status === "error").length,
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sidebar-foreground">{t("sidebar", "iotDevicesState")}</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
          <span className="text-sm text-sidebar-foreground">{t("sidebar", "online")}</span>
          <span className="font-bold text-primary">{statusCounts.online}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <span className="text-sm text-yellow-700 dark:text-yellow-100">{t("sidebar", "offline")}</span>
          <span className="font-bold text-yellow-700 dark:text-yellow-200">{statusCounts.offline}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900 rounded-lg">
          <span className="text-sm text-red-700 dark:text-red-100">{t("sidebar", "error")}</span>
          <span className="font-bold text-red-700 dark:text-red-200">{statusCounts.error}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-sidebar-border">
        <h4 className="text-sm font-semibold mb-2">{t("sidebar", "deviceList")}</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between text-xs p-2 bg-sidebar-accent/30 rounded">
              <div>
                <p className="font-medium">{device.name}</p>
                <p className="text-primary">{device.type}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${device.status === "online" ? "text-green-600" : "text-red-600"}`}>
                  {device.status.toUpperCase()}
                </p>
                <p className="text-muted-foreground">{device.battery_level}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

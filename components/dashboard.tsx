"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, AlertTriangle, Wifi, Menu, X, Maximize2, Minimize2, Expand, Shrink, Map as MapIcon } from "lucide-react"
import { WarningPanel } from "./warning-panel"
import { DeviceStatus } from "./device-status"
import { MonitoringModules } from "./monitoring-modules"
import { AirQualityModule } from "./modules/air-quality-module"
import { CCTVModule } from "./modules/cctv-module"
import { WaterLevelModule } from "./modules/water-level-module"
import { LanguageSwitcher } from "./language-switcher"
import { useTranslation } from "@/lib/use-translation"
import Link from "next/link"
import { EnvironmentalAnomalyDetector } from "./modules/environmental-anomaly-detector"
import { MaritimeSecurityMonitor } from "./modules/maritime-security-monitor"

const MapComponent = dynamic(() => import("./map-component").then((mod) => ({ default: mod.MapComponent })), {
  ssr: false,
  loading: () => <div className="h-80 bg-muted rounded-lg flex items-center justify-center">Loading Map...</div>,
})

interface Device {
  id: number
  device_id: string
  name: string
  type: "weather" | "camera" | "water_level"
  latitude: number
  longitude: number
  status: "online" | "offline" | "error"
  battery_level: number
  last_signal_time: string
  has_alert?: boolean
  alert_severity?: string
}

interface MonitoringStatus {
  modules: Array<{
    name: string
    total_devices: number
    normal_count: number
    warning_count: number
    alarm_count: number
  }>
  summary: {
    total_devices: number
    normal_count: number
    warning_count: number
    alarm_count: number
  }
}

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null)
  const [selectedModule, setSelectedModule] = useState<string>("overview")
  const [loading, setLoading] = useState(true)
  const [alertDevices, setAlertDevices] = useState<Device[]>([])
  const [detections, setDetections] = useState<any[]>([])
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapLarge, setMapLarge] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)

  // Allow ESC to leave fullscreen map.
  useEffect(() => {
    if (!mapFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mapFullscreen])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, statusRes, alertsRes] = await Promise.all([
          fetch("/api/devices"),
          fetch("/api/monitoring-status"),
          fetch("/api/devices/with-alerts"),
        ])

        const devicesData = await devicesRes.json()
        const statusData = await statusRes.json()
        const alertsData = await alertsRes.json()

        setDevices(devicesData)
        setMonitoringStatus(statusData)
        setAlertDevices(alertsData.filter((d: Device) => d.has_alert))
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const res = await fetch("/api/security/detections?limit=10")
        const data = await res.json()
        setDetections(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch detections:", error)
      }
    }

    fetchSecurityData()
    const interval = setInterval(fetchSecurityData, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {mapFullscreen && (
        <div className="fixed inset-0 z-[1200] bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <h2 className="text-base md:text-lg font-bold text-card-foreground">
              {t("dashboard", "deviceLocationMap")}
            </h2>
            <button
              onClick={() => setMapFullscreen(false)}
              title="Thoát toàn màn hình (ESC)"
              aria-label="Thoát toàn màn hình"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Thoát (ESC)</span>
            </button>
          </div>
          <div className="flex-1">
            <MapComponent devices={devices} />
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-y-auto transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between bg-primary">
          <div>
            <h1 className="text-2xl font-bold text-sidebar-primary">{t("common", "webgis")}</h1>
            <p className="text-sm mt-1 text-card">{t("common", "smartPortMonitor")}</p>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-chart-2">
          <WarningPanel monitoringStatus={monitoringStatus} />

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t("dashboard", "environmentalAnomalies")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnvironmentalAnomalyDetector devices={devices.filter((d) => d.type === "weather")} />
            </CardContent>
          </Card>

          {alertDevices.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <span>
                  🚨 {t("dashboard", "devicesInAlert")} ({alertDevices.length})
                </span>
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alertDevices.map((device) => (
                  <div key={device.id} className="text-xs bg-red-900/40 p-2 rounded border border-red-700/50">
                    <p className="font-semibold text-red-300">{device.name}</p>
                    <p className="text-red-400">{device.alert_severity?.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DeviceStatus devices={devices} />
          <MonitoringModules
            monitoringStatus={monitoringStatus}
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />
          {detections.length > 0 && (
            <Card className="bg-red-900/20 border-red-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-300 flex items-center gap-2">
                  🚨 {t("dashboard", "maritimeSecurityAlerts")} ({detections.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {detections.slice(0, 3).map((d) => (
                  <div key={d.id} className="bg-red-900/40 p-1.5 rounded border border-red-700/50">
                    <p className="text-red-300 font-semibold">{d.detection_type.replace(/_/g, " ")}</p>
                    <p className="text-red-400">{d.confidence_score.toFixed(0)}% confidence</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Link href="/spatial">
            <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold mb-3">
              🗺️ Không gian GIS
            </button>
          </Link>
          <Link href="/reports">
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors my-0 mb-[17px]">
              📊 {t("dashboard", "statisticalReports")}
            </button>
          </Link>
          <Link href="/admin">
            <button className="w-full px-4 py-2 bg-orange-600 text-orange-foreground rounded-lg hover:bg-orange-700 transition-colors font-semibold">
              ⚙️ {t("dashboard", "adminPanel")}
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <div className="bg-card border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-card-foreground">
                {selectedModule === "overview"
                  ? t("dashboard", "portMonitoringSystem")
                  : selectedModule.replace(/_/g, " ").toUpperCase()}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                {t("dashboard", "realTimeMonitoring")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              {t("common", "lastUpdated")}: {new Date().toLocaleTimeString()}
            </p>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedModule === "overview" ? (
            <div className="p-4 md:p-8 space-y-4 md:space-y-8">
              {/* Map Section */}
              <Card className={mapLarge ? "h-[82vh]" : "h-72 md:h-[28rem]"}>
                <CardHeader className="pb-2 md:pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base md:text-lg">{t("dashboard", "deviceLocationMap")}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Link
                      href="/spatial"
                      title="Mở trang Không gian GIS"
                      aria-label="Mở trang Không gian GIS"
                      className="flex items-center gap-1.5 px-2 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <MapIcon className="h-4 w-4" />
                      <span className="hidden md:inline text-sm">Trang GIS</span>
                    </Link>
                    <button
                      onClick={() => setMapLarge((v) => !v)}
                      title={mapLarge ? "Thu nhỏ" : "Phóng to"}
                      aria-label={mapLarge ? "Thu nhỏ bản đồ" : "Phóng to bản đồ"}
                      className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {mapLarge ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setMapFullscreen(true)}
                      title="Toàn màn hình"
                      aria-label="Bản đồ toàn màn hình"
                      className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="h-[calc(100%-3.5rem)] p-0">
                  <div className="h-full rounded-lg overflow-hidden">
                    {!mapFullscreen && <MapComponent devices={devices} />}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {monitoringStatus?.modules.map((module) => (
                  <Card
                    key={module.name}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedModule(module.name)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">{module.name.replace(/_/g, " ")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-green-600">{module.normal_count}</p>
                          <p className="text-xs text-muted-foreground">{t("sidebar", "normal")}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">{module.warning_count}</p>
                          <p className="text-xs text-muted-foreground">{t("sidebar", "warning")}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{module.alarm_count}</p>
                          <p className="text-xs text-muted-foreground">{t("sidebar", "alarm")}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          {module.total_devices} {t("dashboard", "devicesTotal")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-base md:text-lg">{t("dashboard", "systemStatistics")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold">{monitoringStatus?.summary.normal_count}</p>
                      <p className="text-sm text-muted-foreground">{t("sidebar", "normal")}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold">{monitoringStatus?.summary.warning_count}</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard", "warnings")}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold">{monitoringStatus?.summary.alarm_count}</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard", "alarms")}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <Wifi className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{monitoringStatus?.summary.total_devices}</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard", "totalDevices")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : selectedModule === "Air pollution detection" ? (
            <AirQualityModule devices={devices.filter((d) => d.type === "weather")} />
          ) : selectedModule === "CCTV Monitoring" ? (
            <CCTVModule devices={devices.filter((d) => d.type === "camera")} />
          ) : selectedModule === "Water Level Monitoring" ? (
            <WaterLevelModule devices={devices.filter((d) => d.type === "water_level")} />
          ) : selectedModule === "Maritime Security" ? (
            <MaritimeSecurityMonitor devices={devices.filter((d) => d.type === "camera")} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

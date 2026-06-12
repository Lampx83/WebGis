"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"
import { useTranslation } from "@/lib/use-translation"

interface Device {
  id: number
  name: string
  status: "online" | "offline" | "error"
}

interface CameraEvent {
  id: number
  event_type: string
  description: string
  severity: string
  created_at: string
}

export function CCTVModule({ devices }: { devices: Device[] }) {
  const [selectedDevice, setSelectedDevice] = useState<number | null>(devices[0]?.id || null)
  const [events, setEvents] = useState<CameraEvent[]>([])
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!selectedDevice) return

    const fetchEvents = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/devices/${selectedDevice}/events`)
        const data = await res.json()
        setEvents(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch events:", error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [selectedDevice])

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{t("modules", "cctvMonitoring")}</h3>
          <p className="text-sm text-muted-foreground">{t("modules", "realTimeCameraStatusEvents")}</p>
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

      {/* Camera Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {device.status === "online" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                {device.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${device.status === "online" ? "text-green-600" : "text-red-600"}`}>
                {device.status.toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {device.status === "online" ? t("modules", "cameraIsRecording") : t("modules", "cameraIsOffline")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Feed Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modules", "liveFeed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t("modules", "liveFeedNotAvailableDemo")}</p>
              <p className="text-xs text-gray-500 mt-2">{t("modules", "connectActualCameraFeedUrl")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modules", "eventLogLatestObservationData")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">{t("common", "loadingEllipsis")}</div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t("modules", "noEventsRecordedCameraMonitoringClean")}
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
                  {event.severity === "high" ? (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm capitalize">{event.event_type}</p>
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

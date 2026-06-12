"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Video, Clock } from "lucide-react"
import { useTranslation } from "@/lib/use-translation"
import { CheckCircle } from "lucide-react"

interface DetectionEvent {
  id: number
  device_id: number
  detection_type: string
  confidence_score: number
  detected_objects: string
  image_url?: string
  video_url?: string
  video_duration?: number
  location_description?: string
  severity: string
  created_at: string
  processed: boolean
}

interface Device {
  id: number
  name: string
}

export function MaritimeSecurityMonitor({ devices }: { devices: Device[] }) {
  const [detections, setDetections] = useState<DetectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unprocessed" | "high">("unprocessed")
  const { t } = useTranslation()

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const params = new URLSearchParams()
        if (filter === "unprocessed") {
          params.set("processed", "false")
        } else if (filter === "high") {
          params.set("severity", "high")
        }

        const res = await fetch(`/api/security/detections?${params}`)
        const data = await res.json()
        setDetections(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch detections:", error)
        setDetections([])
      } finally {
        setLoading(false)
      }
    }

    fetchDetections()
    const interval = setInterval(fetchDetections, 15000) // Refresh every 15 seconds

    return () => clearInterval(interval)
  }, [filter])

  const getDeviceName = (deviceId: number) => {
    return devices.find((d) => d.id === deviceId)?.name || `Device ${deviceId}`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 border-red-300 text-red-900"
      case "medium":
        return "bg-yellow-100 border-yellow-300 text-yellow-900"
      case "low":
        return "bg-blue-100 border-blue-300 text-blue-900"
      default:
        return "bg-gray-100 border-gray-300 text-gray-900"
    }
  }

  const getDetectionIcon = (type: string) => {
    switch (type) {
      case "intrusion":
      case "unauthorized_access":
        return "🚨"
      case "vessel":
        return "⛴️"
      case "container":
        return "📦"
      case "person":
        return "👤"
      default:
        return "📷"
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return t("maritimeSecurity", "justNow")
    if (diffMins < 60) return `${diffMins}${t("maritimeSecurity", "minsAgo")}`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}${t("maritimeSecurity", "hoursAgo")}`
    return date.toLocaleDateString()
  }

  if (loading) {
    return <div className="p-4 text-muted-foreground">{t("maritimeSecurity", "loadingSecurityDetections")}</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{t("security.maritimeSecurityMonitoring")}</h3>
          <p className="text-sm text-muted-foreground">{t("security.realTimeObjectDetectionIntrusion")}</p>
        </div>
        <div className="flex gap-2">
          {(["all", "unprocessed", "high"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground border border-border hover:bg-accent"
              }`}
            >
              {f === "unprocessed"
                ? t("security.unprocessedDetections")
                : f === "high"
                  ? t("security.highSeverity")
                  : t("security.allDetections")}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("security.totalDetections")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{detections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("security.highSeverityCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{detections.filter((d) => d.severity === "high").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("security.unprocessedCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{detections.filter((d) => !d.processed).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detection Events List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("security.detectionEvents")} ({t("security.latestIntrusionData")})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detections.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mr-3" />
              {t("security.noIntrusionEvents")}
            </div>
          ) : (
            <div className="space-y-4">
              {detections.map((detection) => {
                const objects = JSON.parse(detection.detected_objects || "[]")
                return (
                  <div key={detection.id} className={`p-4 rounded-lg border-2 ${getSeverityColor(detection.severity)}`}>
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {detection.image_url ? (
                          <img
                            src={detection.image_url || "/placeholder.svg"}
                            alt="Detection"
                            className="h-20 w-24 object-cover rounded border border-current/20"
                          />
                        ) : (
                          <div className="h-20 w-24 bg-gray-300 rounded flex items-center justify-center text-2xl">
                            {getDetectionIcon(detection.detection_type)}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-lg capitalize">
                              {t(`security.${detection.detection_type}`)}
                            </p>
                            <p className="text-sm opacity-75">{getDeviceName(detection.device_id)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs opacity-75 flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {formatTime(detection.created_at)}
                            </p>
                            <p className="font-semibold">
                              {detection.confidence_score.toFixed(1)}% {t("security.confidence")}
                            </p>
                          </div>
                        </div>

                        {/* Detected Objects */}
                        <div className="mb-2">
                          <p className="text-xs font-semibold mb-1">{t("security.detectedObjects")}:</p>
                          <div className="flex flex-wrap gap-2">
                            {objects.map((obj: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-current/10 rounded text-xs capitalize">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Location & Media */}
                        <div className="flex items-center justify-between text-xs">
                          {detection.location_description && (
                            <p className="opacity-75">{detection.location_description}</p>
                          )}
                          <div className="flex gap-2">
                            {detection.image_url && (
                              <a
                                href={detection.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-current/20 rounded hover:bg-current/30"
                              >
                                <Camera className="h-3 w-3" />
                                {t("security.viewImage")}
                              </a>
                            )}
                            {detection.video_url && (
                              <a
                                href={detection.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-current/20 rounded hover:bg-current/30"
                              >
                                <Video className="h-3 w-3" />
                                {detection.video_duration}s {t("security.video")}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"

interface Device {
  id: number
  device_id: string
  name: string
  type: "weather" | "camera" | "water_level"
  latitude: number
  longitude: number
  status: "online" | "offline" | "error"
  battery_level: number
  last_signal_time?: string
  has_alert?: boolean
  alert_type?: string
  alert_severity?: "warning" | "alarm" | null
}

function MapContent({ devices }: { devices: Device[] }) {
  const map = useMap()

  useEffect(() => {
    // Fix Leaflet default marker icon
    const defaultIcon = L.icon({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    L.Marker.prototype.options.icon = defaultIcon
  }, [map])

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {devices.map((device) => {
        const icon = L.icon({
          iconUrl: getIconUrl(device.type, device.status, device.has_alert, device.alert_severity),
          iconSize: device.has_alert ? [40, 40] : [32, 32],
          iconAnchor: device.has_alert ? [20, 40] : [16, 32],
          popupAnchor: [0, device.has_alert ? -40 : -32],
          className: device.has_alert ? "alert-marker" : "",
        })

        return (
          <Marker key={device.id} position={[device.latitude, device.longitude]} icon={icon}>
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{device.name}</p>
                <p className="text-xs">Type: {device.type}</p>
                <p className="text-xs">Status: {device.status}</p>
                <p className="text-xs">Battery: {device.battery_level}%</p>
                {device.has_alert && (
                  <p className="text-xs font-semibold text-red-600">
                    🚨 Alert: {device.alert_type} ({device.alert_severity})
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

function getIconUrl(type: string, status: string, hasAlert?: boolean, alertSeverity?: string | null): string {
  const baseUrl = "https://cdn-icons-png.flaticon.com"

  if (hasAlert) {
    if (alertSeverity === "alarm") {
      return `${baseUrl}/128/2913/2913152.png` // Red alert icon
    } else if (alertSeverity === "warning") {
      return `${baseUrl}/128/1995/1995489.png` // Yellow warning icon
    }
  }

  if (status === "offline") {
    return `${baseUrl}/128/4436/4436481.png`
  }

  switch (type) {
    case "weather":
      return `${baseUrl}/128/3209/3209037.png`
    case "camera":
      return `${baseUrl}/128/1019/1019714.png`
    case "water_level":
      return `${baseUrl}/128/2164/2164697.png`
    default:
      return `${baseUrl}/128/681/681494.png`
  }
}

export function MapComponent({ devices }: { devices: Device[] }) {
  return (
    <MapContainer
      center={[20.8449, 106.6881]}
      zoom={15}
      style={{ height: "100%", width: "100%", zIndex: 10 }}
      className="z-10"
    >
      <MapContent devices={devices} />
    </MapContainer>
  )
}

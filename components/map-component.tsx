"use client"

import { useEffect, useState } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, LayersControl, useMap } from "react-leaflet"

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

interface GisLayerMeta {
  name: string
  slug: string
  file: string
  geometry: string
  count: number
  color: string
}

// Recalculate the Leaflet viewport whenever its container changes size
// (resize / enlarge / fullscreen toggles), otherwise tiles render greyed out.
function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
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

// Loads GIS overlay layers described by /gis/manifest.json (produced by
// scripts/gdb_to_geojson.sh) and renders each as a toggleable GeoJSON overlay.
// On first load it fits the map to the combined extent of the GIS data so the
// (temporary) sample dataset is always visible regardless of the default center.
function GisOverlays() {
  const map = useMap()
  const [layers, setLayers] = useState<Array<GisLayerMeta & { data: any }>>([])
  const [fitted, setFitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/gis/manifest.json", { cache: "no-store" })
        if (!res.ok) return
        const meta: GisLayerMeta[] = await res.json()
        const loaded = await Promise.all(
          meta.map(async (m) => {
            try {
              const r = await fetch(m.file, { cache: "no-store" })
              return r.ok ? { ...m, data: await r.json() } : null
            } catch {
              return null
            }
          }),
        )
        if (!cancelled) setLayers(loaded.filter(Boolean) as Array<GisLayerMeta & { data: any }>)
      } catch {
        /* no GIS data — map still works with device markers only */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (fitted || layers.length === 0) return
    try {
      // Prefer fitting to the detailed park layers; a city/ward boundary would
      // otherwise zoom the map out and hide the interesting detail.
      const focus = layers.filter((l) => !/city|ward/i.test(l.name))
      const source = focus.length > 0 ? focus : layers
      const group = L.featureGroup(source.map((l) => L.geoJSON(l.data)))
      const bounds = group.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] })
        setFitted(true)
      }
    } catch {
      /* ignore invalid geometries */
    }
  }, [layers, fitted, map])

  if (layers.length === 0) return null

  return (
    <LayersControl position="topright" collapsed={false}>
      {layers.map((l) => {
        const isPoint = /point/i.test(l.geometry)
        // Administrative boundaries render as outlines only; area layers get fill.
        const isBoundary = /boundary/i.test(l.name)
        return (
          <LayersControl.Overlay key={l.slug} name={`${l.name} (${l.count})`} checked>
            <GeoJSON
              data={l.data}
              style={() => ({
                color: l.color,
                weight: isBoundary ? 3 : 1.5,
                fillColor: l.color,
                fillOpacity: isBoundary ? 0 : 0.35,
                dashArray: isBoundary ? "6 4" : undefined,
              })}
              pointToLayer={
                isPoint
                  ? (_f, latlng) =>
                      L.circleMarker(latlng, {
                        radius: 5,
                        color: l.color,
                        fillColor: l.color,
                        fillOpacity: 0.8,
                        weight: 1,
                      })
                  : undefined
              }
              onEachFeature={(feature, layer) => {
                const props = (feature?.properties as Record<string, unknown>) || {}
                const rows = Object.entries(props)
                  .filter(([, v]) => v !== null && v !== "")
                  .slice(0, 12)
                  .map(([k, v]) => `<div><b>${k}:</b> ${String(v)}</div>`)
                  .join("")
                layer.bindPopup(
                  `<div class="text-xs"><div class="font-semibold mb-1">${l.name}</div>${rows || "<i>no attributes</i>"}</div>`,
                )
              }}
            />
          </LayersControl.Overlay>
        )
      })}
    </LayersControl>
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
      <GisOverlays />
      <InvalidateOnResize />
    </MapContainer>
  )
}

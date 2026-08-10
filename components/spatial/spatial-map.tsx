"use client"

import { useEffect, useMemo, useState } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet"
import type { GisFeatureInfo, GisLayerMeta } from "@/lib/gis"

export interface LayerData {
  layer: GisLayerMeta
  geojson: any
  features: GisFeatureInfo[]
}

interface Props {
  layers: LayerData[]
  visible: Record<string, boolean>
  selectedUid: string | null
  onSelect: (uid: string | null) => void
  areaRange: [number, number] | null // filters area layers by Shape_Area (m²)
  searchTerm: string
  measure: boolean
  flyKey: number
}

function isBoundary(name: string) {
  return /boundary|ranh giới/i.test(name)
}

// Fit the map to the detailed park layers on first load.
function FitOnLoad({ layers }: { layers: LayerData[] }) {
  const map = useMap()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done || layers.length === 0) return
    try {
      const focus = layers.filter((l) => !/city|ward/i.test(l.layer.name))
      const src = focus.length ? focus : layers
      const group = L.featureGroup(src.map((l) => L.geoJSON(l.geojson)))
      const b = group.getBounds()
      if (b.isValid()) {
        map.fitBounds(b, { padding: [24, 24] })
        setDone(true)
      }
    } catch {
      /* ignore */
    }
  }, [layers, done, map])
  return null
}

function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    // The container reaches its flex size only after the map initialises, so a
    // single invalidate can miss it and leave grey tiles. Re-run a few times as
    // the layout settles, then keep watching for container size changes.
    // Dispatching a window resize forces BOTH Leaflet and any Recharts
    // ResponsiveContainer on the page to re-measure — more reliable than
    // invalidateSize alone, which can read a stale container size on first paint.
    const fix = () => {
      map.invalidateSize({ pan: false })
      window.dispatchEvent(new Event("resize"))
    }
    map.whenReady(fix)
    // Leaflet caches a wrong tile grid on first paint behind async/dynamic
    // mounts; a few early invalidates miss it, so poll briefly until settled.
    let ticks = 0
    const interval = setInterval(() => {
      fix()
      if (++ticks >= 12) clearInterval(interval) // ~2.4s
    }, 200)
    const ro = new ResizeObserver(fix)
    ro.observe(map.getContainer())
    return () => {
      clearInterval(interval)
      ro.disconnect()
    }
  }, [map])
  return null
}

// Zooms to the selected feature whenever selection (or flyKey) changes.
function FlyToSelected({ layers, selectedUid, flyKey }: { layers: LayerData[]; selectedUid: string | null; flyKey: number }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedUid) return
    const [slug, idxStr] = selectedUid.split(":")
    const ld = layers.find((l) => l.layer.slug === slug)
    const feat = ld?.geojson.features[Number(idxStr)]
    if (!feat) return
    try {
      const b = L.geoJSON(feat).getBounds()
      if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 18 })
    } catch {
      /* ignore */
    }
  }, [selectedUid, flyKey, layers, map])
  return null
}

// ---- Measure tool -----------------------------------------------------------
function toRad(d: number) {
  return (d * Math.PI) / 180
}
function haversine(a: L.LatLng, b: L.LatLng) {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
function sphericalArea(latlngs: L.LatLng[]) {
  const R = 6378137
  let area = 0
  const n = latlngs.length
  if (n < 3) return 0
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i]
    const p2 = latlngs[(i + 1) % n]
    area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)))
  }
  return Math.abs((area * R * R) / 2)
}

function MeasureTool({ active }: { active: boolean }) {
  const [pts, setPts] = useState<L.LatLng[]>([])

  useMapEvents({
    click(e) {
      if (!active) return
      setPts((p) => [...p, e.latlng])
    },
    dblclick() {
      if (!active) return
      setPts([])
    },
  })

  useEffect(() => {
    if (!active) setPts([])
  }, [active])

  const dist = useMemo(() => {
    let d = 0
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
    return d
  }, [pts])
  const area = useMemo(() => sphericalArea(pts), [pts])

  if (!active) return null

  return (
    <>
      {pts.length > 1 && <Polyline positions={pts} pathOptions={{ color: "#ea580c", weight: 3, dashArray: "6 4" }} />}
      {pts.map((p, i) => (
        <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: "#ea580c", fillColor: "#fff", fillOpacity: 1 }} />
      ))}
      {pts.length >= 1 && (
        <div className="leaflet-top leaflet-left" style={{ marginTop: 70 }}>
          <div className="leaflet-control bg-white/95 rounded-md shadow px-3 py-2 text-xs text-gray-800 pointer-events-none">
            <div className="font-semibold text-orange-700 mb-0.5">Công cụ đo</div>
            <div>Khoảng cách: {dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist.toFixed(1)} m`}</div>
            {pts.length >= 3 && <div>Diện tích: {area >= 10000 ? `${(area / 10000).toFixed(2)} ha` : `${area.toFixed(0)} m²`}</div>}
            <div className="text-gray-500 mt-0.5">Bấm để thêm điểm · bấm đúp để xoá</div>
          </div>
        </div>
      )}
    </>
  )
}

export function SpatialMap({ layers, visible, selectedUid, onSelect, areaRange, searchTerm, measure, flyKey }: Props) {
  const search = searchTerm.trim().toLowerCase()

  return (
    <MapContainer center={[20.7, 106.93]} zoom={11} doubleClickZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

      {layers
        .filter((ld) => visible[ld.layer.slug] !== false)
        .map((ld) => {
          const boundary = isBoundary(ld.layer.name)
          // Remount on state changes so the style function re-evaluates.
          const key = `${ld.layer.slug}-${selectedUid}-${search}-${areaRange?.join("_") ?? "all"}`
          return (
            <GeoJSON
              key={key}
              data={ld.geojson}
              pointToLayer={(_feature, latlng) =>
                L.circleMarker(latlng, {
                  radius: 5,
                  color: ld.layer.color,
                  weight: 2,
                  fillColor: ld.layer.color,
                  fillOpacity: 0.8,
                })
              }
              style={(feature: any) => {
                const props = feature?.properties || {}
                const uid = props.__uid as string
                const info = ld.features[Number(uid?.split(":")[1])]
                const selected = uid === selectedUid
                const name = (info?.name || "").toLowerCase()
                const matches = search.length > 0 && name.includes(search)
                // Area filter only applies to fillable (area) layers.
                let dimmed = false
                if (!boundary && areaRange && info?.area != null) {
                  dimmed = info.area < areaRange[0] || info.area > areaRange[1]
                }
                if (selected) {
                  return { color: "#f59e0b", weight: 4, fillColor: "#f59e0b", fillOpacity: boundary ? 0.15 : 0.55 }
                }
                if (matches) {
                  return { color: "#dc2626", weight: 3, fillColor: "#dc2626", fillOpacity: boundary ? 0 : 0.5 }
                }
                return {
                  color: ld.layer.color,
                  weight: boundary ? 3 : 1.5,
                  fillColor: ld.layer.color,
                  fillOpacity: boundary ? 0 : dimmed ? 0.05 : 0.35,
                  opacity: dimmed ? 0.3 : 1,
                  dashArray: boundary ? "6 4" : undefined,
                }
              }}
              onEachFeature={(feature: any, lyr) => {
                const uid = feature?.properties?.__uid as string
                const idx = Number(uid?.split(":")[1])
                const info = ld.features[idx]
                lyr.bindTooltip(info?.name ?? ld.layer.name, { sticky: true })
                lyr.on("click", () => onSelect(uid))
              }}
            />
          )
        })}

      <FitOnLoad layers={layers} />
      <FlyToSelected layers={layers} selectedUid={selectedUid} flyKey={flyKey} />
      <MeasureTool active={measure} />
      <InvalidateOnResize />
    </MapContainer>
  )
}

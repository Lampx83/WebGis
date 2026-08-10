// Helpers for the Hải Phòng port spatial (GIS) workspace: loading the GeoJSON
// overlays (digitized from the official QĐ 756/QĐ-BXD port planning dossier,
// or produced by scripts/gdb_to_geojson.py for other sources), extracting a
// friendly name / area per feature across heterogeneous layer schemas, and
// exporting.

export interface GisLayerMeta {
  name: string
  slug: string
  file: string
  geometry: string
  count: number
  color: string
}

export interface GisFeatureInfo {
  uid: string // `${slug}:${index}`
  layerSlug: string
  layerName: string
  color: string
  index: number
  name: string
  area: number | null // hectares when derivable, else raw
  perimeter: number | null
  geometryType: string
  properties: Record<string, unknown>
  feature: any // raw GeoJSON feature
}

// Per-layer field mapping for the human-readable name.
const NAME_FIELDS = [
  "Zone_name",
  "Ten",
  "ten_CV",
  "Name",
  "name",
  "tenXa",
  "Park_name",
  "ten_xa",
]

// Shape_Area is the geometry area in the source CRS (UTM 48N) → m², present on
// every layer and unit-consistent. `Area` is hectares and `dienTich` is km², so
// they are deliberately not mixed in here.
const AREA_FIELDS = ["Shape_Area"]
const PERIMETER_FIELDS = ["Shape_Length", "chu_vi"]

function firstField(props: Record<string, unknown>, fields: string[]): unknown {
  for (const f of fields) {
    const v = props[f]
    if (v !== undefined && v !== null && String(v).trim() !== "") return v
  }
  return undefined
}

function toNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function displayName(layerName: string, props: Record<string, unknown>, index: number): string {
  const raw = firstField(props, NAME_FIELDS)
  const name = raw !== undefined ? String(raw).trim() : ""
  if (name) return name
  return `${layerName} #${index + 1}`
}

export function featureArea(props: Record<string, unknown>): number | null {
  return toNumber(firstField(props, AREA_FIELDS))
}

export function featurePerimeter(props: Record<string, unknown>): number | null {
  return toNumber(firstField(props, PERIMETER_FIELDS))
}

export async function loadManifest(): Promise<GisLayerMeta[]> {
  const res = await fetch("/gis/manifest.json", { cache: "no-store" })
  if (!res.ok) throw new Error("manifest not found")
  return res.json()
}

export async function loadAllFeatures(
  meta: GisLayerMeta[],
): Promise<{ layer: GisLayerMeta; geojson: any; features: GisFeatureInfo[] }[]> {
  return Promise.all(
    meta.map(async (layer) => {
      const r = await fetch(layer.file, { cache: "no-store" })
      const geojson = r.ok ? await r.json() : { type: "FeatureCollection", features: [] }
      const features: GisFeatureInfo[] = (geojson.features || []).map((f: any, i: number) => {
        const props = (f.properties as Record<string, unknown>) || {}
        // Tag the raw feature so the Leaflet layer can resolve a click back to
        // this record (used for selection / highlight).
        f.properties = props
        ;(props as any).__uid = `${layer.slug}:${i}`
        return {
          uid: `${layer.slug}:${i}`,
          layerSlug: layer.slug,
          layerName: layer.name,
          color: layer.color,
          index: i,
          name: displayName(layer.name, props, i),
          area: featureArea(props),
          perimeter: featurePerimeter(props),
          geometryType: f.geometry?.type ?? "Unknown",
          properties: props,
          feature: f,
        }
      })
      return { layer, geojson, features }
    }),
  )
}

// Area comes in m² (Shape_Area). Scale the unit to keep the number readable:
// km² for very large admin boundaries, ha for park zones, m² for the smallest.
export function formatArea(n: number | null): string {
  if (n === null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} km²`
  if (n >= 10_000) return `${(n / 10_000).toFixed(2)} ha`
  return `${n.toFixed(0)} m²`
}

export function formatNumber(n: number | null, unit = ""): string {
  if (n === null) return "—"
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`
}

export function exportGeoJSON(name: string, geojson: any) {
  downloadBlob(`${name}.geojson`, JSON.stringify(geojson, null, 2), "application/geo+json")
}

export function exportCSV(name: string, features: GisFeatureInfo[]) {
  if (features.length === 0) return
  const keys = Array.from(
    features.reduce((set, f) => {
      Object.keys(f.properties)
        .filter((k) => !k.startsWith("__"))
        .forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  )
  const header = ["layer", "name", ...keys]
  const rows = features.map((f) => [
    f.layerName,
    f.name,
    ...keys.map((k) => {
      const v = f.properties[k]
      const s = v === null || v === undefined ? "" : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }),
  ])
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
  downloadBlob(`${name}.csv`, "﻿" + csv, "text/csv;charset=utf-8")
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

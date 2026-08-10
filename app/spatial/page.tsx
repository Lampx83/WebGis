"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import "leaflet/dist/leaflet.css"
import {
  ArrowLeft,
  Search,
  Ruler,
  Download,
  Layers as LayersIcon,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
} from "lucide-react"
import {
  loadManifest,
  loadAllFeatures,
  formatArea,
  exportGeoJSON,
  exportCSV,
  type GisFeatureInfo,
} from "@/lib/gis"
import type { LayerData } from "@/components/spatial/spatial-map"
import { SpatialStats } from "@/components/spatial/spatial-stats"

const SpatialMap = dynamic(() => import("@/components/spatial/spatial-map").then((m) => m.SpatialMap), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Đang tải bản đồ…</div>,
})

type Tab = "detail" | "stats" | "table"

export default function SpatialPage() {
  const [data, setData] = useState<LayerData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [minAreaHa, setMinAreaHa] = useState(0)
  const [measure, setMeasure] = useState(false)
  const [tab, setTab] = useState<Tab>("stats")
  const [flyKey, setFlyKey] = useState(0)
  const [panelsOpen, setPanelsOpen] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const meta = await loadManifest()
        const loaded = await loadAllFeatures(meta)
        setData(loaded)
        setVisible(Object.fromEntries(meta.map((m) => [m.slug, true])))
      } catch (e: any) {
        setError(e?.message ?? "Không tải được dữ liệu GIS")
      }
    })()
  }, [])

  const allFeatures = useMemo<GisFeatureInfo[]>(() => (data ? data.flatMap((l) => l.features) : []), [data])

  const maxAreaHa = useMemo(() => {
    const areas = allFeatures.map((f) => (f.area ?? 0) / 10000)
    return Math.ceil(Math.max(1, ...areas))
  }, [allFeatures])

  const areaRange = minAreaHa > 0 ? ([minAreaHa * 10000, Infinity] as [number, number]) : null

  const filteredList = useMemo(() => {
    const s = search.trim().toLowerCase()
    return allFeatures.filter((f) => {
      if (visible[f.layerSlug] === false) return false
      if (s && !f.name.toLowerCase().includes(s)) return false
      if (minAreaHa > 0 && !/boundary/i.test(f.layerName) && (f.area ?? 0) < minAreaHa * 10000) return false
      return true
    })
  }, [allFeatures, search, visible, minAreaHa])

  const selected = useMemo(() => allFeatures.find((f) => f.uid === selectedUid) ?? null, [allFeatures, selectedUid])

  const selectFeature = (uid: string) => {
    setSelectedUid(uid)
    setTab("detail")
    setFlyKey((k) => k + 1)
  }

  function handleExportGeoJSON() {
    if (!data) return
    const features = data.filter((l) => visible[l.layer.slug] !== false).flatMap((l) => l.geojson.features)
    exportGeoJSON("cang_hai_phong_gis", { type: "FeatureCollection", features })
  }
  function handleExportCSV() {
    exportCSV("cang_hai_phong_features", filteredList)
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-center p-8">
        <div>
          <p className="text-lg font-semibold text-red-600 mb-2">Lỗi tải dữ liệu GIS</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Link href="/" className="text-primary underline">
            ← Về Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-3 md:px-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="p-2 rounded-md hover:bg-muted text-muted-foreground" title="Về Dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-card-foreground truncate">Không gian GIS — Cảng Hải Phòng</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Hiển thị · tra cứu · thống kê biến động không gian</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setMeasure((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
              measure ? "bg-orange-600 text-white" : "hover:bg-muted text-muted-foreground"
            }`}
            title="Công cụ đo khoảng cách / diện tích"
          >
            <Ruler className="h-4 w-4" />
            <span className="hidden md:inline">Đo</span>
          </button>
          <button onClick={handleExportGeoJSON} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted text-muted-foreground" title="Xuất lớp đang hiện ra GeoJSON">
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">GeoJSON</span>
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted text-muted-foreground" title="Xuất danh sách đối tượng ra CSV">
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">CSV</span>
          </button>
          <button onClick={() => setPanelsOpen((v) => !v)} className="p-2 rounded-md hover:bg-muted text-muted-foreground" title={panelsOpen ? "Ẩn bảng điều khiển" : "Hiện bảng điều khiển"}>
            {panelsOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left panel: layers + search + filter + list */}
        {panelsOpen && (
          <aside className="w-72 shrink-0 border-r border-border bg-card overflow-y-auto hidden lg:block">
            <div className="p-3 space-y-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên khu…"
                    className="w-full pl-8 pr-2 py-2 text-sm rounded-md border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Layers */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <LayersIcon className="h-3.5 w-3.5" /> LỚP BẢN ĐỒ
                </p>
                <div className="space-y-1.5">
                  {data?.map((l) => (
                    <label key={l.layer.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visible[l.layer.slug] !== false}
                        onChange={(e) => setVisible((v) => ({ ...v, [l.layer.slug]: e.target.checked }))}
                      />
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: l.layer.color }} />
                      <span className="flex-1 truncate">{l.layer.name}</span>
                      <span className="text-xs text-muted-foreground">{l.layer.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Area filter */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  LỌC DIỆN TÍCH ≥ {minAreaHa.toFixed(2)} ha
                </p>
                <input
                  type="range"
                  min={0}
                  max={maxAreaHa}
                  step={Math.max(0.01, maxAreaHa / 100)}
                  value={minAreaHa}
                  onChange={(e) => setMinAreaHa(Number(e.target.value))}
                  className="w-full"
                />
                {minAreaHa > 0 && (
                  <button onClick={() => setMinAreaHa(0)} className="text-xs text-primary underline mt-1">
                    Bỏ lọc
                  </button>
                )}
              </div>

              {/* Feature list */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  ĐỐI TƯỢNG ({filteredList.length})
                </p>
                <div className="space-y-0.5">
                  {filteredList.map((f) => (
                    <button
                      key={f.uid}
                      onClick={() => selectFeature(f.uid)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        selectedUid === f.uid ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"
                      }`}
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatArea(f.area)}</span>
                    </button>
                  ))}
                  {filteredList.length === 0 && <p className="text-xs text-muted-foreground py-2">Không có đối tượng phù hợp.</p>}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Map */}
        <main className="flex-1 min-w-0 relative">
          {data ? (
            <SpatialMap
              layers={data}
              visible={visible}
              selectedUid={selectedUid}
              onSelect={(uid) => (uid ? selectFeature(uid) : setSelectedUid(null))}
              areaRange={areaRange}
              searchTerm={search}
              measure={measure}
              flyKey={flyKey}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Đang tải dữ liệu GIS…</div>
          )}
        </main>

        {/* Right panel: tabs */}
        {panelsOpen && (
          <aside className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto hidden lg:block">
            <div className="flex border-b border-border sticky top-0 bg-card z-10">
              {([
                ["stats", "Thống kê"],
                ["detail", "Chi tiết"],
                ["table", "Bảng"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {tab === "stats" && data && <SpatialStats layers={data} onSelect={selectFeature} />}

              {tab === "detail" &&
                (selected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: selected.color }} />
                      <h3 className="font-semibold">{selected.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Lớp</p>
                        <p className="font-medium">{selected.layerName}</p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Hình học</p>
                        <p className="font-medium">{selected.geometryType}</p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Diện tích</p>
                        <p className="font-medium">{formatArea(selected.area)}</p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Chu vi</p>
                        <p className="font-medium">{selected.perimeter != null ? `${selected.perimeter.toFixed(0)} m` : "—"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">THUỘC TÍNH</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {Object.entries(selected.properties)
                            .filter(([k, v]) => !k.startsWith("__") && v !== null && String(v).trim() !== "")
                            .map(([k, v]) => (
                              <tr key={k} className="border-b border-border/60">
                                <td className="py-1 pr-2 text-muted-foreground align-top">{k}</td>
                                <td className="py-1 font-medium break-words">{String(v)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 py-6">
                    <MapPin className="h-4 w-4" /> Bấm một đối tượng trên bản đồ hoặc trong danh sách để xem chi tiết.
                  </div>
                ))}

              {tab === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-1.5 pr-2">Tên</th>
                        <th className="py-1.5 pr-2">Lớp</th>
                        <th className="py-1.5 text-right">Diện tích</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((f) => (
                        <tr
                          key={f.uid}
                          onClick={() => selectFeature(f.uid)}
                          className={`cursor-pointer border-b border-border/60 hover:bg-muted ${
                            selectedUid === f.uid ? "bg-primary/10" : ""
                          }`}
                        >
                          <td className="py-1.5 pr-2">{f.name}</td>
                          <td className="py-1.5 pr-2 text-muted-foreground">{f.layerName}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">{formatArea(f.area)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { LayerData } from "./spatial-map"
import { formatArea } from "@/lib/gis"

interface Props {
  layers: LayerData[]
  onSelect: (uid: string) => void
}

// Layer-agnostic: works with whatever layers the manifest declares, instead
// of hardcoding specific slugs (the old "functional_zones"/"waterbody" pair
// only existed in the retired Bách Thảo demo dataset).
export function SpatialStats({ layers, onSelect }: Props) {
  const allFeatures = useMemo(() => layers.flatMap((l) => l.features), [layers])
  const totalArea = allFeatures.reduce((s, f) => s + (f.area ?? 0), 0)
  const withArea = allFeatures.filter((f) => f.area != null).length

  const chartData = useMemo(() => {
    return allFeatures
      .filter((f) => f.area != null)
      .map((f) => ({ uid: f.uid, name: f.name, area: (f.area as number) / 10000 }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 12)
  }, [allFeatures])

  const cards = [
    { label: "Số lớp bản đồ", value: String(layers.length), color: "text-emerald-600" },
    { label: "Tổng đối tượng", value: String(allFeatures.length), color: "text-sky-600" },
    { label: "Tổng diện tích công bố", value: formatArea(totalArea), color: "text-emerald-700" },
    { label: "Có số liệu diện tích", value: `${withArea}/${allFeatures.length}`, color: "text-sky-700" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Diện tích theo đối tượng (ha) — bấm để xem trên bản đồ</p>
        {chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có đối tượng nào công bố diện tích riêng.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} interval={0} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ha`, "Diện tích"]} />
                <Bar dataKey="area" radius={[0, 3, 3, 0]} onClick={(d: any) => d?.uid && onSelect(d.uid)} cursor="pointer">
                  {chartData.map((d) => (
                    <Cell key={d.uid} fill="#16a34a" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTranslation } from "@/lib/use-translation"

interface WaterLevelReportProps {
  deviceId: number
  startDate: Date
  endDate: Date
}

interface ChartData {
  date: string
  avg_value?: number
  min_value?: number
  max_value?: number
}

export function WaterLevelReport({ deviceId, startDate, endDate }: WaterLevelReportProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [historicalRes, statsRes] = await Promise.all([
          fetch(
            `/api/reports/historical?deviceId=${deviceId}&moduleType=water_level&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&aggregation=daily`,
          ),
          fetch(`/api/reports/statistics?deviceId=${deviceId}&moduleType=water_level&days=30`),
        ])

        const historical = await historicalRes.json()
        const statistics = await statsRes.json()

        setData(historical.data || [])
        setStats(statistics.stats)
      } catch (error) {
        console.error("Error fetching water level data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [deviceId, startDate, endDate])

  if (loading) {
    return <div className="text-center py-8">{t("reports", "loadingData")}</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("reports", "waterLevelStatistics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "average")}</p>
              <p className="text-2xl font-bold">{stats?.avg_value || t("reports", "notAvailable")} m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "minimum")}</p>
              <p className="text-2xl font-bold">{stats?.min_value || t("reports", "notAvailable")} m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "maximum")}</p>
              <p className="text-2xl font-bold">{stats?.max_value || t("reports", "notAvailable")} m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "stdDev")}</p>
              <p className="text-2xl font-bold">{stats?.std_dev || t("reports", "notAvailable")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports", "waterLevelTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_value" stroke="#0088FE" name={t("reports", "averageLevelM")} />
              <Line type="monotone" dataKey="min_value" stroke="#00C49F" name={t("reports", "minLevelM")} />
              <Line type="monotone" dataKey="max_value" stroke="#FFBB28" name={t("reports", "maxLevelM")} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

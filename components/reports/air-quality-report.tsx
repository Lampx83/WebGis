"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTranslation } from "@/lib/use-translation"

interface AirQualityReportProps {
  deviceId: number
  startDate: Date
  endDate: Date
}

interface ChartData {
  date: string
  avg_value: number
  min_value: number
  max_value: number
}

export function AirQualityReport({ deviceId, startDate, endDate }: AirQualityReportProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  const generateFakeData = () => {
    const fakeData: ChartData[] = []
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const avgValue = Math.floor(Math.random() * (150 - 30) + 30)
      fakeData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        avg_value: avgValue,
        min_value: Math.floor(avgValue * 0.7),
        max_value: Math.floor(avgValue * 1.3),
      })
    }
    return fakeData
  }

  const calculateFakeStats = (fakeData: ChartData[]) => {
    const values = fakeData.map((d) => d.avg_value)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = Math.round((sum / values.length) * 10) / 10
    const min = Math.min(...values)
    const max = Math.max(...values)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10

    return {
      avg_value: avg,
      min_value: min,
      max_value: max,
      std_dev: stdDev,
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const fakeData = generateFakeData()
        const fakeStats = calculateFakeStats(fakeData)

        setData(fakeData)
        setStats(fakeStats)
      } catch (error) {
        console.error("Error fetching air quality data:", error)
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
          <CardTitle>{t("reports", "statisticsLast30Days")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "average")}</p>
              <p className="text-2xl font-bold">{stats?.avg_value || t("reports", "notAvailable")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "minimum")}</p>
              <p className="text-2xl font-bold">{stats?.min_value || t("reports", "notAvailable")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("reports", "maximum")}</p>
              <p className="text-2xl font-bold">{stats?.max_value || t("reports", "notAvailable")}</p>
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
          <CardTitle>{t("reports", "airQualityIndexTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_value"
                stroke="#0088FE"
                name={t("reports", "averageAqi")}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="min_value"
                stroke="#00C49F"
                name={t("reports", "minAqi")}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="max_value"
                stroke="#FFBB28"
                name={t("reports", "maxAqi")}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

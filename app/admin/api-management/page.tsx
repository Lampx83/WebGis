"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

interface Endpoint {
  endpoint: string
  method: string
  count: number
  avg_response_time: number
  error_count: number
}

interface ApiStats {
  total_calls: number
  error_count: number
  success_count: number
  avg_response_time: number
  endpoints: Endpoint[]
  hourly_data?: Array<{ hour: string; calls: number; errors: number }>
}

const MOCK_DATA: ApiStats = {
  total_calls: 15420,
  error_count: 142,
  success_count: 15278,
  avg_response_time: 245,
  endpoints: [
    { endpoint: "/api/devices", method: "GET", count: 3420, avg_response_time: 120, error_count: 12 },
    { endpoint: "/api/monitoring-status", method: "GET", count: 2850, avg_response_time: 185, error_count: 8 },
    { endpoint: "/api/alerts", method: "GET", count: 2100, avg_response_time: 215, error_count: 25 },
    { endpoint: "/api/thresholds/check-window", method: "POST", count: 1950, avg_response_time: 340, error_count: 35 },
    { endpoint: "/api/reports/historical", method: "GET", count: 1680, avg_response_time: 420, error_count: 18 },
    { endpoint: "/api/analytics/api-usage", method: "GET", count: 1420, avg_response_time: 280, error_count: 22 },
  ],
  hourly_data: [
    { hour: "00:00", calls: 580, errors: 5 },
    { hour: "01:00", calls: 620, errors: 4 },
    { hour: "02:00", calls: 650, errors: 6 },
    { hour: "03:00", calls: 590, errors: 3 },
    { hour: "04:00", calls: 710, errors: 8 },
    { hour: "05:00", calls: 780, errors: 7 },
    { hour: "06:00", calls: 890, errors: 12 },
    { hour: "07:00", calls: 950, errors: 14 },
    { hour: "08:00", calls: 1020, errors: 18 },
    { hour: "09:00", calls: 1100, errors: 16 },
  ],
}

export default function ApiManagementPage() {
  const [stats, setStats] = useState<ApiStats>(MOCK_DATA)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(7)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/api-usage?days=${days}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data || MOCK_DATA)
        } else {
          setStats(MOCK_DATA)
        }
      } catch (error) {
        console.error("Failed to fetch API analytics:", error)
        setStats(MOCK_DATA)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [days])

  const successRate = ((stats.success_count / stats.total_calls) * 100).toFixed(1)
  const errorRate = ((stats.error_count / stats.total_calls) * 100).toFixed(1)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{t("admin", "apiManagement")}</h2>
          <p className="text-muted-foreground mt-2">{t("admin", "monitorAnalyzeApiUsagePerf")}</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number.parseInt(e.target.value))}
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
        >
          <option value={1}>{t("admin", "last24Hours")}</option>
          <option value={7}>{t("admin", "last7Days")}</option>
          <option value={30}>{t("admin", "last30Days")}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin", "totalCalls")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_calls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">API requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin", "successRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.success_count.toLocaleString()} successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin", "errorRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.error_count} errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin", "avgResponse")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_response_time}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Average response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">99.1%</div>
            <p className="text-xs text-muted-foreground mt-1">Service status</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly API Calls & Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.hourly_data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#3b82f6" name="API Calls" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoint Call Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.endpoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin", "topApiEndpoints")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "endpoint")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin", "method")}</th>
                  <th className="text-right py-3 px-4 font-semibold">{t("admin", "calls")}</th>
                  <th className="text-right py-3 px-4 font-semibold">{t("admin", "avgResponseMs")}</th>
                  <th className="text-right py-3 px-4 font-semibold">{t("admin", "errorsCount")}</th>
                  <th className="text-right py-3 px-4 font-semibold">Error %</th>
                </tr>
              </thead>
              <tbody>
                {stats.endpoints.map((endpoint) => (
                  <tr
                    key={`${endpoint.endpoint}-${endpoint.method}`}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="py-3 px-4 font-mono text-xs">{endpoint.endpoint}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded text-xs font-medium">
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{endpoint.count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{endpoint.avg_response_time}ms</td>
                    <td className="py-3 px-4 text-right">
                      {endpoint.error_count > 0 ? (
                        <span className="text-red-600 font-semibold">{endpoint.error_count}</span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {((endpoint.error_count / endpoint.count) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

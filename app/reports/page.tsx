"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/reports/date-range-picker"
import { AirQualityReport } from "@/components/reports/air-quality-report"
import { WaterLevelReport } from "@/components/reports/water-level-report"
import { subDays } from "date-fns"
import Link from "next/link"
import { useTranslation } from "@/lib/use-translation"

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState(new Date())
  const [selectedDevice, setSelectedDevice] = useState("1")
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [runningCleanup, setRunningCleanup] = useState(false)
  const { t } = useTranslation()

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }

  const handleRunCleanup = async () => {
    setRunningCleanup(true)
    try {
      const response = await fetch("/api/data-retention/cleanup", { method: "POST" })
      const result = await response.json()
      setCleanupResult(result)
    } catch (error) {
      console.error("Error running cleanup:", error)
      setCleanupResult({ error: "Failed to run cleanup" })
    } finally {
      setRunningCleanup(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{t("reports", "statisticalReports")}</h1>
            <p className="text-muted-foreground mt-2">{t("reports", "historicalDataAnalysis1YearRetention")}</p>
          </div>
          <Link href="/">
            <Button variant="outline">{t("reports", "backToDashboard")}</Button>
          </Link>
        </div>

        {/* Date Range Picker */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3">
            <DateRangePicker onDateRangeChange={handleDateRangeChange} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("reports", "selectDevice")}</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg"
              >
                <option value="1">{t("reports", "device1")}</option>
                <option value="2">{t("reports", "device2")}</option>
                <option value="3">{t("reports", "device3")}</option>
                <option value="4">{t("reports", "device4")}</option>
                <option value="5">{t("reports", "device5")}</option>
                <option value="6">{t("reports", "device6")}</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Reports */}
        <Tabs defaultValue="air-quality" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="air-quality">{t("reports", "airQuality")}</TabsTrigger>
            <TabsTrigger value="water-level">{t("reports", "waterLevel")}</TabsTrigger>
            <TabsTrigger value="retention">{t("reports", "dataRetention")}</TabsTrigger>
          </TabsList>

          <TabsContent value="air-quality" className="mt-6">
            <AirQualityReport deviceId={Number.parseInt(selectedDevice)} startDate={startDate} endDate={endDate} />
          </TabsContent>

          <TabsContent value="water-level" className="mt-6">
            <WaterLevelReport deviceId={Number.parseInt(selectedDevice)} startDate={startDate} endDate={endDate} />
          </TabsContent>

          <TabsContent value="retention" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("reports", "dataRetentionPolicy")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("reports", "detailedData")}</p>
                    <p className="text-2xl font-bold">{t("reports", "days30")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("reports", "hourlyAggregation")}</p>
                    <p className="text-2xl font-bold">{t("reports", "year1")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("reports", "monthlyAggregation")}</p>
                    <p className="text-2xl font-bold">{t("reports", "forever")}</p>
                  </div>
                </div>

                <Button onClick={handleRunCleanup} disabled={runningCleanup} className="w-full">
                  {runningCleanup ? t("reports", "runningCleanup") : t("reports", "runDataCleanupNow")}
                </Button>

                {cleanupResult && (
                  <Card>
                    <CardContent className="pt-6">
                      {cleanupResult.error ? (
                        <p className="text-red-600">{cleanupResult.error}</p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold">{t("reports", "cleanupResults")}</p>
                          <p>Environmental readings deleted: {cleanupResult.results?.environmental_readings_deleted}</p>
                          <p>Water level readings deleted: {cleanupResult.results?.water_level_readings_deleted}</p>
                          <p>Camera events deleted: {cleanupResult.results?.camera_events_deleted}</p>
                          <p>Hourly aggregations deleted: {cleanupResult.results?.readings_hourly_deleted}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

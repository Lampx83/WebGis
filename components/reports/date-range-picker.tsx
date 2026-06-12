"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { subDays, format } from "date-fns"
import { useTranslation } from "@/lib/use-translation"

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void
}

export function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState(new Date())
  const { t } = useTranslation()

  const handlePreset = (days: number) => {
    const end = new Date()
    const start = subDays(end, days)
    setStartDate(start)
    setEndDate(end)
    onDateRangeChange(start, end)
  }

  const handleApply = () => {
    onDateRangeChange(startDate, endDate)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("reports", "dateRange")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handlePreset(7)}>
            {t("reports", "last7Days")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset(30)}>
            {t("reports", "last30Days")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset(90)}>
            {t("reports", "last90Days")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset(365)}>
            {t("reports", "last1Year")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("reports", "startDate")}</label>
            <input
              type="date"
              value={format(startDate, "yyyy-MM-dd")}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("reports", "endDate")}</label>
            <input
              type="date"
              value={format(endDate, "yyyy-MM-dd")}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-lg"
            />
          </div>
        </div>

        <Button onClick={handleApply} className="w-full">
          {t("reports", "apply")}
        </Button>
      </CardContent>
    </Card>
  )
}

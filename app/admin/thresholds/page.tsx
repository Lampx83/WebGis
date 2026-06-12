"use client"
import { ThresholdManager } from "@/components/threshold-manager"
import { useTranslation } from "@/lib/use-translation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ThresholdsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t("thresholds", "thresholdSettings")}</h1>
        <p className="text-muted-foreground mt-2">{t("thresholds", "configureAlerts")}</p>
      </div>

      <ThresholdManager />

      <Card>
        <CardHeader>
          <CardTitle>{t("thresholds", "thresholdViolations")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("thresholds", "noViolations")}</p>
        </CardContent>
      </Card>
    </div>
  )
}

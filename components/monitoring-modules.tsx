"use client"

import { Card } from "@/components/ui/card"
import { useTranslation } from "@/lib/use-translation"

interface MonitoringModule {
  name: string
  total_devices: number
  normal_count: number
  warning_count: number
  alarm_count: number
}

interface MonitoringStatus {
  modules: MonitoringModule[]
}

interface Props {
  monitoringStatus: MonitoringStatus | null
  selectedModule: string
  onSelectModule: (module: string) => void
}

export function MonitoringModules({ monitoringStatus, selectedModule, onSelectModule }: Props) {
  const modules = monitoringStatus?.modules || []
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sidebar-foreground">{t("monitoringModules", "monitoringModules")}</h3>

      <div className="grid grid-cols-1 gap-3">
        {modules.map((module) => (
          <Card
            key={module.name}
            className={`cursor-pointer transition-all ${
              selectedModule === module.name ? "ring-2 ring-sidebar-primary bg-sidebar-accent/50" : ""
            }`}
            onClick={() => onSelectModule(module.name)}
          >
            <div className="p-3">
              <p className="font-semibold text-sm capitalize mb-2">{module.name.replace(/_/g, " ")}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="font-bold text-green-600">{module.normal_count}</p>
                  <p className="text-muted-foreground">{t("monitoringModules", "normal")}</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-yellow-600">{module.warning_count}</p>
                  <p className="text-muted-foreground">{t("monitoringModules", "warning")}</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-red-600">{module.alarm_count}</p>
                  <p className="text-muted-foreground">{t("monitoringModules", "alarm")}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

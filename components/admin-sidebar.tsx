"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Database, Settings, Home, Wifi } from "lucide-react"
import { useTranslation } from "@/lib/use-translation"

export function AdminSidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const adminItems = [
    { href: "/admin", label: t("admin", "adminDashboard"), icon: Home },
    { href: "/admin/devices", label: t("admin", "deviceManagement"), icon: Wifi },
    { href: "/admin/api-management", label: t("admin", "apiManagement"), icon: BarChart3 },
    { href: "/admin/raw-data", label: t("admin", "rawDataLogging"), icon: Database },
    { href: "/admin/thresholds", label: t("thresholds", "thresholdSettings"), icon: Settings },
  ]

  return (
    <div className="w-64 border-r border-sidebar-border bg-secondary-foreground h-full flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary">{t("sidebar", "adminPanel")}</h1>
      </div>

      <nav className="p-4 space-y-2 flex-grow">
        {adminItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors bg-background my-[17px] ${
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium text-card-foreground">{item.label}</span>
              </button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Link href="/">
          <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            {t("sidebar", "backToDashboard")}
          </button>
        </Link>
      </div>
    </div>
  )
}

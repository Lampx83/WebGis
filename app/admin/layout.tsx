"use client"

import type React from "react"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/lib/use-translation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <div className="bg-card border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-card-foreground">
              {t("admin", "administrationConsole")}
            </h1>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </div>
    </div>
  )
}

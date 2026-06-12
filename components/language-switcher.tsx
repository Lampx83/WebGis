"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Button
        variant={language === "vi" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("vi")}
        className="h-8 px-2 text-xs"
      >
        Tiếng Việt
      </Button>
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="h-8 px-2 text-xs"
      >
        English
      </Button>
    </div>
  )
}

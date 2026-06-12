"use client"

import { translations, type TranslationKey } from "@/lib/translations"

export function t(section: string, key: string, language: "en" | "vi" = "en"): string {
  try {
    const sectionTranslations = translations[language][section as TranslationKey] as any
    return sectionTranslations?.[key] || key
  } catch {
    return key
  }
}

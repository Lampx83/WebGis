"use client"

import { useLanguage } from "./language-context"
import { translations, type TranslationKey } from "./translations"

export function useTranslation() {
  const { language } = useLanguage()

  const t = (section: string, key: string): string => {
    try {
      const sectionTranslations = translations[language][section as TranslationKey] as any
      return sectionTranslations?.[key] || key
    } catch {
      return key
    }
  }

  return { t, language }
}

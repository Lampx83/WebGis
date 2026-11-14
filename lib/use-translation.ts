"use client"

import { useLanguage } from "./language-context"
import { translations, type TranslationKey } from "./translations"

export function useTranslation() {
  const { language } = useLanguage()

  // t("section", "key") or the dotted shorthand t("section.key").
  const t = (sectionOrPath: string, maybeKey?: string): string => {
    let section = sectionOrPath
    let key = maybeKey
    if (key === undefined) {
      const dot = sectionOrPath.indexOf(".")
      if (dot === -1) return sectionOrPath
      section = sectionOrPath.slice(0, dot)
      key = sectionOrPath.slice(dot + 1)
    }
    try {
      const sectionTranslations = translations[language][section as TranslationKey] as any
      return sectionTranslations?.[key] || key
    } catch {
      return key
    }
  }

  return { t, language }
}

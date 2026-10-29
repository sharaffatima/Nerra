import { en } from './locales/en'
import { ar } from './locales/ar'
import { useLocaleStore } from '@/stores/locale-store'

const translations = { en, ar } as const

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return path
  }, obj) as string
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  const t = (key: string): string => {
    return getNestedValue(translations[locale] as Record<string, unknown>, key)
  }
  return { t, locale, isRtl: locale === 'ar' }
}

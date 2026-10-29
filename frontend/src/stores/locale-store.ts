import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocaleStore {
  locale: 'en' | 'ar'
  setLocale: (locale: 'en' | 'ar') => void
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = locale
        set({ locale })
      },
    }),
    { name: 'locale-storage' },
  ),
)

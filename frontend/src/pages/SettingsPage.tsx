import { useTranslation } from '@/i18n'
import { useLocaleStore } from '@/stores/locale-store'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { authApi } from '@/api/api'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocaleStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-brand text-3xl text-[rgb(var(--color-text))]">{t('nav.settings')}</h1>

      <div className="rounded-2xl bg-[rgb(var(--color-surface))] p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('settings.language')}</h2>
          <div className="ease-m3 mt-3 inline-flex rounded-full bg-[rgb(var(--color-surface-secondary))] p-1">
            <button
              onClick={() => setLocale('en')}
              className={`ease-m3 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 active:scale-95 ${
                locale === 'en'
                  ? 'bg-[rgb(var(--color-primary))] text-white shadow-sm'
                  : 'text-[rgb(var(--color-text))] hover:text-[rgb(var(--color-primary))]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale('ar')}
              className={`ease-m3 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 active:scale-95 ${
                locale === 'ar'
                  ? 'bg-[rgb(var(--color-primary))] text-white shadow-sm'
                  : 'text-[rgb(var(--color-text))] hover:text-[rgb(var(--color-primary))]'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        <div className="border-t border-[rgb(var(--color-border))] pt-6">
          <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('settings.theme')}</h2>
          <div className="mt-3">
            <button
              onClick={toggleTheme}
              className="ease-m3 flex items-center gap-3 rounded-full bg-[rgb(var(--color-surface-secondary))] px-4 py-2.5 text-sm text-[rgb(var(--color-text))] transition-all duration-300 hover:bg-[rgb(var(--color-border))] active:scale-95"
            >
              {theme === 'light' ? <Sun className="h-4 w-4 text-[rgb(var(--color-accent-orange))]" /> : <Moon className="h-4 w-4 text-[rgb(var(--color-primary))]" />}
              {theme === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
            </button>
          </div>
        </div>

        <div className="border-t border-[rgb(var(--color-border))] pt-6">
          <Button
            onClick={handleLogout}
            className="bg-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger))]"
          >
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    </div>
  )
}
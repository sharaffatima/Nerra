import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/api'
import { useAuthStore } from '@/stores/auth-store'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { friendlyError } from '@/lib/errors'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tokens = await authApi.login({ username, password })
      login(tokens.access, tokens.refresh)
      navigate('/')
    } catch (err) {
      setError(friendlyError(err, t('auth.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[rgb(var(--color-bg))] px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -start-24 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--color-accent-sage))]/20 blur-3xl" />
        <div className="absolute -bottom-32 -end-16 h-96 w-96 rounded-full bg-[rgb(var(--color-accent-orange))]/20 blur-3xl" />
        <div className="absolute end-1/4 top-1/3 h-64 w-64 rounded-full bg-[rgb(var(--color-accent-blue-light))]/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl bg-[rgb(var(--color-surface))] p-8 shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary))] text-lg font-bold text-white">
          N
        </div>
        <h1 className="font-brand mt-6 text-3xl text-[rgb(var(--color-text))]">{t('auth.loginTitle')}</h1>
        <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{t('auth.loginSubtitle')}</p>

        {error && (
          <div className="mt-4 rounded-xl bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <Input
            id="username"
            label={t('auth.username')}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            id="password"
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </form>

        <p className="mt-3 text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-[rgb(var(--color-primary))] hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-[rgb(var(--color-text-muted))]">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
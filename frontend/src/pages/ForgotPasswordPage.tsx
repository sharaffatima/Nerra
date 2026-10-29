import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/api'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { friendlyError } from '@/lib/errors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(friendlyError(err, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[rgb(var(--color-bg))] px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -end-20 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--color-accent-orange))]/15 blur-3xl" />
        <div className="absolute -bottom-28 -start-16 h-96 w-96 rounded-full bg-[rgb(var(--color-accent-sage))]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl bg-[rgb(var(--color-surface))] p-8 shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary))] text-lg font-bold text-white">
          N
        </div>
        <h1 className="font-brand mt-6 text-3xl text-[rgb(var(--color-text))]">{t('auth.forgotTitle')}</h1>
        <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{t('auth.forgotSubtitle')}</p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-[rgb(var(--color-accent-sage-light))] p-4 text-sm text-[rgb(var(--color-accent-sage))]">
            {t('auth.resetSent')}
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-xl bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Input
                id="email"
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? t('common.loading') : t('auth.sendResetLink')}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-sm text-[rgb(var(--color-text-muted))]">
          <Link to="/login" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
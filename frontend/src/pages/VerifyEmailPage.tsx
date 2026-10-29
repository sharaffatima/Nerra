import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authApi } from '@/api/api'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'

export function VerifyEmailPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const { t } = useTranslation()

  useEffect(() => {
    let cancelled = false
    if (uid && token) {
      authApi
        .verifyEmail(uid, token)
        .then(() => {
          if (!cancelled) setState('success')
        })
        .catch(() => {
          if (!cancelled) setState('error')
        })
    } else {
      setState('error')
    }
    return () => {
      cancelled = true
    }
  }, [uid, token])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[rgb(var(--color-bg))] px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -end-20 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--color-accent-orange))]/15 blur-3xl" />
        <div className="absolute -bottom-28 -start-16 h-96 w-96 rounded-full bg-[rgb(var(--color-accent-sage))]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl bg-[rgb(var(--color-surface))] p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary))] text-lg font-bold text-white">
          N
        </div>
        <h1 className="font-brand mt-6 text-3xl text-[rgb(var(--color-text))]">{t('auth.verifyTitle')}</h1>

        {state === 'loading' && (
          <p className="mt-4 text-sm text-[rgb(var(--color-text-muted))]">{t('common.loading')}</p>
        )}
        {state === 'success' && (
          <>
            <div className="mt-6 rounded-xl bg-[rgb(var(--color-accent-sage-light))] p-4 text-sm text-[rgb(var(--color-accent-sage))]">
              {t('auth.verifySuccess')}
            </div>
            <Link to="/login" className="mt-4 block">
              <Button size="lg" className="w-full">{t('auth.login')}</Button>
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mt-6 rounded-xl bg-[rgb(var(--color-danger-light))] p-4 text-sm text-[rgb(var(--color-danger))]">
              {t('auth.verifyFailure')}
            </div>
            <Link to="/login" className="mt-4 block">
              <Button variant="text" className="w-full">{t('auth.login')}</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
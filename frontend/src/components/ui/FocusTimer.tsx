import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'

type Mode = 'focus' | 'break'

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 }
const LS_KEY = 'nerra-focus-v1'

interface Persisted {
  mode: Mode
  end: number | null
  running: boolean
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

function fmt(total: number) {
  const mins = Math.floor(total / 60).toString().padStart(2, '0')
  const secs = (total % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const R = 66
const CIRCUMFERENCE = 2 * Math.PI * R

export function FocusTimer() {
  const { t } = useTranslation()
  const saved = useRef(loadPersisted())
  const [mode, setMode] = useState<Mode>(saved.current?.mode ?? 'focus')
  const [remaining, setRemaining] = useState(() => {
    const s = saved.current
    if (s?.end && s.end > Date.now()) return Math.ceil((s.end - Date.now()) / 1000)
    return DURATIONS[s?.mode ?? 'focus']
  })
  const [running, setRunning] = useState(
    () => !!(saved.current?.running && saved.current?.end && saved.current.end > Date.now()),
  )
  const [message, setMessage] = useState('')
  const endRef = useRef<number | null>(
    saved.current?.running && saved.current?.end && saved.current.end > Date.now() ? saved.current.end : null,
  )

  const duration = DURATIONS[mode]

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (endRef.current == null) return
      const ms = endRef.current - Date.now()
      if (ms <= 0) {
        clearInterval(id)
        endRef.current = null
        setRunning(false)
        if (mode === 'focus') {
          setMode('break')
          setRemaining(DURATIONS.break)
          setMessage(t('focus.sessionDone'))
        } else {
          setMode('focus')
          setRemaining(DURATIONS.focus)
          setMessage(t('focus.breakDone'))
        }
        return
      }
      setRemaining(Math.ceil(ms / 1000))
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode])

  const persist = (end: number | null, isRunning: boolean) => {
    localStorage.setItem(LS_KEY, JSON.stringify({ mode, end, running: isRunning } satisfies Persisted))
  }

  const start = () => {
    setMessage('')
    endRef.current = Date.now() + remaining * 1000
    setRunning(true)
    persist(endRef.current, true)
  }

  const pause = () => {
    setRunning(false)
    persist(null, false)
  }

  const reset = () => {
    setRunning(false)
    endRef.current = null
    setRemaining(duration)
    setMessage('')
    persist(null, false)
  }

  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setRemaining(DURATIONS[m])
    setMessage('')
    persist(null, false)
  }

  const offset = CIRCUMFERENCE * (remaining / duration)
  const isFocus = mode === 'focus'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <svg viewBox="0 0 150 150" className={`h-full w-full -rotate-90 ${isFocus ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-accent-orange))]'}`}>
          <circle cx="75" cy="75" r={R} fill="none" stroke="rgb(var(--color-surface-secondary))" strokeWidth="10" />
          <circle
            cx="75"
            cy="75"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="ease-linear transition-[stroke-dashoffset] duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-brand text-2xl text-[rgb(var(--color-text))]">{fmt(remaining)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--color-text-muted))]">
            {isFocus ? t('focus.focus') : t('focus.break')}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="ease-m3 inline-flex rounded-full bg-[rgb(var(--color-surface-secondary))] p-1">
          {(['focus', 'break'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`ease-m3 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 active:scale-95 ${
                mode === m
                  ? 'bg-[rgb(var(--color-accent-sage-light))] text-[rgb(var(--color-accent-sage))] shadow-sm'
                  : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]'
              }`}
            >
              {m === 'focus' ? t('focus.focus') : t('focus.break')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={running ? pause : start}>
            {running ? t('focus.pause') : remaining === duration ? t('focus.start') : t('focus.resume')}
          </Button>
          <Button variant="text" onClick={reset}>
            {t('focus.reset')}
          </Button>
        </div>

        {message && (
          <p className={`animate-pop text-sm font-medium ${isFocus ? 'text-[rgb(var(--color-accent-orange))]' : 'text-[rgb(var(--color-primary))]'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
import { useState, useRef } from 'react'
import { Mic, Square, X, RefreshCw, Loader2 } from 'lucide-react'
import { voiceApi } from '@/api/api'
import { useTranslation } from '@/i18n'
import { useLocaleStore } from '@/stores/locale-store'
import { ExtractionReview } from './ExtractionReview'
import { Button } from '@/components/ui/Button'
import type { VoiceItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: number
}

type Stage = 'idle' | 'recording' | 'extracting' | 'review'

const getSpeechRecognition = (): any | null => {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function VoiceCapture({ open, onClose, workspaceId }: Props) {
  const { t } = useTranslation()
  const locale = useLocaleStore((s) => s.locale)
  const [stage, setStage] = useState<Stage>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [items, setItems] = useState<VoiceItem[]>([])
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)
  const activeRef = useRef(false)
  const finalRef = useRef('')
  const interimRef = useRef('')

  const supported = typeof window !== 'undefined' && !!getSpeechRecognition()

  const resetState = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* noop */ }
    }
    recognitionRef.current = null
    activeRef.current = false
    finalRef.current = ''
    interimRef.current = ''
    setTranscript('')
    setInterim('')
    setItems([])
    setError('')
    setStage('idle')
  }

  const startRecording = () => {
    setError('')
    setTranscript('')
    setInterim('')
    finalRef.current = ''
    interimRef.current = ''
    const SR = getSpeechRecognition()
    if (!SR) {
      setError(t('voice.unsupported'))
      return
    }
    const recog = new SR()
    recog.lang = locale === 'ar' ? 'ar-SA' : 'en-US'
    recog.continuous = true
    recog.interimResults = true

    recog.onresult = (e: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interimText += res[0].transcript
      }
      finalRef.current = finalText
      interimRef.current = interimText
      setTranscript(finalText)
      setInterim(interimText)
    }

    recog.onerror = () => {
      if (activeRef.current) {
        activeRef.current = false
        setError(t('voice.error'))
        setStage('idle')
      }
    }

    recog.onend = () => {
      if (activeRef.current) {
        activeRef.current = false
        void submitTranscript((finalRef.current + interimRef.current).trim())
      }
    }

    recognitionRef.current = recog
    activeRef.current = true
    try {
      recog.start()
      setStage('recording')
    } catch {
      setError(t('voice.error'))
      setStage('idle')
    }
  }

  const stopRecording = () => {
    activeRef.current = false
    const recog = recognitionRef.current
    if (recog) {
      try { recog.stop() } catch { /* noop */ }
    }
    setStage('extracting')
    void submitTranscript((finalRef.current + interimRef.current).trim())
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const submitTranscript = async (text: string) => {
    if (!text) {
      setError(t('voice.emptyTranscript'))
      setStage('idle')
      return
    }
    setStage('extracting')
    try {
      const result = await voiceApi.extract(text)
      setItems(result)
      setStage('review')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(detail || t('voice.error'))
      setStage('idle')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="ease-m3 flex max-h-[85vh] w-full max-w-lg flex-col rounded-[28px] bg-[rgb(var(--color-surface))] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">{t('voice.title')}</h2>
          <button onClick={handleClose} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
            {error}
          </div>
        )}

        {!supported && stage === 'idle' && (
          <p className="mt-4 text-sm text-[rgb(var(--color-text-muted))]">{t('voice.unsupported')}</p>
        )}

        {stage === 'review' && (
          <div className="mt-4 flex-1 overflow-auto">
            <ExtractionReview items={items} workspaceId={workspaceId} />
            <div className="mt-4 flex gap-2">
              <Button onClick={resetState} variant="text">
                <RefreshCw className="h-4 w-4" />
                {t('voice.recordAgain')}
              </Button>
              <Button onClick={handleClose} className="ms-auto">
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}

        {stage === 'extracting' && (
          <div className="mt-8 flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))]" />
            <p className="text-sm text-[rgb(var(--color-text-muted))]">{t('voice.extracting')}</p>
          </div>
        )}

        {(stage === 'idle' || stage === 'recording') && (
          <div className="mt-6 flex flex-col items-center gap-6">
            <button
              onClick={stage === 'recording' ? stopRecording : startRecording}
              disabled={!supported}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                stage === 'recording'
                  ? 'bg-[rgb(var(--color-danger))] text-white'
                  : 'bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))]'
              }`}
            >
              {stage === 'recording' && (
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[rgb(var(--color-danger))]/40" />
              )}
              {stage === 'recording' ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="text-sm text-[rgb(var(--color-text-muted))]">
              {stage === 'recording' ? t('voice.listening') : t('voice.micHint')}
            </p>
          </div>
        )}

        {(stage === 'recording' || (stage === 'idle' && (transcript || interim))) && (
          <div className="mt-4 rounded-2xl bg-[rgb(var(--color-surface-secondary))] p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--color-text-muted))]">
              {t('voice.transcript')}
            </p>
            <p className="text-sm leading-relaxed text-[rgb(var(--color-text))]">
              {transcript}
              <span className="text-[rgb(var(--color-text-faint))]">{interim}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
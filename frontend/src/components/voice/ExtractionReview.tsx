import { useState } from 'react'
import { Trash2, Check, CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react'
import { todoApi, reminderApi } from '@/api/api'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import type { VoiceItem } from '@/types'

interface Props {
  items: VoiceItem[]
  workspaceId: number
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

const REPEAT_OPTIONS = [
  { value: 'none', labelKey: 'reminder.repeatNone' },
  { value: 'daily', labelKey: 'reminder.repeatDaily' },
  { value: 'weekly', labelKey: 'reminder.repeatWeekly' },
  { value: 'monthly', labelKey: 'reminder.repeatMonthly' },
]

export function ExtractionReview({ items: initialItems, workspaceId }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [items, setItems] = useState<VoiceItem[]>(initialItems)
  const [creatingId, setCreatingId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const updateItem = (index: number, patch: Partial<VoiceItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmItem = async (index: number) => {
    const item = items[index]
    if (!item.title.trim()) return
    if (item.type === 'reminder' && !item.reminder_time) return
    setCreatingId(index)
    setErrors((prev) => ({ ...prev, [index]: '' }))
    try {
      if (item.type === 'todo') {
        await todoApi.create({
          workspace: workspaceId,
          title: item.title.trim(),
          description: item.description ?? undefined,
          due_date: item.due_date,
        })
        qc.invalidateQueries({ queryKey: ['todos'] })
      } else {
        await reminderApi.create({
          workspace: workspaceId,
          title: item.title.trim(),
          reminder_time: item.reminder_time as string,
          repeat: item.repeat,
        })
        qc.invalidateQueries({ queryKey: ['reminders'] })
      }
      setItems((prev) => prev.filter((_, i) => i !== index))
    } catch {
      setErrors((prev) => ({ ...prev, [index]: t('voice.createFailed') }))
    } finally {
      setCreatingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-[rgb(var(--color-accent-sage))]" />
        <p className="text-[rgb(var(--color-text))]">{t('voice.allCreated')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[rgb(var(--color-text-muted))]">
        {t('voice.extracted')}{' '}
        <span className="rounded-full bg-[rgb(var(--color-accent-sage-light))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--color-accent-sage))]">
          {items.length}
        </span>
      </p>
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl bg-[rgb(var(--color-surface-secondary))] p-3">
          <div className="flex items-start gap-2">
            <span
              className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                item.type === 'todo'
                  ? 'bg-[rgb(var(--color-accent-blue-light))] text-[rgb(var(--color-accent-blue))]'
                  : 'bg-[rgb(var(--color-accent-orange-light))] text-[rgb(var(--color-accent-orange))]'
              }`}
            >
              {item.type === 'todo' ? t('nav.todos') : t('nav.reminders')}
            </span>
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              className="ease-m3 flex-1 min-w-0 rounded-full px-2 py-1 text-sm text-[rgb(var(--color-text))] outline-none transition-colors duration-200 focus:bg-[rgb(var(--color-surface))]"
            />
            <button onClick={() => removeItem(index)} className="ease-m3 shrink-0 rounded-full p-1 text-[rgb(var(--color-danger))] transition-all duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-90">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.type === 'todo' ? (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-[rgb(var(--color-text-muted))]" />
                <input
                  type="datetime-local"
                  value={toLocalInputValue(item.due_date)}
                  onChange={(e) => updateItem(index, { due_date: e.target.value ? fromLocalInputValue(e.target.value) : null })}
                  className="ease-m3 rounded-lg bg-[rgb(var(--color-surface))] px-2 py-1 text-xs text-[rgb(var(--color-text))] outline-none transition-colors duration-200 focus:border-b-2 focus:border-[rgb(var(--color-primary))]"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-[rgb(var(--color-text-muted))]" />
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(item.reminder_time)}
                    onChange={(e) => updateItem(index, { reminder_time: e.target.value ? fromLocalInputValue(e.target.value) : null })}
                    className="ease-m3 rounded-lg bg-[rgb(var(--color-surface))] px-2 py-1 text-xs text-[rgb(var(--color-text))] outline-none transition-colors duration-200 focus:border-b-2 focus:border-[rgb(var(--color-primary))]"
                  />
                </div>
                <select
                  value={item.repeat}
                  onChange={(e) => updateItem(index, { repeat: e.target.value })}
                  className="ease-m3 rounded-lg bg-[rgb(var(--color-surface))] px-2 py-1 text-xs text-[rgb(var(--color-text))] outline-none transition-colors duration-200 focus:border-b-2 focus:border-[rgb(var(--color-primary))]"
                >
                  {REPEAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey as any)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <Button
              onClick={() => confirmItem(index)}
              size="sm"
              className="ms-auto"
              disabled={
                creatingId === index ||
                !item.title.trim() ||
                (item.type === 'reminder' && !item.reminder_time)
              }
            >
              {creatingId === index ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {t('voice.confirmItem')}
            </Button>
          </div>

          {errors[index] && (
            <p className="mt-2 text-xs text-[rgb(var(--color-danger))]">{errors[index]}</p>
          )}
        </div>
      ))}
    </div>
  )
}
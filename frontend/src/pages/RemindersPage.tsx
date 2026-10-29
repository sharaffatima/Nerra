import { useState } from 'react'
import { Plus, Trash2, Bell, CheckCircle, Folder, Clock } from 'lucide-react'
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/use-reminders'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { friendlyError } from '@/lib/errors'
import { format } from 'date-fns'

export function RemindersPage() {
  const { t } = useTranslation()
  const { activeWorkspace } = useWorkspaceStore()
  const { data: reminders = [], isLoading } = useReminders(activeWorkspace?.id)
  const createReminder = useCreateReminder()
  const updateReminder = useUpdateReminder()
  const deleteReminder = useDeleteReminder()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [repeat, setRepeat] = useState('none')
  const [formError, setFormError] = useState('')

  const handleCreate = () => {
    if (!title.trim() || !reminderTime || !activeWorkspace) return
    setFormError('')
    createReminder.mutate(
      { workspace: activeWorkspace.id, title: title.trim(), reminder_time: reminderTime, repeat },
      { onSuccess: () => { setTitle(''); setReminderTime(''); setRepeat('none'); setShowForm(false) }, onError: (e) => setFormError(friendlyError(e, t('errors.createReminder'))) },
    )
  }

  const toggleComplete = (id: number, completed: boolean) => {
    updateReminder.mutate({ id, data: { completed: !completed } })
  }

  const repeatOptions = [
    { value: 'none', label: t('reminder.repeatNone') },
    { value: 'daily', label: t('reminder.repeatDaily') },
    { value: 'weekly', label: t('reminder.repeatWeekly') },
    { value: 'monthly', label: t('reminder.repeatMonthly') },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-3xl text-[rgb(var(--color-text))]">{t('nav.reminders')}</h1>
        {activeWorkspace && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            {t('reminder.new')}
          </Button>
        )}
      </div>

      {!activeWorkspace && (
        <EmptyState icon={Folder} title={t('workspace.emptyTitle')} description={t('workspace.emptyDesc')} />
      )}

      {activeWorkspace && reminders.length === 0 && !isLoading && (
        <EmptyState
          icon={Clock}
          title={t('reminder.emptyTitle')}
          description={t('reminder.emptyDesc')}
          actionLabel={t('reminder.new')}
          onAction={() => setShowForm(true)}
        />
      )}

      {showForm && (
        <div className="ease-m3 space-y-3 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          {formError && (
            <div className="rounded-lg bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
              {formError}
            </div>
          )}
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('reminder.title')}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className="ease-m3 h-11 w-full rounded-t-lg rounded-b-none border-b-2 border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] px-4 text-sm text-[rgb(var(--color-text))] outline-none transition-colors duration-200 focus:border-[rgb(var(--color-primary))]"
            >
              {repeatOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={!title.trim() || !reminderTime || createReminder.isPending}>
              {createReminder.isPending ? t('common.loading') : t('common.save')}
            </Button>
            <Button variant="text" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[rgb(var(--color-text-muted))]">{t('common.loading')}</p>}

      <div className="space-y-2">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="ease-m3 flex items-center gap-3 rounded-2xl bg-[rgb(var(--color-surface))] p-4 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <button onClick={() => toggleComplete(reminder.id, reminder.completed)} className="ease-m3 shrink-0 transition-transform duration-300 active:scale-90">
              {reminder.completed ? (
                <CheckCircle className="h-5 w-5 text-[rgb(var(--color-accent-sage))]" />
              ) : (
                <Bell className="h-5 w-5 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]" />
              )}
            </button>
            <div className="flex-1">
              <span className={`text-sm ${reminder.completed ? 'text-[rgb(var(--color-text-muted))] line-through' : 'text-[rgb(var(--color-text))]'}`}>
                {reminder.title}
              </span>
              <p className="text-xs text-[rgb(var(--color-text-muted))]">
                {format(new Date(reminder.reminder_time), 'MMM d, yyyy h:mm a')}
                {reminder.repeat !== 'none' && ` - ${repeatOptions.find((o) => o.value === reminder.repeat)?.label}`}
              </p>
            </div>
            <button onClick={() => { if (window.confirm(t('common.confirmDelete'))) deleteReminder.mutate(reminder.id) }} className="ease-m3 rounded-full p-1 text-[rgb(var(--color-danger))] transition-all duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-90">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

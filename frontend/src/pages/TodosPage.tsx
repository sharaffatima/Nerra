import { useState } from 'react'
import { Plus, Trash2, Check, ChevronDown, ChevronRight, Calendar, Mic, Folder, CheckSquare } from 'lucide-react'
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from '@/hooks/use-todos'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTranslation } from '@/i18n'
import { TodoChecklist } from '@/components/ui/TodoChecklist'
import { VoiceCapture } from '@/components/voice/VoiceCapture'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfettiBurst } from '@/components/ui/ConfettiBurst'
import { friendlyError } from '@/lib/errors'
import { format } from 'date-fns'

export function TodosPage() {
  const { t } = useTranslation()
  const { activeWorkspace } = useWorkspaceStore()
  const { data: todos = [], isLoading } = useTodos(activeWorkspace?.id)
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const deleteTodo = useDeleteTodo()
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [burst, setBurst] = useState(0)

  const handleToggle = (id: number, completed: boolean) => {
    toggleTodo.mutate(id, {
      onSuccess: () => {
        if (!completed) setBurst((b) => b + 1)
      },
    })
  }

  const handleCreate = () => {
    if (!newTitle.trim() || !activeWorkspace) return
    setFormError('')
    createTodo.mutate(
      { workspace: activeWorkspace.id, title: newTitle.trim(), due_date: newDueDate || undefined },
      { onSuccess: () => { setNewTitle(''); setNewDueDate(''); setShowForm(false) }, onError: (e) => setFormError(friendlyError(e, t('errors.createTodo'))) },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-3xl text-[rgb(var(--color-text))]">{t('nav.todos')}</h1>
        {activeWorkspace && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceOpen(true)}
              title={t('voice.title')}
              className="ease-m3 flex h-10 w-10 items-center justify-center rounded-full border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-primary))] active:scale-90"
            >
              <Mic className="h-4 w-4" />
            </button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />
              {t('todo.new')}
            </Button>
          </div>
        )}
      </div>

      {!activeWorkspace && (
        <EmptyState icon={Folder} title={t('workspace.emptyTitle')} description={t('workspace.emptyDesc')} />
      )}

      {activeWorkspace && todos.length === 0 && !isLoading && (
        <EmptyState
          icon={CheckSquare}
          title={t('todo.emptyTitle')}
          description={t('todo.emptyDesc')}
          actionLabel={t('todo.new')}
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
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('todo.title')}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Input
            type="datetime-local"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            placeholder={t('todo.dueDate')}
          />
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={!newTitle.trim() || createTodo.isPending}>
              {createTodo.isPending ? t('common.loading') : t('common.save')}
            </Button>
            <Button variant="text" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[rgb(var(--color-text-muted))]">{t('common.loading')}</p>}

      <div className="space-y-2">
        {todos.map((todo) => (
          <div key={todo.id} className="ease-m3 rounded-2xl bg-[rgb(var(--color-surface))] p-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(todo.id, todo.completed)}
                className={`ease-m3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 active:scale-90 ${
                  todo.completed
                    ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                    : 'border-[rgb(var(--color-border))]'
                }`}
              >
                {todo.completed && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${todo.completed ? 'text-[rgb(var(--color-text-muted))] line-through' : 'text-[rgb(var(--color-text))]'}`}>
                {todo.title}
              </span>
              {todo.due_date && (
                <span className={`flex items-center gap-1 text-xs ${new Date(todo.due_date) < new Date() && !todo.completed ? 'text-[rgb(var(--color-danger))]' : 'text-[rgb(var(--color-text-muted))]'}`}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(todo.due_date), 'MMM d, yyyy h:mm a')}
                </span>
              )}
              {todo.checklist.length > 0 && (
                <span className="text-xs text-[rgb(var(--color-text-muted))]">
                  {todo.progress}%
                </span>
              )}
              <button
                onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)}
                className="ease-m3 rounded-full p-1 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90"
              >
                {expandedId === todo.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { if (window.confirm(t('common.confirmDelete'))) deleteTodo.mutate(todo.id) }}
                className="ease-m3 rounded-full p-1 text-[rgb(var(--color-danger))] transition-all duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expandedId === todo.id && <TodoChecklist todo={todo} />}
          </div>
        ))}
      </div>

      {activeWorkspace && voiceOpen && (
        <VoiceCapture open={voiceOpen} onClose={() => setVoiceOpen(false)} workspaceId={activeWorkspace.id} />
      )}

      <ConfettiBurst burst={burst} />
    </div>
  )
}

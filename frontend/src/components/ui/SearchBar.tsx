import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, CheckSquare, StickyNote, Bell } from 'lucide-react'
import { todoApi, noteApi, reminderApi } from '@/api/api'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTranslation } from '@/i18n'
import type { Todo, Note, Reminder } from '@/types'

type SearchResult = {
  id: string
  type: 'todo' | 'note' | 'reminder'
  title: string
  subtitle: string
  workspaceId: number
  route: string
}

const TYPE_ICONS: Record<string, typeof CheckSquare> = {
  todo: CheckSquare,
  note: StickyNote,
  reminder: Bell,
}

const TYPE_LABELS: Record<string, string> = {
  todo: 'nav.todos',
  note: 'nav.notes',
  reminder: 'nav.reminders',
}

export function SearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setActiveWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const shouldSearch = open && query.trim().length > 0
  const { data: todos = [] } = useQuery({ queryKey: ['search-todos'], queryFn: () => todoApi.list(), enabled: shouldSearch })
  const { data: notes = [] } = useQuery({ queryKey: ['search-notes'], queryFn: () => noteApi.list(), enabled: shouldSearch })
  const { data: reminders = [] } = useQuery({ queryKey: ['search-reminders'], queryFn: () => reminderApi.list(), enabled: shouldSearch })

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    const items: SearchResult[] = []
    todos.forEach((todo: Todo) => {
      if (todo.title.toLowerCase().includes(q)) {
        items.push({ id: `todo-${todo.id}`, type: 'todo', title: todo.title, subtitle: '', workspaceId: todo.workspace, route: '/todos' })
      }
    })
    notes.forEach((note: Note) => {
      if (note.title.toLowerCase().includes(q)) {
        items.push({ id: `note-${note.id}`, type: 'note', title: note.title, subtitle: note.tags.join(', '), workspaceId: note.workspace, route: '/notes' })
      }
    })
    reminders.forEach((reminder: Reminder) => {
      if (reminder.title.toLowerCase().includes(q)) {
        items.push({ id: `reminder-${reminder.id}`, type: 'reminder', title: reminder.title, subtitle: '', workspaceId: reminder.workspace, route: '/reminders' })
      }
    })
    return items.slice(0, 10)
  }, [query, todos, notes, reminders])

  const handleSelect = (item: SearchResult) => {
    const ws = workspaces.find((w) => w.id === item.workspaceId)
    if (ws) setActiveWorkspace(ws)
    navigate(item.route)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-text-muted))]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t('common.search')}
          className="ease-m3 h-11 w-full rounded-t-lg rounded-b-none border-b-2 border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] ps-10 pe-4 text-sm text-[rgb(var(--color-text))] outline-none transition-colors duration-200 placeholder:text-[rgb(var(--color-text-faint))] focus:border-[rgb(var(--color-primary))]"
        />
      </div>
      {open && query.trim() && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl bg-[rgb(var(--color-surface))] p-1.5 shadow-lg">
          {results.map((item) => {
            const Icon = TYPE_ICONS[item.type]
            return (
              <button
                key={item.id}
                onMouseDown={() => handleSelect(item)}
                className="ease-m3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[rgb(var(--color-text))]">{item.title}</p>
                  {item.subtitle && <p className="truncate text-xs text-[rgb(var(--color-text-muted))]">{item.subtitle}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-[rgb(var(--color-surface-secondary))] px-2.5 py-1 text-[10px] font-medium text-[rgb(var(--color-text-muted))]">
                  {t(TYPE_LABELS[item.type] as any)}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl bg-[rgb(var(--color-surface))] p-4 text-center text-sm text-[rgb(var(--color-text-muted))] shadow-lg">
          {t('common.noResults')}
        </div>
      )}
    </div>
  )
}

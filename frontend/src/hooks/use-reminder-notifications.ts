import { useEffect, useRef } from 'react'
import { useReminders } from '@/hooks/use-reminders'
import { useTodos } from '@/hooks/use-todos'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useReminderNotifications() {
  const { activeWorkspace } = useWorkspaceStore()
  const { data: reminders = [] } = useReminders(activeWorkspace?.id)
  const { data: todos = [] } = useTodos(activeWorkspace?.id)
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const now = new Date()
    reminders.forEach((r) => {
      const key = `reminder-${r.id}`
      if (r.completed || shownRef.current.has(key)) return
      const time = new Date(r.reminder_time)
      const diff = time.getTime() - now.getTime()
      if (diff > 0 && diff < 60_000) {
        shownRef.current.add(key)
        if (Notification.permission === 'granted') {
          new Notification('Reminder', { body: r.title })
        }
      }
    })

    todos.forEach((todo) => {
      const key = `todo-${todo.id}`
      if (todo.completed || !todo.due_date || shownRef.current.has(key)) return
      const due = new Date(todo.due_date)
      const diff = due.getTime() - now.getTime()
      if (diff > 0 && diff < 60_000) {
        shownRef.current.add(key)
        if (Notification.permission === 'granted') {
          new Notification('Todo Due', { body: todo.title })
        }
      }
    })
  }, [reminders, todos])
}

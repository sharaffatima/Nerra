export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface Workspace {
  id: number
  name: string
  icon: string
  color: string
  position: number
  theme_mode: 'light' | 'dark'
  todo_count: number
  note_count: number
  reminder_count: number
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: number
  text: string
  checked: boolean
  position: number
}

export interface Todo {
  id: number
  workspace: number
  title: string
  description: string
  completed: boolean
  position: number
  due_date: string | null
  checklist: ChecklistItem[]
  progress: number
  created_at: string
  updated_at: string
}

export interface Note {
  id: number
  workspace: number
  title: string
  content: string
  tags: string[]
  pinned: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: number
  workspace: number
  title: string
  description: string
  reminder_time: string
  completed: boolean
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'
  created_at: string
  updated_at: string
}

export interface Tokens {
  access: string
  refresh: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface VoiceItem {
  type: 'todo' | 'reminder'
  title: string
  description: string | null
  due_date: string | null
  reminder_time: string | null
  repeat: string
}

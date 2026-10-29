import { api } from '@/api/client'
import type { User, Tokens, Workspace, Todo, Note, Reminder, PaginatedResponse, VoiceItem } from '@/types'

export const authApi = {
  register: async (data: { username: string; email: string; password: string }) => {
    const res = await api.post<{ user: User; tokens?: Tokens; verification_required?: boolean }>('/auth/register/', data)
    return res.data
  },
  login: async (data: { username: string; password: string }) => {
    const res = await api.post<{ access: string; refresh: string }>('/auth/token/', data)
    return res.data
  },
  verifyEmail: async (uid: string, token: string) => {
    const res = await api.post<{ detail: string }>('/auth/verify-email/', { uid, token })
    return res.data
  },
  requestPasswordReset: async (email: string) => {
    const res = await api.post<{ detail: string }>('/auth/password-reset/', { email })
    return res.data
  },
  confirmPasswordReset: async (uid: string, token: string, password: string) => {
    const res = await api.post<{ detail: string }>('/auth/password-reset/confirm/', { uid, token, password })
    return res.data
  },
  logout: async () => {
    const refresh = localStorage.getItem('refresh')
    if (refresh) {
      try {
        await api.post('/auth/token/blacklist/', { refresh })
      } catch {
        // Refresh token may already be rotated/blacklisted — best effort.
      }
    }
  },
  profile: async () => {
    const res = await api.get<User>('/auth/profile/')
    return res.data
  },
}

export const workspaceApi = {
  list: async () => {
    const res = await api.get<PaginatedResponse<Workspace>>('/workspaces/')
    return res.data.results
  },
  get: async (id: number) => {
    const res = await api.get<Workspace>(`/workspaces/${id}/`)
    return res.data
  },
  create: async (data: { name: string; icon?: string; color?: string }) => {
    const res = await api.post<Workspace>('/workspaces/', data)
    return res.data
  },
  update: async (id: number, data: Partial<Workspace>) => {
    const res = await api.patch<Workspace>(`/workspaces/${id}/`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/workspaces/${id}/`)
  },
}

export const todoApi = {
  list: async (workspaceId?: number) => {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : ''
    const res = await api.get<PaginatedResponse<Todo>>(`/todos/${params}`)
    return res.data.results
  },
  create: async (data: { workspace: number; title: string; description?: string; due_date?: string | null }) => {
    const res = await api.post<Todo>('/todos/', data)
    return res.data
  },
  update: async (id: number, data: Partial<Todo>) => {
    const res = await api.patch<Todo>(`/todos/${id}/`, data)
    return res.data
  },
  toggle: async (id: number) => {
    const res = await api.post<Todo>(`/todos/${id}/toggle/`)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/todos/${id}/`)
  },
}

export const noteApi = {
  list: async (workspaceId?: number) => {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : ''
    const res = await api.get<PaginatedResponse<Note>>(`/notes/${params}`)
    return res.data.results
  },
  create: async (data: { workspace: number; title: string; content?: string; tags?: string[] }) => {
    const res = await api.post<Note>('/notes/', data)
    return res.data
  },
  update: async (id: number, data: Partial<Note>) => {
    const res = await api.patch<Note>(`/notes/${id}/`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/notes/${id}/`)
  },
}

export const reminderApi = {
  list: async (workspaceId?: number) => {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : ''
    const res = await api.get<PaginatedResponse<Reminder>>(`/reminders/${params}`)
    return res.data.results
  },
  create: async (data: { workspace: number; title: string; reminder_time: string; repeat?: string }) => {
    const res = await api.post<Reminder>('/reminders/', data)
    return res.data
  },
  update: async (id: number, data: Partial<Reminder>) => {
    const res = await api.patch<Reminder>(`/reminders/${id}/`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/reminders/${id}/`)
  },
}

export const voiceApi = {
  extract: async (transcript: string) => {
    const res = await api.post<{ items: VoiceItem[] }>('/voice/extract/', { transcript })
    return res.data.items
  },
}

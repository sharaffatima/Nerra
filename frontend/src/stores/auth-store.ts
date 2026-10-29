import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  isAuthenticated: boolean
  login: (access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (access: string, refresh: string) => {
        localStorage.setItem('access', access)
        localStorage.setItem('refresh', refresh)
        set({ isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        set({ isAuthenticated: false })
      },
    }),
    { name: 'auth-storage' },
  ),
)

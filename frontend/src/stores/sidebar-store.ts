import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  width: number
  collapsed: boolean
  setWidth: (w: number) => void
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      width: 250,
      collapsed: false,
      setWidth: (w) => set({ width: Math.max(60, Math.min(400, w)) }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'sidebar-storage' },
  ),
)

import { create } from 'zustand'
import type { Workspace } from '@/types'

interface WorkspaceStore {
  activeWorkspace: Workspace | null
  setActiveWorkspace: (w: Workspace | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeWorkspace: null,
  setActiveWorkspace: (w) => set({ activeWorkspace: w }),
}))

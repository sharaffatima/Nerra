import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceApi } from '@/api/api'
import type { Workspace } from '@/types'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export function useUpdateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Workspace> }) =>
      workspaceApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workspaceApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

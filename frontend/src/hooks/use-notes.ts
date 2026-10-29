import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noteApi } from '@/api/api'

export function useNotes(workspaceId?: number) {
  return useQuery({
    queryKey: ['notes', workspaceId],
    queryFn: () => noteApi.list(workspaceId),
    enabled: workspaceId !== undefined,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: noteApi.create,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notes', vars.workspace] })
    },
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof noteApi.update>[1] }) =>
      noteApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: noteApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

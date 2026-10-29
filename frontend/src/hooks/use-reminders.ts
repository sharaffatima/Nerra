import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reminderApi } from '@/api/api'

export function useReminders(workspaceId?: number) {
  return useQuery({
    queryKey: ['reminders', workspaceId],
    queryFn: () => reminderApi.list(workspaceId),
    enabled: workspaceId !== undefined,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reminderApi.create,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders', vars.workspace] })
    },
  })
}

export function useUpdateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof reminderApi.update>[1] }) =>
      reminderApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reminderApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}

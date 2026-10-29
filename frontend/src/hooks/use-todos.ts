import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { todoApi } from '@/api/api'

export function useTodos(workspaceId?: number) {
  return useQuery({
    queryKey: ['todos', workspaceId],
    queryFn: () => todoApi.list(workspaceId),
    enabled: workspaceId !== undefined,
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todoApi.create,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['todos', vars.workspace] })
    },
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todoApi.toggle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof todoApi.update>[1] }) =>
      todoApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todoApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

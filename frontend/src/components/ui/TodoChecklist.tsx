import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { api } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@/i18n'
import { ConfettiBurst } from '@/components/ui/ConfettiBurst'
import type { Todo, ChecklistItem } from '@/types'

interface Props {
  todo: Todo
}

export function TodoChecklist({ todo }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState(todo.checklist)
  const [newText, setNewText] = useState('')
  const [burst, setBurst] = useState(0)
  const qc = useQueryClient()

  const addItem = async () => {
    if (!newText.trim()) return
    const res = await api.post<ChecklistItem>(`/todos/${todo.id}/checklist/`, {
      text: newText.trim(),
      position: items.length,
    })
    setItems([...items, res.data])
    setNewText('')
    qc.invalidateQueries({ queryKey: ['todos'] })
  }

  const toggleItem = async (item: ChecklistItem) => {
    const res = await api.patch<ChecklistItem>(`/todos/${todo.id}/checklist/${item.id}/`, {
      checked: !item.checked,
    })
    setItems(items.map((i) => (i.id === item.id ? res.data : i)))
    if (!item.checked) setBurst((b) => b + 1)
    qc.invalidateQueries({ queryKey: ['todos'] })
  }

  const deleteItem = async (id: number) => {
    await api.delete(`/todos/${todo.id}/checklist/${id}/`)
    setItems(items.filter((i) => i.id !== id))
    qc.invalidateQueries({ queryKey: ['todos'] })
  }

  return (
    <div className="mt-2 space-y-1 border-t border-[rgb(var(--color-border))] pt-2">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center gap-2">
          <button onClick={() => toggleItem(item)} className="ease-m3 shrink-0 transition-transform duration-300 active:scale-90">
            <div
              className={`ease-m3 flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors duration-200 ${
                item.checked
                  ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                  : 'border-[rgb(var(--color-border))]'
              }`}
            >
              {item.checked && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
          <span className={`text-xs ${item.checked ? 'text-[rgb(var(--color-text-muted))] line-through' : 'text-[rgb(var(--color-text))]'}`}>
            {item.text}
          </span>
          <button onClick={() => deleteItem(item.id)} className="ease-m3 ms-auto rounded-full p-0.5 text-[rgb(var(--color-danger))] opacity-100 transition-all duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-90 lg:opacity-0 lg:group-hover:opacity-100">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('common.addItem')}
          className="ease-m3 h-8 flex-1 rounded-full bg-[rgb(var(--color-surface-secondary))] px-3 text-xs text-[rgb(var(--color-text))] outline-none transition-colors duration-200 placeholder:text-[rgb(var(--color-text-faint))] focus:bg-[rgb(var(--color-surface-secondary))]"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button onClick={addItem} className="ease-m3 rounded-full p-1 text-[rgb(var(--color-primary))] transition-all duration-300 hover:bg-[rgb(var(--color-accent-sage-light))] hover:text-[rgb(var(--color-primary-hover))] active:scale-90">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <ConfettiBurst burst={burst} count={22} />
    </div>
  )
}

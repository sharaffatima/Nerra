import { useState } from 'react'
import { X, Folder, Briefcase, BookOpen, Home, Zap, Star } from 'lucide-react'
import { useCreateWorkspace, useUpdateWorkspace } from '@/hooks/use-workspaces'
import type { Workspace } from '@/types'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const ICONS = [
  { value: 'folder', Icon: Folder },
  { value: 'briefcase', Icon: Briefcase },
  { value: 'book', Icon: BookOpen },
  { value: 'home', Icon: Home },
  { value: 'zap', Icon: Zap },
  { value: 'star', Icon: Star },
]

const COLORS = ['#6750A4', '#4F378B', '#7C71C6', '#9A82DB', '#625B71', '#7D5260', '#A48CC7', '#857266']

interface Props {
  workspace?: Workspace | null
  onClose: () => void
}

export function WorkspaceModal({ workspace, onClose }: Props) {
  const { t } = useTranslation()
  const createWs = useCreateWorkspace()
  const updateWs = useUpdateWorkspace()
  const [name, setName] = useState(workspace?.name ?? '')
  const [icon, setIcon] = useState(workspace?.icon ?? 'folder')
  const [color, setColor] = useState(workspace?.color ?? '#6382BE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      if (workspace) {
        await updateWs.mutateAsync({ id: workspace.id, data: { name: name.trim(), icon, color } })
      } else {
        await createWs.mutateAsync({ name: name.trim(), icon, color })
      }
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.name?.[0] || err?.message || 'Failed'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="ease-m3 w-full max-w-md rounded-[28px] bg-[rgb(var(--color-surface))] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">
            {workspace ? t('common.edit') + ' ' + t('workspace.name') : t('workspace.new')}
          </h2>
          <button onClick={onClose} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
              {error}
            </div>
          )}
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('workspace.name')}
            autoFocus
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-[rgb(var(--color-text))]">Icon</label>
            <div className="flex gap-2">
              {ICONS.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcon(value)}
                  className={`ease-m3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${
                    icon === value
                      ? 'bg-[rgb(var(--color-accent-sage-light))] text-[rgb(var(--color-accent-sage))]'
                      : 'bg-[rgb(var(--color-surface-secondary))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[rgb(var(--color-text))]">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`ease-m3 h-7 w-7 rounded-full transition-transform duration-300 ${
                    color === c ? 'scale-125 ring-2 ring-[rgb(var(--color-primary))] ring-offset-2 ring-offset-[rgb(var(--color-surface))]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
              {t('common.save')}
            </Button>
            <Button type="button" variant="text" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, StickyNote, Bell, Settings, LogOut, Plus, Pencil, Trash2, ChevronsLeft, ChevronsRight, Folder, Briefcase, BookOpen, Home, Zap, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWorkspaces, useDeleteWorkspace } from '@/hooks/use-workspaces'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useLocaleStore } from '@/stores/locale-store'
import { useTranslation } from '@/i18n'
import { authApi } from '@/api/api'
import { WorkspaceModal } from '@/components/ui/WorkspaceModal'
import { SearchBar } from '@/components/ui/SearchBar'
import type { Workspace } from '@/types'

const WS_ICONS: Record<string, typeof Folder> = {
  folder: Folder,
  briefcase: Briefcase,
  book: BookOpen,
  home: Home,
  zap: Zap,
  star: Star,
}

export function Sidebar() {
  const location = useLocation()
  const { t } = useTranslation()
  const logout = useAuthStore((s) => s.logout)
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  const deleteWs = useDeleteWorkspace()
  const { width, collapsed, setWidth, toggleCollapsed } = useSidebarStore()
  const locale = useLocaleStore((s) => s.locale)
  const isRtl = locale === 'ar'
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWs, setEditingWs] = useState<Workspace | null>(null)
  const [resizing, setResizing] = useState(false)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setResizing(true)
    const startX = e.clientX
    const startWidth = width
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      setWidth(startWidth + delta)
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, setWidth])

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/todos', icon: CheckSquare, label: t('nav.todos') },
    { to: '/notes', icon: StickyNote, label: t('nav.notes') },
    { to: '/reminders', icon: Bell, label: t('nav.reminders') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ]

  const openEdit = (w: Workspace) => {
    setEditingWs(w)
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditingWs(null)
    setModalOpen(true)
  }

  const handleLogout = () => {
    authApi.logout().finally(() => logout())
  }

  const sidebarWidth = collapsed ? 60 : width

  return (
    <>
      <aside
        className="relative flex h-screen flex-col border-e border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] transition-[width] duration-200"
        style={{ width: sidebarWidth }}
      >
        <div className="relative flex items-center p-4">
          {collapsed ? (
            <span className="font-brand mx-auto text-xl text-[rgb(var(--color-accent-sage))]">N</span>
          ) : (
            <h1 className="font-brand absolute inset-x-0 text-center text-xl text-[rgb(var(--color-accent-sage))]">Nerra</h1>
          )}
          <button
            onClick={toggleCollapsed}
            className="ease-m3 relative z-10 ms-auto shrink-0 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90 hidden lg:block"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (isRtl ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />) : (isRtl ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />)}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 pb-2">
            <SearchBar />
          </div>
        )}

        <div className="px-3 py-2 flex-1 overflow-auto">
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase text-[rgb(var(--color-text-muted))]">
                {t('workspace.name')}
              </p>
              <button onClick={openCreate} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-primary))] active:scale-90">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          {collapsed && (
            <button onClick={openCreate} className="ease-m3 mx-auto mb-2 flex rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-primary))] active:scale-90">
              <Plus className="h-4 w-4" />
            </button>
          )}
          <div className="space-y-1">
            {workspaces.map((w) => (
              <div
                key={w.id}
                className={`group flex items-center rounded-lg ease-m3 transition-colors duration-300 ${
                  activeWorkspace?.id === w.id
                    ? 'text-[rgb(var(--color-accent-sage))]'
                    : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-secondary))]'
                }`}
                style={activeWorkspace?.id === w.id ? { backgroundColor: w.color + '18' } : undefined}
              >
                <button
                  onClick={() => setActiveWorkspace(w)}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-sm"
                  title={collapsed ? w.name : undefined}
                >
                  {(() => { const WsIcon = WS_ICONS[w.icon] || Folder; return <WsIcon className="h-4 w-4 shrink-0" style={{ color: w.color }} /> })()}
                  {!collapsed && <span className="truncate">{w.name}</span>}
                </button>
                {!collapsed && (
                  <div className={`hidden pe-2 group-hover:flex ${activeWorkspace?.id === w.id ? '!flex' : ''}`}>
                    <button onClick={() => openEdit(w)} className={`p-1 ${activeWorkspace?.id === w.id ? 'text-[rgb(var(--color-accent-sage))] opacity-60 hover:opacity-100' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))]'}`}>
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm(t('common.confirmDelete'))) return
                        if (activeWorkspace?.id === w.id) setActiveWorkspace(null)
                        deleteWs.mutate(w.id)
                      }}
                      className={`p-1 ${activeWorkspace?.id === w.id ? 'text-[rgb(var(--color-accent-sage))] opacity-60 hover:opacity-100' : 'text-[rgb(var(--color-danger))] hover:text-[rgb(var(--color-danger))]'}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {workspaces.length === 0 && !collapsed && (
              <div className="animate-pop flex flex-col items-center gap-2 px-2 py-6 text-center">
                <Folder className="h-6 w-6 text-[rgb(var(--color-text-faint))]" />
                <p className="text-xs leading-snug text-[rgb(var(--color-text-muted))]">{t('workspace.empty')}</p>
                <button
                  onClick={openCreate}
                  className="ease-m3 flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-accent-sage-light))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--color-accent-sage))] transition-all duration-300 hover:brightness-95 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('workspace.new')}
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="space-y-1 border-t border-[rgb(var(--color-border))] px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`ease-m3 flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-all duration-300 active:scale-[0.98] ${
                location.pathname === item.to
                  ? 'bg-[rgb(var(--color-accent-sage-light))] font-medium text-[rgb(var(--color-accent-sage))]'
                  : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-secondary))]'
              } ${collapsed ? 'justify-center px-3' : ''}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className={`ease-m3 flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm text-[rgb(var(--color-danger))] transition-colors duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-[0.98] ${collapsed ? 'justify-center px-3' : ''}`}
            title={collapsed ? t('auth.logout') : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && t('auth.logout')}
          </button>
        </nav>

        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={handleResizeStart}
            className={`absolute end-0 top-0 h-full w-1 cursor-col-resize hover:bg-[rgb(var(--color-primary))] hover:opacity-30 transition-colors ${resizing ? 'bg-[rgb(var(--color-primary))] opacity-30' : ''}`}
          />
        )}
      </aside>

      {modalOpen && <WorkspaceModal workspace={editingWs} onClose={() => setModalOpen(false)} />}
    </>
  )
}

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { Plus, Trash2, Pin, Tag, ArrowLeft, ArrowRight, Printer, Bold, Italic, List, Folder, StickyNote } from 'lucide-react'
import { useNotes, useCreateNote, useDeleteNote, useUpdateNote } from '@/hooks/use-notes'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTranslation } from '@/i18n'
import { useLocaleStore } from '@/stores/locale-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { friendlyError } from '@/lib/errors'
import type { Note } from '@/types'

export function NotesPage() {
  const { t } = useTranslation()
  const { activeWorkspace } = useWorkspaceStore()
  const { data: notes = [], isLoading } = useNotes(activeWorkspace?.id)
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()
  const updateNote = useUpdateNote()
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editError, setEditError] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const locale = useLocaleStore((s) => s.locale)
  const isRtl = locale === 'ar'

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => n.tags.forEach((tag) => set.add(tag)))
    return Array.from(set)
  }, [notes])

  const filteredNotes = useMemo(() => {
    const base = activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes
    return [...base].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  }, [notes, activeTag])

  const startNew = () => {
    setIsNew(true)
    setEditingNote(null)
    setEditTitle('')
    setEditContent('')
    setEditTags('')
  }

  const startEdit = (note: Note) => {
    setIsNew(false)
    setEditingNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags(note.tags.join(', '))
  }

  useEffect(() => {
    if ((editingNote || isNew) && editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(editContent)
      editorRef.current.focus()
    }
  }, [editingNote, isNew])

  const closeEditor = () => {
    setEditingNote(null)
    setIsNew(false)
  }

  const handleSave = () => {
    if (!editTitle.trim() || !activeWorkspace) return
    setEditError('')
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    const content = DOMPurify.sanitize(editorRef.current?.innerHTML || editContent)
    if (isNew) {
      createNote.mutate(
        { workspace: activeWorkspace.id, title: editTitle.trim(), content, tags },
        { onSuccess: closeEditor, onError: (e) => setEditError(friendlyError(e, t('errors.saveNote'))) },
      )
    } else if (editingNote) {
      updateNote.mutate(
        { id: editingNote.id, data: { title: editTitle.trim(), content, tags } },
        { onSuccess: closeEditor, onError: (e) => setEditError(friendlyError(e, t('errors.saveNote'))) },
      )
    }
  }

  const execFormat = useCallback((cmd: string) => {
    document.execCommand(cmd, false)
    editorRef.current?.focus()
  }, [])

  const togglePin = (id: number, pinned: boolean) => {
    updateNote.mutate({ id, data: { pinned: !pinned } })
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const safeTitle = DOMPurify.sanitize(editTitle, { ALLOWED_TAGS: [] })
    const safeContent = DOMPurify.sanitize(editorRef.current?.innerHTML || editContent)
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${safeTitle}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#344038;line-height:1.7}
      h1{font-size:24px;margin-bottom:8px}ul{padding-left:20px}li{margin:4px 0}
      .tags{margin-top:24px;display:flex;gap:6px;flex-wrap:wrap}
      .tag{background:#D5E2F0;color:#3A5A8A;padding:2px 10px;border-radius:99px;font-size:12px}
      @media print{body{margin:20px}}</style></head><body>
      <h1>${safeTitle}</h1>${safeContent}
      ${editTags.trim() ? `<div class="tags">${editTags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => `<span class="tag">${DOMPurify.sanitize(tag, { ALLOWED_TAGS: [] })}</span>`).join('')}</div>` : ''}
      </body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  if (editingNote || isNew) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={closeEditor} className="ease-m3 rounded-full p-2 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90">
            {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
        {editError && (
          <div className="rounded-lg bg-[rgb(var(--color-danger-light))] p-3 text-sm text-[rgb(var(--color-danger))]">
            {editError}
          </div>
        )}
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder={t('note.title')}
          className="flex-1 bg-transparent font-brand text-2xl text-[rgb(var(--color-text))] outline-none placeholder:text-[rgb(var(--color-text-faint))]"
          autoFocus
        />
          <button onClick={handlePrint} className="ease-m3 rounded-full p-2 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90" title="Print / Save as PDF">
            <Printer className="h-5 w-5" />
          </button>
          <Button
            onClick={handleSave}
            disabled={!editTitle.trim() || createNote.isPending || updateNote.isPending}
          >
            {createNote.isPending || updateNote.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-[rgb(var(--color-surface))] px-2 py-1 shadow-sm">
          <button onClick={() => execFormat('bold')} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90" title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button onClick={() => execFormat('italic')} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90" title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button onClick={() => execFormat('insertUnorderedList')} className="ease-m3 rounded-full p-1.5 text-[rgb(var(--color-text-muted))] transition-all duration-300 hover:bg-[rgb(var(--color-surface-secondary))] hover:text-[rgb(var(--color-text))] active:scale-90" title="Bullet list">
            <List className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[400px] rounded-2xl bg-[rgb(var(--color-surface))] p-6 text-sm leading-relaxed text-[rgb(var(--color-text))] shadow-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[rgb(var(--color-text-faint))]"
          data-placeholder={t('note.content')}
          onBlur={() => { if (editorRef.current) setEditContent(editorRef.current.innerHTML) }}
        />

        <Input
          type="text"
          value={editTags}
          onChange={(e) => setEditTags(e.target.value)}
          placeholder={t('note.tags') + ' (comma separated)'}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-3xl text-[rgb(var(--color-text))]">{t('nav.notes')}</h1>
        {activeWorkspace && (
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" />
            {t('note.new')}
          </Button>
        )}
      </div>

      {!activeWorkspace && (
        <EmptyState icon={Folder} title={t('workspace.emptyTitle')} description={t('workspace.emptyDesc')} />
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-[rgb(var(--color-text-muted))]" />
          <button
            onClick={() => setActiveTag(null)}
            className={`ease-m3 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 active:scale-95 ${
              activeTag === null
                ? 'bg-[rgb(var(--color-accent-sage-light))] text-[rgb(var(--color-accent-sage))]'
                : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-secondary))]'
            }`}
          >
            {t('note.all')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`ease-m3 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 active:scale-95 ${
                activeTag === tag
                  ? 'bg-[rgb(var(--color-accent-sage-light))] text-[rgb(var(--color-accent-sage))]'
                  : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-secondary))]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-[rgb(var(--color-text-muted))]">{t('common.loading')}</p>}

      {!isLoading && filteredNotes.length === 0 && activeWorkspace && (
        notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={t('note.emptyTitle')}
            description={t('note.emptyDesc')}
            actionLabel={t('note.new')}
            onAction={startNew}
          />
        ) : (
          <EmptyState icon={Tag} title={t('note.emptyTagTitle')} description={t('note.emptyTagDesc')} />
        )
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            onClick={() => startEdit(note)}
            className="ease-m3 group cursor-pointer rounded-2xl bg-[rgb(var(--color-surface))] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-[rgb(var(--color-text))] truncate">{note.title}</h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => togglePin(note.id, note.pinned)} className={`ease-m3 rounded-full p-1 transition-all duration-300 active:scale-90 ${note.pinned ? 'text-[rgb(var(--color-accent-orange))]' : 'text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-secondary))]'}`}>
                  <Pin className="h-4 w-4" />
                </button>
                <button onClick={() => { if (window.confirm(t('common.confirmDelete'))) deleteNote.mutate(note.id) }} className="ease-m3 rounded-full p-1 text-[rgb(var(--color-danger))] transition-all duration-300 hover:bg-[rgb(var(--color-danger-light))] active:scale-90">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {note.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[rgb(var(--color-primary))]/10 px-2 py-0.5 text-xs text-[rgb(var(--color-primary))]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

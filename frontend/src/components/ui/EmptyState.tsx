import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'animate-pop flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/60 px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      <div
        className={cn(
          'animate-floaty flex items-center justify-center rounded-3xl bg-[rgb(var(--color-accent-sage-light))]',
          compact ? 'h-12 w-12' : 'h-14 w-14',
        )}
      >
        <Icon className={cn('text-[rgb(var(--color-accent-sage))]', compact ? 'h-6 w-6' : 'h-7 w-7')} />
      </div>
      <div className="space-y-1">
        <h3 className={cn('font-brand text-[rgb(var(--color-text))]', compact ? 'text-base' : 'text-lg')}>
          {title}
        </h3>
        {description && (
          <p className={cn('mx-auto max-w-sm text-[rgb(var(--color-text-muted))]', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
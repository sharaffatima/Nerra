import { cn } from '@/lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  invalid?: boolean
}

export function Input({ label, invalid, className, id, ...props }: InputProps) {
  return (
    <div className={cn('w-full', label && 'space-y-1')}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[rgb(var(--color-text))]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'ease-m3 h-11 w-full rounded-t-lg rounded-b-none border-b-2 bg-[rgb(var(--color-surface-secondary))] px-4 text-sm text-[rgb(var(--color-text))] outline-none transition-colors duration-200',
          'placeholder:text-[rgb(var(--color-text-faint))]',
          invalid
            ? 'border-[rgb(var(--color-danger))]'
            : 'border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-primary))]',
          className,
        )}
        {...props}
      />
    </div>
  )
}
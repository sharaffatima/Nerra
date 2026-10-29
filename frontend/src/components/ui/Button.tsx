import { cn } from '@/lib/cn'

type Variant = 'filled' | 'tonal' | 'outlined' | 'text'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  filled:
    'bg-[rgb(var(--color-primary))] text-white shadow-sm hover:bg-[rgb(var(--color-primary-hover))] hover:shadow-md',
  tonal:
    'bg-[rgb(var(--color-surface-secondary))] text-[rgb(var(--color-text))] hover:brightness-95',
  outlined:
    'border border-[rgb(var(--color-border))] text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))/10]',
  text:
    'text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))/10]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({ variant = 'filled', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'ease-m3 inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-all duration-300',
        'active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
import { cn } from '@/lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-[rgb(var(--color-surface))] p-5',
        interactive &&
          'ease-m3 cursor-pointer shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
      {...props}
    />
  )
}
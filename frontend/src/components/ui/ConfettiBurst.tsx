import { useMemo } from 'react'

const COLORS = [
  'rgb(var(--color-primary))',
  'rgb(var(--color-accent-lavender))',
  'rgb(var(--color-accent-orange))',
  'rgb(var(--color-accent-blue))',
  'rgb(var(--color-accent-sage-light))',
]

interface Particle {
  id: number
  x: number
  dx: number
  dy: number
  rot: number
  delay: number
  color: string
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 12 + Math.random() * 76,
    dx: (Math.random() - 0.5) * 120,
    dy: 160 + Math.random() * 220,
    rot: Math.random() * 540 - 270,
    delay: Math.random() * 160,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }))
}

export function ConfettiBurst({ burst, count = 32 }: { burst: number; count?: number }) {
  const particles = useMemo(
    () => (burst > 0 ? makeParticles(count) : []),
    [burst, count],
  )

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={`${burst}-${p.id}`}
          className="animate-confetti absolute -top-4 h-2.5 w-1.5 rounded-full"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
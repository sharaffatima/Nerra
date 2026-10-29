import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const start = performance.now()
    const from = 0
    const cancel = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    cancel()
    rafRef.current = requestAnimationFrame(tick)
    return cancel
  }, [target, duration])

  return value
}
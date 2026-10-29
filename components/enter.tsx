'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type EnterProps = {
  children: ReactNode
  delay?: number
  className?: string
}

export function Enter({ children, delay = 0, className = '' }: EnterProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-in')
          io.unobserve(node)
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -6% 0px' },
    )

    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={['enter', className].filter(Boolean).join(' ')}
      style={{ '--enter-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}

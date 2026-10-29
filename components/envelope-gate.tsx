'use client'

import { useState, type ReactNode } from 'react'
import { RealisticEnvelope } from '@/components/realistic-envelope'

export function EnvelopeGate({ children }: { children: ReactNode }) {
  const [hovering, setHovering] = useState(false)
  const [opened, setOpened] = useState(false)

  return (
    <div className="envelope-gate">
      <p
        className="envelope-brand transition-opacity duration-500 ease-out"
        style={{ opacity: opened ? 0 : 1 }}
      >
        <i />
        IUH · 2026
        <i />
      </p>

      <RealisticEnvelope
        hovering={hovering}
        onHover={setHovering}
        onOpen={() => setOpened(true)}
      >
        {children}
      </RealisticEnvelope>
    </div>
  )
}

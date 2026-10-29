import { useId, type CSSProperties, type ReactNode } from 'react'
import {
  tornSheetPath,
  type TornEdge,
  type TornIntensity,
  type TornVariant,
} from '@/lib/torn-paths'

type TornPaperProps = {
  children: ReactNode
  className?: string
  edges?: TornEdge[]
  variant?: TornVariant
  intensity?: TornIntensity
  rotate?: number
  padding?: string
}

export function TornPaper({
  children,
  className = '',
  edges = ['top', 'bottom'],
  variant = 1,
  intensity = 'medium',
  rotate = 0,
  padding,
}: TornPaperProps) {
  const uid = useId().replace(/:/g, '')
  const clipId = `torn-${uid}`
  const path = tornSheetPath(edges, variant, intensity)

  return (
    <div
      className={['torn-paper', className].filter(Boolean).join(' ')}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      <svg className="torn-paper-defs" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={path} />
          </clipPath>
        </defs>
      </svg>
      <div className="torn-paper-lip" style={{ clipPath: `url(#${clipId})` }} />
      <div className="torn-paper-sheet" style={{ clipPath: `url(#${clipId})` }}>
        <div className="torn-paper-grain" aria-hidden />
        <div
          className="paper-content"
          style={padding ? ({ padding } as CSSProperties) : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

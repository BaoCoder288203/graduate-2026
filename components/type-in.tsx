'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react'

type TypeInProps = {
  text: string
  as?: React.ElementType<{ className?: string; 'aria-label'?: string; children?: React.ReactNode }>
  className?: string
  delay?: number
  charMs?: number
  started?: boolean
}


export function TypeIn({
  text,
  as: Tag = 'p',
  className = '',
  delay = 0,
  charMs = 16,
  started = true,
}: TypeInProps) {
  const chars = Array.from(text)

  return (
    <Tag className={['type-in', className].filter(Boolean).join(' ')} aria-label={text}>
      {chars.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="type-ch"
          aria-hidden
          style={
            {
              '--type-delay': started ? `${delay + index * charMs}ms` : undefined,
            } as CSSProperties
          }
          data-on={started ? '1' : '0'}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </Tag>
  )
}

const TITLE_MS = 24
const BODY_MS = 8

function paragraphDelays(title: string, paragraphs: readonly string[]) {
  let cursor = Array.from(title).length * TITLE_MS + 280
  return paragraphs.map((paragraph) => {
    const delay = cursor
    cursor += Array.from(paragraph).length * BODY_MS + 200
    return delay
  })
}

export function LetterBody({
  title,
  paragraphs,
}: {
  title: string
  paragraphs: readonly string[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const delays = paragraphDelays(title, paragraphs)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          io.unobserve(node)
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="type-on-view">
      <TypeIn as="h2" text={title} started={started} charMs={TITLE_MS} />
      {paragraphs.map((paragraph, index) => (
        <TypeIn
          key={paragraph.slice(0, 32)}
          text={paragraph}
          started={started}
          delay={delays[index]}
          charMs={BODY_MS}
        />
      ))}
    </div>
  )
}

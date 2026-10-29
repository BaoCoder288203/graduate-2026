'use client'

import { useEffect, useState } from 'react'
import { Enter } from '@/components/enter'
import { Photo } from '@/components/photo'
import { site } from '@/lib/site'

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getTimeLeft(): TimeLeft {
  const distance = new Date(site.event.startAt).getTime() - Date.now()
  if (distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance % 86_400_000) / 3_600_000),
    minutes: Math.floor((distance % 3_600_000) / 60_000),
    seconds: Math.floor((distance % 60_000) / 1000),
  }
}

export function Countdown() {
  const [time, setTime] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const tick = () => setTime(getTimeLeft())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="count">
      <Enter delay={80} className="polaroids">
        <div className="pola pola-left">
          <Photo
            src={site.photos.polaroids[0].src}
            alt="Kỷ niệm"
            position={site.photos.polaroids[0].position}
          />
        </div>
        <div className="pola pola-mid">
          <Photo
            src={site.photos.polaroids[1].src}
            alt="Kỷ niệm"
            position={site.photos.polaroids[1].position}
          />
        </div>
        <div className="pola pola-right">
          <Photo
            src={site.photos.polaroids[2].src}
            alt="Kỷ niệm"
            position={site.photos.polaroids[2].position}
          />
        </div>
      </Enter>

      <Enter delay={220} className="grad">
        <Photo
          src={site.photos.graduate.src}
          alt={site.studentName}
          className="is-cutout"
          position={site.photos.graduate.position}
        />
      </Enter>

      <Enter delay={360} className="timer">
        <p className="timer-digits">
          {time.days}:{pad(time.hours)}:{pad(time.minutes)}:
          <span className="sec">{pad(time.seconds)}</span>
        </p>
        <div className="timer-labels">
          <span>NGÀY</span>
          <span>GIỜ</span>
          <span>PHÚT</span>
          <span>GIÂY</span>
        </div>
      </Enter>
    </section>
  )
}

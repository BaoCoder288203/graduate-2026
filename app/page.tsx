import { EnvelopeGate } from '@/components/envelope-gate'
import { Cover } from '@/components/cover'
import { Invite } from '@/components/invite'
import { Gallery } from '@/components/gallery'
import { Letter } from '@/components/letter'
import { Countdown } from '@/components/countdown'

export default function Home() {
  return (
    <EnvelopeGate>
      <main className="memory-page">
        <Cover />
        <Invite />
        <Gallery />
        <Letter />
        <Countdown />
      </main>
    </EnvelopeGate>
  )
}
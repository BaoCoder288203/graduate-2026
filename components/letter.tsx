import { Enter } from '@/components/enter'
import { TornPaper } from '@/components/torn-paper'
import { LetterBody } from '@/components/type-in'
import { site } from '@/lib/site'

export function Letter() {
  return (
    <section className="letter">
      <Enter delay={120} className="letter-wrap">
        <TornPaper
          className="letter-card"
          edges={['top', 'bottom']}
          variant={2}
          intensity="medium"
          rotate={-0.35}
          padding="36px 26px 32px"
        >
          <LetterBody title={site.letter.title} paragraphs={site.letter.paragraphs} />
          <div className="letter-rule" aria-hidden>
            <i />
          </div>
        </TornPaper>
      </Enter>
    </section>
  )
}

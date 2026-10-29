import { Enter } from '@/components/enter'
import { Photo } from '@/components/photo'
import { TornPaper } from '@/components/torn-paper'
import { site } from '@/lib/site'

function Sprockets() {
  return (
    <div className="film-sprockets" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}

export function Gallery() {
  return (
    <section className="gallery" id="gallery">
      <Enter delay={80} className="film">
        <Sprockets />
        <div className="film-frames">
          {site.photos.film.map((photo, i) => (
            <Enter key={photo.src} delay={120 + i * 90} className="film-frame">
              <Photo
                src={photo.src}
                alt={`Kỷ niệm ${i + 1}`}
                position={photo.position}
              />
            </Enter>
          ))}
        </div>
        <Sprockets />
      </Enter>

      <Enter delay={200} className="gallery-main">
        <Photo
          src={site.photos.galleryMain.src}
          alt={site.studentName}
          className="is-portrait"
          position={site.photos.galleryMain.position}
        />
        <TornPaper
          className="thanh-xuan"
          edges={['top']}
          variant={1}
          intensity="medium"
        >
          <span>Thanh Xuân</span>
        </TornPaper>
      </Enter>
    </section>
  )
}

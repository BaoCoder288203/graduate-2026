import { Enter } from '@/components/enter'
import { Cloth } from '@/components/canvasui/Cloth'
import { Photo } from '@/components/photo'
import { site } from '@/lib/site'

export function Cover() {
  return (
    <section className="cover">
      <Enter delay={40} className="sash">
        <Cloth
          className="sash-cloth"
          pin="top"
          wind={1.15}
          speed={0.32}
          amplitude={14}
          drape={18}
          brush={1.15}
          brushSize={72}
          damping={1.15}
          light={0.42}
          sheen={0.16}
          shadow={0.16}
          cornerRadius={0}
          backing={[0.05, 0.1, 0.38]}
        >
          <img
            className="sash-img"
            src={site.photos.sash}
            alt={site.studentNameSash}
          />
        </Cloth>
      </Enter>

      <Enter delay={120} className="cover-logo">
        <img
          src="/brand/iuh-logo.svg"
          alt="Đại học Công nghiệp Thành phố Hồ Chí Minh"
        />
      </Enter>

      <Enter delay={240} className="cover-title">
        <h1>{site.schoolShort}</h1>
        <em>{site.schoolEn}</em>
        <small>{site.city}</small>
      </Enter>

      <Enter delay={380} className="cover-photo">
        <Photo
          src={site.photos.cover.src}
          alt={site.studentName}
          className="is-cover"
          position={site.photos.cover.position}
        />
      </Enter>

      <Enter delay={520} className="cover-foot">
        <p>
          EVERY END IS
          <br />
          A NEW BEGINNING
        </p>
      </Enter>
    </section>
  )
}

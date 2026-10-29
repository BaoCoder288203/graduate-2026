import { Enter } from '@/components/enter'
import { Photo } from '@/components/photo'
import { site } from '@/lib/site'

function PinIcon() {
  return (
    <svg className="invite-pin" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.2A6.8 6.8 0 0 0 5.2 9c0 4.9 5.4 11.4 6.5 12.6a.4.4 0 0 0 .6 0C13.4 20.4 18.8 13.9 18.8 9A6.8 6.8 0 0 0 12 2.2Zm0 9.3A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
      />
    </svg>
  )
}

export function Invite() {
  return (
    <section
      className="invite"
      style={{ ['--invite-bg' as string]: `url('${site.photos.inviteBg}')` }}
    >
      <Enter delay={80} className="invite-card">
        <p className="invite-kicker">THÂN MỜI</p>
        <p className="invite-when">
          {site.event.time} , {site.event.weekday}
        </p>
        <div className="invite-date">
          <span>{site.event.month}</span>
          <strong>{site.event.day}</strong>
          <span>{site.event.year}</span>
        </div>
        <p className="invite-at">TẠI ĐIỂM</p>
        <h2 className="invite-venue">
          TRUNG TÂM
          <br />
          HỘI NGHỊ IUH
        </h2>
        <p className="invite-address">({site.event.address})</p>
        <PinIcon />
        <a
          className="invite-maps"
          href={site.event.maps}
          target="_blank"
          rel="noreferrer"
        >
          XEM CHỈ ĐƯỜNG
        </a>
      </Enter>

      <Enter delay={220} className="invite-photo">
        <Photo
          src={site.photos.invite.src}
          alt="Ảnh sự kiện"
          className="is-invite"
          position={site.photos.invite.position}
        />
      </Enter>
    </section>
  )
}

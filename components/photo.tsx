type PhotoProps = {
  src: string
  alt: string
  className?: string
  position?: string
}

export function Photo({ src, alt, className = '', position = 'center' }: PhotoProps) {
  return (
    <div className={['photo-frame', className].filter(Boolean).join(' ')}>
      <img src={src} alt={alt} style={{ objectPosition: position }} />
    </div>
  )
}

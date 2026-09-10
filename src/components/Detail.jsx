import { useEffect } from 'react'

export default function Detail({ object, onClose }) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const rows = [
    ['Artist', object.artist],
    ['Culture', object.culture],
    ['Date', object.date],
    ['Medium', object.medium],
    ['Department', object.department],
    ['Credit', object.creditLine],
  ].filter(([, v]) => v)

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={object.title}>
      <div className="modal__inner" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal__image">
          <img src={object.imageLarge} alt={object.title} />
        </div>

        <div className="modal__info">
          <h2 className="modal__title">{object.title}</h2>
          <dl className="modal__facts">
            {rows.map(([label, value]) => (
              <div className="modal__fact" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {object.url && (
            <a className="btn btn--primary" href={object.url} target="_blank" rel="noreferrer">
              View on metmuseum.org ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

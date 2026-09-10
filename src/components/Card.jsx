import { useState } from 'react'

export default function Card({ object, onSelect }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      className="card"
      onClick={onSelect}
      aria-label={`View details for ${object.title}`}
    >
      <div className="card__img-wrap">
        {!loaded && <div className="card__img-placeholder" aria-hidden="true" />}
        <img
          className={`card__img ${loaded ? 'is-loaded' : ''}`}
          src={object.image}
          alt={object.title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {object.isHighlight && <span className="card__badge">Highlight</span>}
      </div>
      <div className="card__body">
        <h3 className="card__title">{object.title}</h3>
        <p className="card__meta">
          {object.artist || object.culture || 'Unknown maker'}
          {object.date ? ` · ${object.date}` : ''}
        </p>
      </div>
    </button>
  )
}

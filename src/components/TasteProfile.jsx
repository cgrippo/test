// Aggregates the works a user liked into a "taste profile".

function centuryOf(year) {
  if (year == null || Number.isNaN(year)) return null
  if (year < 0) return `${Math.ceil(-year / 100)}th c. BCE`
  const c = Math.ceil(year / 100)
  const suffix = c % 10 === 1 && c !== 11 ? 'st' : c % 10 === 2 && c !== 12 ? 'nd' : c % 10 === 3 && c !== 13 ? 'rd' : 'th'
  return `${c}${suffix} c.`
}

function tally(items, getKey) {
  const counts = new Map()
  for (const item of items) {
    const keys = getKey(item)
    for (const k of Array.isArray(keys) ? keys : [keys]) {
      if (!k) continue
      counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function top(list, n) {
  return list.slice(0, n)
}

export default function TasteProfile({ liked, onClose, onReset }) {
  const periods = tally(liked, (o) => centuryOf(o.beginDate))
  const departments = tally(liked, (o) => o.department)
  const artists = tally(liked, (o) => o.artist)
  const cultures = tally(liked, (o) => o.culture)
  const tags = tally(liked, (o) => o.tags)

  // A one-line headline verdict from the dominant signals.
  const headlineBits = [
    periods[0]?.[0],
    (cultures[0]?.[0] || '').split(',')[0].trim() || departments[0]?.[0],
    (liked[0]?.classification || 'works').toLowerCase(),
  ].filter(Boolean)
  const headline = headlineBits.join(' ')

  return (
    <div className="profile" role="dialog" aria-modal="true" aria-label="Your taste profile">
      <div className="profile__inner">
        <button className="profile__close" onClick={onClose} aria-label="Back to swiping">
          ✕
        </button>

        <header className="profile__header">
          <p className="profile__eyebrow">Based on {liked.length} works you liked</p>
          <h2 className="profile__headline">
            You gravitate toward <span>{headline}</span>.
          </h2>
        </header>

        <div className="profile__stats">
          <Stat title="Periods" data={top(periods, 4)} />
          <Stat title="Departments" data={top(departments, 4)} />
          <Stat title="Artists" data={top(artists.filter((a) => a[0]), 4)} />
          <Stat title="Themes &amp; tags" data={top(tags, 6)} />
        </div>

        <h3 className="profile__gallery-title">Your likes</h3>
        <div className="profile__gallery">
          {liked.map((o) => (
            <a
              key={o.id}
              className="profile__thumb"
              href={o.url}
              target="_blank"
              rel="noreferrer"
              title={`${o.title} — view on metmuseum.org`}
            >
              <img src={o.image} alt={o.title} loading="lazy" />
            </a>
          ))}
        </div>

        <div className="profile__actions">
          <button className="btn" onClick={onReset}>
            Start over
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, data }) {
  if (data.length === 0) return null
  const maxCount = data[0][1]
  return (
    <div className="stat">
      <h4 className="stat__title" dangerouslySetInnerHTML={{ __html: title }} />
      <ul className="stat__list">
        {data.map(([label, count]) => (
          <li key={label} className="stat__row">
            <span className="stat__bar" style={{ width: `${(count / maxCount) * 100}%` }} />
            <span className="stat__label">{label}</span>
            <span className="stat__count">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

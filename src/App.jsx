import { useCallback, useEffect, useRef, useState } from 'react'
import { POOLS, getRandomObjects } from './api.js'
import Card from './components/Card.jsx'
import Detail from './components/Detail.jsx'

const BATCH_SIZE = 12

export default function App() {
  const [pool, setPool] = useState('highlights')
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  // Track the latest request so stale responses (e.g. after switching pools
  // or shuffling quickly) don't overwrite fresh results.
  const requestId = useRef(0)

  const loadFresh = useCallback(async (poolKey) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    setObjects([])
    try {
      const results = await getRandomObjects(poolKey, BATCH_SIZE)
      if (id !== requestId.current) return
      setObjects(results)
      if (results.length === 0) setError('No works came back — try shuffling again.')
    } catch (err) {
      if (id !== requestId.current) return
      setError(err.message || 'Something went wrong loading works.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const results = await getRandomObjects(pool, BATCH_SIZE)
      if (id !== requestId.current) return
      setObjects((prev) => {
        const seen = new Set(prev.map((o) => o.id))
        return [...prev, ...results.filter((o) => !seen.has(o.id))]
      })
    } catch (err) {
      if (id !== requestId.current) return
      setError(err.message || 'Something went wrong loading more works.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [pool])

  // Initial load and whenever the pool changes.
  useEffect(() => {
    loadFresh(pool)
  }, [pool, loadFresh])

  return (
    <div className="app">
      <header className="header">
        <div className="header__titles">
          <h1 className="header__title">Met Explorer</h1>
          <p className="header__subtitle">
            Random works from The Metropolitan Museum of Art's open collection
          </p>
        </div>

        <div className="controls">
          <div className="segmented" role="tablist" aria-label="Collection pool">
            {Object.entries(POOLS).map(([key, p]) => (
              <button
                key={key}
                role="tab"
                aria-selected={pool === key}
                className={`segmented__btn ${pool === key ? 'is-active' : ''}`}
                onClick={() => setPool(key)}
                disabled={loading && pool === key}
                title={p.hint}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button className="btn btn--primary" onClick={() => loadFresh(pool)} disabled={loading}>
            {loading ? 'Finding art…' : '✦ Surprise me'}
          </button>
        </div>
      </header>

      <main className="main">
        {error && <div className="notice notice--error">{error}</div>}

        <div className="grid">
          {objects.map((obj) => (
            <Card key={obj.id} object={obj} onSelect={() => setSelected(obj)} />
          ))}
          {loading &&
            objects.length === 0 &&
            Array.from({ length: BATCH_SIZE }).map((_, i) => (
              <div key={`skeleton-${i}`} className="card card--skeleton" aria-hidden="true">
                <div className="card__img-wrap" />
              </div>
            ))}
        </div>

        {objects.length > 0 && (
          <div className="load-more">
            <button className="btn" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        Data &amp; images courtesy of{' '}
        <a href="https://www.metmuseum.org" target="_blank" rel="noreferrer">
          The Metropolitan Museum of Art
        </a>{' '}
        via its{' '}
        <a href="https://metmuseum.github.io/" target="_blank" rel="noreferrer">
          Open Access API
        </a>
        .
      </footer>

      {selected && <Detail object={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

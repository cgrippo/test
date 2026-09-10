import { useCallback, useEffect, useRef, useState } from 'react'
import { CATEGORIES, getSwipeCandidates } from './api.js'
import SwipeCard from './components/SwipeCard.jsx'
import TasteProfile from './components/TasteProfile.jsx'

const REFILL_AT = 3 // refill the deck when this few cards remain
const BATCH = 6 // how many candidates to fetch per refill
const LIKED_KEY = 'met-swipe-liked'

function loadLiked() {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function App() {
  const [category, setCategory] = useState('paintings')
  const [deck, setDeck] = useState([]) // upcoming cards; deck[0] is on top
  const [liked, setLiked] = useState(loadLiked)
  const [seenCount, setSeenCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [command, setCommand] = useState(null) // programmatic swipe: { dir, nonce }
  const [showProfile, setShowProfile] = useState(false)

  // IDs already shown or decided on, so we never repeat a work this session.
  const seenIds = useRef(new Set())
  const refilling = useRef(false)
  const requestId = useRef(0)

  const refill = useCallback(
    async (categoryKey, reqId) => {
      if (refilling.current) return
      refilling.current = true
      setLoading(true)
      try {
        const results = await getSwipeCandidates(categoryKey, BATCH, {
          exclude: seenIds.current,
        })
        if (reqId !== requestId.current) return
        results.forEach((o) => seenIds.current.add(o.id))
        setDeck((prev) => [...prev, ...results])
        if (results.length === 0 && deck.length === 0) {
          setError('Could not load artworks right now — check your connection and retry.')
        }
      } catch (err) {
        if (reqId === requestId.current) {
          setError(err.message || 'Something went wrong loading artworks.')
        }
      } finally {
        if (reqId === requestId.current) setLoading(false)
        refilling.current = false
      }
    },
    [deck.length],
  )

  // Reset and load a fresh deck whenever the category changes.
  useEffect(() => {
    const reqId = ++requestId.current
    seenIds.current = new Set()
    setDeck([])
    setError(null)
    refill(category, reqId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // Keep the deck topped up.
  useEffect(() => {
    if (deck.length <= REFILL_AT && !refilling.current && !error) {
      refill(category, requestId.current)
    }
  }, [deck.length, category, error, refill])

  // Preload the images of upcoming cards for instant transitions.
  useEffect(() => {
    deck.slice(0, 3).forEach((o) => {
      const img = new Image()
      img.src = o.image
    })
  }, [deck])

  // Persist likes.
  useEffect(() => {
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify(liked))
    } catch {
      // storage full/unavailable — non-fatal
    }
  }, [liked])

  const decide = useCallback((dir) => {
    setDeck((prev) => {
      if (prev.length === 0) return prev
      const [topCard, ...rest] = prev
      if (dir === 'right') setLiked((l) => [topCard, ...l])
      setSeenCount((c) => c + 1)
      return rest
    })
    setCommand(null)
  }, [])

  // Buttons / keyboard trigger a programmatic swipe on the top card.
  const triggerSwipe = useCallback((dir) => {
    setCommand({ dir, nonce: Date.now() + Math.random() })
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (showProfile) return
      if (e.key === 'ArrowRight') triggerSwipe('right')
      else if (e.key === 'ArrowLeft') triggerSwipe('left')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [triggerSwipe, showProfile])

  const resetAll = () => {
    setLiked([])
    setShowProfile(false)
  }

  const topCard = deck[0]
  const nextCard = deck[1]

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <h1 className="header__title">Met Match</h1>
          <p className="header__subtitle">Swipe to discover the art you love</p>
        </div>
        <button
          className="header__likes"
          onClick={() => setShowProfile(true)}
          disabled={liked.length === 0}
          title="See your taste profile"
        >
          ♥ {liked.length}
        </button>
      </header>

      <div className="segmented" role="tablist" aria-label="Art category">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <button
            key={key}
            role="tab"
            aria-selected={category === key}
            className={`segmented__btn ${category === key ? 'is-active' : ''}`}
            onClick={() => setCategory(key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <main className="stage">
        {error && (
          <div className="empty">
            <p>{error}</p>
            <button
              className="btn btn--primary"
              onClick={() => {
                setError(null)
                refill(category, requestId.current)
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!error && (
          <div className="deck">
            {nextCard && (
              <SwipeCard key={nextCard.id} object={nextCard} onSwipe={() => {}} isTop={false} />
            )}
            {topCard && (
              <SwipeCard
                key={topCard.id}
                object={topCard}
                onSwipe={decide}
                command={command}
                isTop={true}
              />
            )}
            {!topCard && loading && (
              <div className="deck__loading">
                <div className="spinner" />
                <p>Finding art…</p>
              </div>
            )}
            {!topCard && !loading && (
              <div className="empty">
                <p>You've seen everything we pulled. Load a fresh batch?</p>
                <button
                  className="btn btn--primary"
                  onClick={() => refill(category, requestId.current)}
                >
                  More art
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="actions">
        <button
          className="action action--nope"
          onClick={() => triggerSwipe('left')}
          disabled={!topCard}
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          className="action action--info"
          onClick={() => setShowProfile(true)}
          disabled={liked.length === 0}
          aria-label="Your taste"
        >
          ★
        </button>
        <button
          className="action action--like"
          onClick={() => triggerSwipe('right')}
          disabled={!topCard}
          aria-label="Like"
        >
          ♥
        </button>
      </div>

      <p className="hint">
        Drag the card, use the buttons, or press ← / → · {seenCount} seen · CC0 works, free to reuse
      </p>

      {showProfile && (
        <TasteProfile liked={liked} onClose={() => setShowProfile(false)} onReset={resetAll} />
      )}
    </div>
  )
}

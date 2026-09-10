import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 110 // px of horizontal drag needed to commit a decision

// A single draggable artwork card. Commits a decision when dragged past the
// threshold, or when the parent sends a `command` ({ dir, nonce }) from the
// on-screen buttons / keyboard. Calls onSwipe(dir) once the exit animation ends.
export default function SwipeCard({ object, onSwipe, command, isTop }) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [exit, setExit] = useState(null) // 'left' | 'right' | null
  const [showInfo, setShowInfo] = useState(false)
  const startRef = useRef(null)
  const firedRef = useRef(false)

  // React to a programmatic swipe command from the parent.
  useEffect(() => {
    if (isTop && command && command.nonce && !exit) setExit(command.dir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.nonce])

  function onPointerDown(e) {
    if (exit || !isTop) return
    startRef.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0, active: true })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e) {
    if (!startRef.current) return
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
      active: true,
    })
  }

  function onPointerUp() {
    if (!startRef.current) return
    const { x } = drag
    startRef.current = null
    if (x > THRESHOLD) setExit('right')
    else if (x < -THRESHOLD) setExit('left')
    else setDrag({ x: 0, y: 0, active: false })
  }

  // Only the top card is positioned inline; the back card is styled by CSS so
  // its scaled-back resting transform isn't overridden.
  let transform
  if (isTop) {
    if (exit) {
      const dir = exit === 'right' ? 1 : -1
      transform = `translate(${dir * 700}px, 60px) rotate(${dir * 22}deg)`
    } else {
      transform = `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`
    }
  }

  const likeOpacity = Math.max(0, Math.min(1, drag.x / THRESHOLD))
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / THRESHOLD))

  return (
    <div
      className={`swipe-card ${isTop ? 'is-top' : 'is-back'} ${
        drag.active ? 'is-dragging' : ''
      } ${exit ? 'is-exiting' : ''}`}
      style={{ transform, zIndex: isTop ? 2 : 1 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTransitionEnd={() => {
        if (exit && !firedRef.current) {
          firedRef.current = true
          onSwipe(exit)
        }
      }}
    >
      <div className="swipe-card__image">
        <img src={object.image} alt={object.title} draggable="false" />
        <span className="stamp stamp--like" style={{ opacity: likeOpacity }}>
          Like
        </span>
        <span className="stamp stamp--nope" style={{ opacity: nopeOpacity }}>
          Pass
        </span>
      </div>

      <div className={`swipe-card__info ${showInfo ? 'is-open' : ''}`}>
        <div className="swipe-card__headline">
          <h2 className="swipe-card__title">{object.title}</h2>
          <p className="swipe-card__sub">
            {object.artist || object.culture || 'Unknown maker'}
            {object.date ? ` · ${object.date}` : ''}
          </p>
        </div>

        {isTop && (
          <button
            className="swipe-card__more"
            onClick={(e) => {
              e.stopPropagation()
              setShowInfo((v) => !v)
            }}
            aria-expanded={showInfo}
          >
            {showInfo ? 'Less' : 'Details'}
          </button>
        )}

        {showInfo && (
          <dl className="swipe-card__facts">
            {object.medium && (
              <div>
                <dt>Medium</dt>
                <dd>{object.medium}</dd>
              </div>
            )}
            {object.department && (
              <div>
                <dt>Department</dt>
                <dd>{object.department}</dd>
              </div>
            )}
            {object.tags.length > 0 && (
              <div>
                <dt>Tags</dt>
                <dd>{object.tags.slice(0, 5).join(', ')}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}

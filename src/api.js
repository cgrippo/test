// Client for The Metropolitan Museum of Art Collection API.
// Docs: https://metmuseum.github.io/  (public, no API key required)

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

// The API has no endpoint that returns "random object with an image", so the
// strategy is: fetch a pool of object IDs once (all of which are known to have
// images), cache it, then randomly sample from that pool and fetch details.
export const POOLS = {
  highlights: {
    label: 'Highlights',
    hint: 'Curator-picked masterworks',
    url: `${BASE}/search?isHighlight=true&hasImages=true&q=*`,
  },
  all: {
    label: 'Full collection',
    hint: 'Deep cuts — anything with an image',
    url: `${BASE}/search?hasImages=true&q=*`,
  },
}

const CACHE_PREFIX = 'met-pool-'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { ids, ts } = JSON.parse(raw)
    if (!Array.isArray(ids) || Date.now() - ts > CACHE_TTL) return null
    return ids
  } catch {
    return null
  }
}

function writeCache(key, ids) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ids, ts: Date.now() }))
  } catch {
    // localStorage may be unavailable or full — non-fatal, we just refetch.
  }
}

// Returns the array of object IDs for a given pool, cached across sessions.
export async function getPoolIds(poolKey) {
  const pool = POOLS[poolKey]
  if (!pool) throw new Error(`Unknown pool: ${poolKey}`)

  const cached = readCache(poolKey)
  if (cached) return cached

  const res = await fetch(pool.url)
  if (!res.ok) throw new Error(`Failed to load ${pool.label} (HTTP ${res.status})`)
  const data = await res.json()
  const ids = data.objectIDs || []
  writeCache(poolKey, ids)
  return ids
}

// Fetch details for a single object. Returns null on failure or if it turns
// out to have no usable image, so callers can filter these out.
export async function getObject(id) {
  try {
    const res = await fetch(`${BASE}/objects/${id}`)
    if (!res.ok) return null
    const o = await res.json()
    const image = o.primaryImageSmall || o.primaryImage
    if (!image) return null
    return {
      id: o.objectID,
      title: o.title || 'Untitled',
      artist: o.artistDisplayName || '',
      date: o.objectDate || '',
      medium: o.medium || '',
      department: o.department || '',
      culture: o.culture || '',
      creditLine: o.creditLine || '',
      isHighlight: o.isHighlight || false,
      image,
      imageLarge: o.primaryImage || image,
      url: o.objectURL || '',
    }
  } catch {
    return null
  }
}

// Pick `count` distinct random elements from an array.
function sample(arr, count) {
  const picks = new Set()
  const max = Math.min(count, arr.length)
  while (picks.size < max) {
    picks.add(arr[Math.floor(Math.random() * arr.length)])
  }
  return [...picks]
}

// Run async tasks with bounded concurrency (keeps us well under the API's
// rate limit and avoids hammering it with hundreds of parallel requests).
async function mapLimit(items, limit, fn) {
  const results = []
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

// Fetch `count` random objects (with images) from the given pool.
// Over-samples to compensate for objects that fail or lack images.
export async function getRandomObjects(poolKey, count, { signal } = {}) {
  const ids = await getPoolIds(poolKey)
  if (ids.length === 0) return []

  const collected = []
  const tried = new Set()
  let attempts = 0
  const maxAttempts = 4 // batches of over-sampled fetches

  while (collected.length < count && attempts < maxAttempts) {
    if (signal?.aborted) break
    const need = count - collected.length
    const batchIds = sample(
      ids.filter((id) => !tried.has(id)),
      Math.ceil(need * 1.6) + 2,
    )
    batchIds.forEach((id) => tried.add(id))

    const objects = await mapLimit(batchIds, 6, getObject)
    for (const obj of objects) {
      if (obj && collected.length < count) collected.push(obj)
    }
    attempts++
  }

  return collected
}

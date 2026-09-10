// Client for The Metropolitan Museum of Art Collection API.
// Docs: https://metmuseum.github.io/  (public, no API key required)

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

// Categories of "hanging art". Each is an object-ID pool built from a search.
// NOTE: the Met search treats `q=*` inconsistently, so each pool uses a real
// query term alongside the `medium` filter for stable results. Public-domain
// (CC0, free for commercial use) filtering is done client-side on each object,
// because the API's `isPublicDomain` search param does not actually filter.
export const CATEGORIES = {
  paintings: { label: 'Paintings', medium: 'Paintings', q: 'painting' },
  drawings: { label: 'Drawings', medium: 'Drawings', q: 'drawing' },
  prints: { label: 'Prints', medium: 'Prints', q: 'print' },
  photographs: { label: 'Photographs', medium: 'Photographs', q: 'photograph' },
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

// Returns the array of object IDs for a category, cached across sessions.
export async function getPoolIds(categoryKey) {
  const cat = CATEGORIES[categoryKey]
  if (!cat) throw new Error(`Unknown category: ${categoryKey}`)

  const cached = readCache(categoryKey)
  if (cached) return cached

  const url = `${BASE}/search?hasImages=true&medium=${encodeURIComponent(
    cat.medium,
  )}&q=${encodeURIComponent(cat.q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${cat.label} (HTTP ${res.status})`)
  const data = await res.json()
  const ids = data.objectIDs || []
  writeCache(categoryKey, ids)
  return ids
}

// Fetch one object. Returns null on failure, if it lacks an image, or if it is
// NOT public domain (we only surface CC0 works that are free to reuse).
export async function getObject(id) {
  try {
    const res = await fetch(`${BASE}/objects/${id}`)
    if (!res.ok) return null
    const o = await res.json()
    const image = o.primaryImageSmall || o.primaryImage
    if (!image || !o.isPublicDomain) return null
    return {
      id: o.objectID,
      title: o.title || 'Untitled',
      artist: o.artistDisplayName || '',
      artistNationality: o.artistNationality || '',
      date: o.objectDate || '',
      beginDate: o.objectBeginDate,
      endDate: o.objectEndDate,
      medium: o.medium || '',
      classification: o.classification || '',
      department: o.department || '',
      culture: o.culture || '',
      creditLine: o.creditLine || '',
      tags: (o.tags || []).map((t) => t.term).filter(Boolean),
      image,
      imageLarge: o.primaryImage || image,
      url: o.objectURL || '',
    }
  } catch {
    return null
  }
}

function sample(arr, count) {
  const picks = new Set()
  const max = Math.min(count, arr.length)
  while (picks.size < max) {
    picks.add(arr[Math.floor(Math.random() * arr.length)])
  }
  return [...picks]
}

// Run async tasks with bounded concurrency (stays well under the API rate limit).
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

// Fetch `count` random, public-domain artworks from a category, skipping any IDs
// in `exclude`. Over-samples to compensate for non-CC0 / imageless objects.
export async function getSwipeCandidates(categoryKey, count, { exclude } = {}) {
  const ids = await getPoolIds(categoryKey)
  const seen = exclude instanceof Set ? exclude : new Set()
  const pool = ids.filter((id) => !seen.has(id))
  if (pool.length === 0) return []

  const collected = []
  const tried = new Set()
  let attempts = 0
  const maxAttempts = 5

  while (collected.length < count && attempts < maxAttempts) {
    const need = count - collected.length
    // ~55% of image-bearing works are public domain, so over-sample generously.
    const batchIds = sample(
      pool.filter((id) => !tried.has(id)),
      Math.ceil(need * 2.2) + 3,
    )
    if (batchIds.length === 0) break
    batchIds.forEach((id) => tried.add(id))

    const objects = await mapLimit(batchIds, 6, getObject)
    for (const obj of objects) {
      if (obj && collected.length < count) collected.push(obj)
    }
    attempts++
  }

  return collected
}

/**
 * Browser cache for thesis scan results.
 *
 * Keyed by a hash of (thesis + equity + riskPct) so multiple theses
 * coexist. TTL is the current trading day — Mode 2 uses daily EOD bars,
 * so results are valid until the next trading day.
 */

const CACHE_PREFIX = 'foxel_thesis_'
const DATE_TTL_HOURS = 20 // allow same-day reuse across evenings

export interface ThesisCacheEntry {
  thesis: string
  equity: number
  riskPct: number
  tickers: string[]
  records: unknown[]
  coverage: unknown[]
  analystNote: unknown | null
  pipelineTime: number
  cachedAt: string // ISO timestamp
  cachedDate: string // YYYY-MM-DD
}

function hashKey(thesis: string, equity: number, riskPct: number): string {
  const input = `${thesis.trim().toLowerCase()}|${equity}|${riskPct}`
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i)
    h |= 0
  }
  return `${CACHE_PREFIX}${Math.abs(h).toString(36)}`
}

function todayKey(): string {
  // Use SGT (UTC+8) trading day boundary — matches the engine's SGT dates
  const now = new Date()
  const sgt = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000)
  return sgt.toISOString().slice(0, 10)
}

export function readCache(
  thesis: string,
  equity: number,
  riskPct: number,
): ThesisCacheEntry | null {
  const key = hashKey(thesis, equity, riskPct)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: ThesisCacheEntry = JSON.parse(raw)
    if (entry.cachedDate !== todayKey()) {
      localStorage.removeItem(key)
      return null
    }
    // also expire after DATE_TTL_HOURS for safety
    const ageHrs = (Date.now() - new Date(entry.cachedAt).getTime()) / 3_600_000
    if (ageHrs > DATE_TTL_HOURS) {
      localStorage.removeItem(key)
      return null
    }
    return entry
  } catch {
    return null
  }
}

export function writeCache(entry: Omit<ThesisCacheEntry, 'cachedAt' | 'cachedDate'>): void {
  const key = hashKey(entry.thesis, entry.equity, entry.riskPct)
  const full: ThesisCacheEntry = {
    ...entry,
    cachedAt: new Date().toISOString(),
    cachedDate: todayKey(),
  }
  try {
    localStorage.setItem(key, JSON.stringify(full))
    pruneOldCaches()
  } catch {
    // storage full or blocked — silently skip
  }
}

export function pruneOldCaches(): void {
  try {
    const today = todayKey()
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(CACHE_PREFIX)) continue
      try {
        const entry: ThesisCacheEntry = JSON.parse(localStorage.getItem(k) || '')
        if (entry.cachedDate !== today) localStorage.removeItem(k)
      } catch {
        localStorage.removeItem(k)
      }
    }
  } catch {}
}

export function clearAllThesisCaches(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(CACHE_PREFIX)) continue
      localStorage.removeItem(k)
    }
  } catch {}
}

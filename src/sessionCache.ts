/** Thin TTL wrapper around sessionStorage.
 *  Data is stored as { data, ts } so freshness can be checked on read.
 */

interface CacheEntry<T> {
  data: T;
  ts: number; // epoch ms when the entry was written
}

/** Read a cached value. Returns null if missing, unreadable, or expired. */
export function getCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Write a value to the cache with the current timestamp. */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage can throw in private browsing / quota exceeded — fail silently
  }
}

/** Remove a specific entry (e.g. to force a refresh). */
export function clearCache(key: string): void {
  sessionStorage.removeItem(key);
}

/**
 * Stale-while-revalidate read: returns cached data regardless of TTL.
 * Use this to show something immediately while a background refresh runs.
 * Returns null only if there is no cached entry at all.
 */
export function getCacheStale<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    // Support both new {data, ts} format and legacy plain arrays
    return (entry && typeof entry === 'object' && 'data' in entry) ? entry.data : entry;
  } catch {
    return null;
  }
}

// TTL constants used across the app
export const TTL_FACTORIES     = 20 * 60 * 1000; // 20 min — factories change infrequently
export const TTL_FACTORY_DETAIL = 10 * 60 * 1000; // 10 min — heavy fields (gallery/catalog/slots)
export const TTL_QUOTES        =  5 * 60 * 1000; //  5 min — quotes update more often
export const TTL_ORDERS        = 10 * 60 * 1000; // 10 min — CRM orders

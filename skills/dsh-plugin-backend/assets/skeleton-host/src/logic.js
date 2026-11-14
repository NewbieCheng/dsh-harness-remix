/**
 * Pure helpers: no Cordis, no IO, no globals.
 *
 * Everything a test would otherwise have to fake lives here on purpose — the
 * plugin file stays about wiring, and the rules stay unit-testable.
 */

/** Greeting must be a bounded, non-empty string; anything else is a caller bug. */
export function normalizeGreeting(value) {
  if (typeof value !== 'string') throw new TypeError('greeting must be a string')
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new TypeError('greeting must not be empty')
  if (trimmed.length > 200) throw new TypeError('greeting must be at most 200 characters')
  return trimmed
}

/** State shape is validated on every read: an old file must never crash new code. */
export function normalizeState(value) {
  const record = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const hits = Number.isSafeInteger(record.hits) && record.hits >= 0 ? record.hits : 0
  let greeting = 'hello'
  try {
    greeting = normalizeGreeting(record.greeting)
  } catch {
    greeting = 'hello'
  }
  return { greeting, hits }
}

/** The one payload the status route returns; kept stable so tests can pin it. */
export function statusPayload(state) {
  const { greeting, hits } = normalizeState(state)
  return { ok: true, greeting, hits }
}

/**
 * Local write guard. Returns a reason string when the request must be refused,
 * so the caller can answer 403 with a useful message instead of a bare deny.
 */
export function localWriteRejection(request, { headerName, socketHeaderless = false } = {}) {
  const header = (name) => {
    const value = request?.headers?.[name]
    return Array.isArray(value) ? value[0] : value
  }
  if (typeof headerName !== 'string') return 'missing trust header name'
  if (header(headerName) !== '1') return 'untrusted caller'
  if (!socketHeaderless) {
    const remote = String(request?.socket?.remoteAddress ?? '').toLowerCase().replace(/^\[|\]$/g, '')
    const loopback = remote === '::1' || remote === 'localhost' || remote.startsWith('127.') || remote.startsWith('::ffff:127.')
    if (!loopback) return 'non-loopback peer'
  }
  const site = header('sec-fetch-site')
  if (site !== undefined && site !== 'same-origin') return 'cross-site request'
  const host = header('host')
  if (typeof host !== 'string' || host === '') return 'missing host'
  const origin = header('origin')
  if (origin === undefined || origin === '') return undefined
  try {
    const url = new URL(origin)
    if (url.host !== host) return 'origin/host mismatch'
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'unexpected protocol'
    return undefined
  } catch {
    return 'malformed origin'
  }
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localWriteRejection, normalizeGreeting, normalizeState, statusPayload } from '../src/logic.js'

test('normalizeGreeting trims and bounds', () => {
  assert.equal(normalizeGreeting('  hi  '), 'hi')
  assert.throws(() => normalizeGreeting(''), /empty/)
  assert.throws(() => normalizeGreeting(42), /string/)
  assert.throws(() => normalizeGreeting('x'.repeat(201)), /200/)
})

test('normalizeState repairs old or hostile shapes instead of throwing', () => {
  assert.deepEqual(normalizeState(null), { greeting: 'hello', hits: 0 })
  assert.deepEqual(normalizeState({ greeting: '', hits: -3 }), { greeting: 'hello', hits: 0 })
  assert.deepEqual(normalizeState({ greeting: 'yo', hits: 7 }), { greeting: 'yo', hits: 7 })
  assert.deepEqual(normalizeState([]), { greeting: 'hello', hits: 0 })
})

test('statusPayload is stable', () => {
  assert.deepEqual(statusPayload({ greeting: 'yo', hits: 2 }), { ok: true, greeting: 'yo', hits: 2 })
})

const request = (overrides = {}) => ({
  headers: { host: '127.0.0.1:47730', origin: 'http://127.0.0.1:47730' },
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides,
})

test('localWriteRejection accepts a same-origin loopback request with the header', () => {
  const req = request({ headers: { host: '127.0.0.1:47730', origin: 'http://127.0.0.1:47730', 'x-dsh-hello-host': '1' } })
  assert.equal(localWriteRejection(req, { headerName: 'x-dsh-hello-host' }), undefined)
})

test('localWriteRejection refuses the obvious bypasses', () => {
  const options = { headerName: 'x-dsh-hello-host' }
  assert.match(localWriteRejection(request(), options), /untrusted/)

  const noHeader = request({ headers: { host: '127.0.0.1:47730', origin: 'http://evil.example' } })
  assert.match(localWriteRejection(noHeader, options), /untrusted/)

  const remote = request({ socket: { remoteAddress: '10.0.0.5' }, headers: { host: 'h', origin: 'http://h', 'x-dsh-hello-host': '1' } })
  assert.match(localWriteRejection(remote, options), /non-loopback/)

  const crossSite = request({ headers: { host: 'h', origin: 'http://h', 'x-dsh-hello-host': '1', 'sec-fetch-site': 'cross-site' } })
  assert.match(localWriteRejection(crossSite, options), /cross-site/)

  const mismatch = request({ headers: { host: 'a', origin: 'http://b', 'x-dsh-hello-host': '1' } })
  assert.match(localWriteRejection(mismatch, options), /origin\/host/)

  const badOrigin = request({ headers: { host: 'a', origin: 'not a url', 'x-dsh-hello-host': '1' } })
  assert.match(localWriteRejection(badOrigin, options), /malformed/)
})

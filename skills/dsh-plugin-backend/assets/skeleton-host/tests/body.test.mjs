import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { readJsonBody } from '../src/body.js'

test('body accepts a bounded JSON object', async () => {
  const req = new PassThrough()
  const result = readJsonBody(req, 20)
  req.end('{"ok":true}')
  assert.deepEqual(await result, { ok: true })
})

test('body rejects overflow even when the first chunk is valid JSON', async () => {
  const req = new PassThrough()
  const result = readJsonBody(req, 7)
  req.write('{}')
  req.end('        ')
  assert.equal(await result, null)
})

test('body rejects truncated, non-object, and aborted requests', async () => {
  for (const text of ['{"x":', '[]']) {
    const req = new PassThrough(); const result = readJsonBody(req)
    req.end(text); assert.equal(await result, null)
  }
  const req = new PassThrough(); const result = readJsonBody(req)
  req.emit('aborted'); assert.equal(await result, null)
})

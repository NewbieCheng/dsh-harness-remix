import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { PassThrough } from 'node:stream'

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-host-routes-'))
  const source = fileURLToPath(new URL('..', import.meta.url))
  await cp(source, dir, { recursive: true })
  for (const [name, code] of Object.entries({
    '@deepseek-ai/schemastery': "const field={default(){return this},description(){return this}};export default {object:()=>field,boolean:()=>field,string:()=>field}",
    '@deepseek-ai/dsh-storage-domain': 'export const defineDomain = value => value',
  })) {
    const path = join(dir, 'node_modules', name); await mkdir(path, { recursive: true })
    await writeFile(join(path, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }))
    await writeFile(join(path, 'index.js'), code)
  }
  const plugin = await import(pathToFileURL(join(dir, 'index.js')).href)
  const routes = new Map(); const disposers = []; let state = { greeting: 'hello', hits: 0 }; let reject = undefined; let failStorage = false
  const ctx = {
    connection: { requestRejection: () => reject },
    storageDomain: { open: async () => { if (failStorage) throw new Error('failed'); return { global: { get: () => state, set: async v => { state = v } } } } },
    webServer: { register(route) { if (routes.has(route.path)) throw new Error('duplicate'); routes.set(route.path, route); return () => routes.delete(route.path) } },
    effect(fn) { const dispose = fn(); if (dispose) disposers.push(dispose) }, get: () => undefined,
  }
  return { dir, plugin, ctx, routes, disposers, getState: () => state, reject: v => { reject = v }, fail: () => { failStorage = true } }
}
async function request(route, { method = 'GET', body = '', headers = {} } = {}) {
  const req = new PassThrough(); req.method = method; req.headers = { host: '127.0.0.1:1', origin: 'http://127.0.0.1:1', 'x-dsh-hello-host': '1', ...headers }; req.socket = { remoteAddress: '127.0.0.1' }
  const response = { writeHead(status) { this.status = status; return this }, end(value) { this.body = value; return this } }
  const result = route.handler(req, response); req.end(body); await result; return response
}

test('routes reject invalid requests, keep reads pure, and dispose cleanly', async () => {
  const f = await setup()
  try {
    const config = { enabled: true, trustHeader: 'x-dsh-hello-host' }; f.plugin.apply(f.ctx, config)
    const status = f.routes.get('/api/dsh-hello-host/status'); const greeting = f.routes.get('/api/dsh-hello-host/greeting')
    f.reject(401); assert.equal((await request(status)).status, 401); f.reject(undefined)
    assert.equal((await request(greeting)).status, 405)
    assert.equal((await request(greeting, { method: 'POST', headers: { 'x-dsh-hello-host': '0' } })).status, 403)
    assert.equal((await request(greeting, { method: 'POST', body: '{}' + ' '.repeat(17000) })).status, 400)
    assert.equal((await request(greeting, { method: 'POST', body: '{"greeting":' })).status, 400)
    assert.equal((await request(status)).status, 200); assert.deepEqual(f.getState(), { greeting: 'hello', hits: 0 })
    assert.equal((await request(greeting, { method: 'POST', body: '{"greeting":"hello again"}' })).status, 200)
    assert.equal(f.getState().greeting, 'hello again')
    for (const dispose of f.disposers.reverse()) await dispose(); assert.equal(f.routes.size, 0)
    f.plugin.apply(f.ctx, config); assert.equal(f.routes.size, 2)
    for (const dispose of f.disposers.reverse()) await dispose()
  } finally { await rm(f.dir, { recursive: true, force: true }) }
})

test('storage failure returns unavailable, not a false success', async () => {
  const f = await setup()
  try {
    f.fail(); f.plugin.apply(f.ctx, { enabled: true, trustHeader: 'x-dsh-hello-host' })
    assert.equal((await request(f.routes.get('/api/dsh-hello-host/status'))).status, 503)
  } finally { await rm(f.dir, { recursive: true, force: true }) }
})

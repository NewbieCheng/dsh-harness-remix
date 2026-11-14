import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULTS, readSettings, settingsPath, updateSettings, writeSettings } from '../src/settings.js'

async function tempHome() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-hello-host-'))
  const dir = join(home, 'hello-host')
  await mkdir(dir, { recursive: true })
  return { home, file: join(dir, 'settings.json') }
}

test('settings path follows DSH_HOME', () => {
  assert.equal(settingsPath({ DSH_HOME: 'C:/tmp/x' }), join('C:/tmp/x', 'hello-host', 'settings.json'))
})

test('missing or corrupt settings fall back to defaults', async () => {
  const { home, file } = await tempHome()
  try {
    assert.deepEqual(await readSettings(file), { ...DEFAULTS })
    await writeFile(file, '{ not json', 'utf8')
    assert.deepEqual(await readSettings(file), { ...DEFAULTS })
    await writeFile(file, '[]', 'utf8')
    assert.deepEqual(await readSettings(file), { ...DEFAULTS })
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

test('write then read round-trips and leaves no temp files', async () => {
  const { home, file } = await tempHome()
  try {
    await writeSettings({ greeting: 'yo', lastSeen: '2026-01-01T00:00:00.000Z' }, file)
    assert.deepEqual(await readSettings(file), { greeting: 'yo', lastSeen: '2026-01-01T00:00:00.000Z' })
    const leftovers = (await readdir(join(home, 'hello-host'))).filter((name) => name.endsWith('.tmp') || name.endsWith('.bak'))
    assert.deepEqual(leftovers, [])
    const text = await readFile(file, 'utf8')
    assert.match(text, /"greeting": "yo"/)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

test('concurrent updates do not lose each other', async () => {
  const { home, file } = await tempHome()
  try {
    await writeSettings({ greeting: 'a', lastSeen: null }, file)
    const stamps = ['2026-01-01', '2026-01-02', '2026-01-03']
    await Promise.all(stamps.map((stamp) => updateSettings((current) => ({ ...current, lastSeen: stamp }), file)))
    const settled = await readSettings(file)
    assert.ok(stamps.includes(settled.lastSeen), `unexpected lastSeen: ${settled.lastSeen}`)
    assert.equal(settled.greeting, 'a')
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

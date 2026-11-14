/**
 * A tiny durable settings file: one JSON object, atomic replace, serialized writes.
 *
 * This is the pattern for "a few plugin-owned preferences". Structured or
 * growing data belongs in `storageDomain` instead (see reference/storage.md).
 */
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export function resolveDshHome(env = process.env) {
  const custom = env.DSH_HOME
  return typeof custom === 'string' && custom.trim() !== '' ? custom.trim() : join(homedir(), '.dsh')
}

export function settingsPath(env = process.env) {
  return join(resolveDshHome(env), 'hello-host', 'settings.json')
}

/** Replace a file without ever leaving it half-written. */
async function replaceTextFile(file, text) {
  const dir = dirname(file)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const nonce = `${process.pid}.${randomUUID()}`
  const tmp = `${file}.${nonce}.tmp`
  const backup = `${file}.${nonce}.bak`
  await writeFile(tmp, text, 'utf8')
  try {
    await rename(tmp, file)
    return
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES') {
      await unlink(tmp).catch(() => {})
      throw error
    }
  }
  await rename(file, backup).catch(() => {})
  try {
    await rename(tmp, file)
  } catch (error) {
    await rename(backup, file).catch(() => {})
    await unlink(tmp).catch(() => {})
    throw error
  }
  await unlink(backup).catch(() => {})
}

export const DEFAULTS = Object.freeze({ greeting: 'hello', lastSeen: null })

export async function readSettings(file = settingsPath()) {
  if (!existsSync(file)) return { ...DEFAULTS }
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULTS }
    return {
      greeting: typeof parsed.greeting === 'string' && parsed.greeting !== '' ? parsed.greeting : DEFAULTS.greeting,
      lastSeen: typeof parsed.lastSeen === 'string' ? parsed.lastSeen : DEFAULTS.lastSeen,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function writeSettings(next, file = settingsPath()) {
  const normalized = {
    greeting: typeof next?.greeting === 'string' && next.greeting !== '' ? next.greeting : DEFAULTS.greeting,
    lastSeen: typeof next?.lastSeen === 'string' ? next.lastSeen : null,
  }
  await replaceTextFile(file, `${JSON.stringify(normalized, null, 2)}\n`)
  return normalized
}

/** Serialize read-modify-write so two callers cannot lose each other's update. */
let queue = Promise.resolve()
export function updateSettings(mutate, file = settingsPath()) {
  const run = async () => {
    const current = await readSettings(file)
    const next = await mutate(current)
    return writeSettings(next, file)
  }
  queue = queue.then(run, run)
  return queue
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
test('fresh install creates skill root without staging inside discovery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-remix-fresh-'))
  try {
    for (const item of ['scripts', 'skills']) cpSync(join(root, item), join(dir, item), { recursive: true })
    const home = join(dir, 'empty-home')
    const result = spawnSync(process.execPath, ['scripts/install-skills.mjs'], { cwd: dir, env: { ...process.env, DSH_HOME: home }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.ok(existsSync(join(home, 'skills/dsh-plugin-backend/SKILL.md')))
    assert.ok(existsSync(join(home, 'skills/dsh-ui-extension/SKILL.md')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

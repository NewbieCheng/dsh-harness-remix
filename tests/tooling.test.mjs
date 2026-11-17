import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-remix-test-'))
  for (const name of ['scripts', 'skills', 'shared', 'COMPAT.md']) cpSync(join(root, name), join(dir, name), { recursive: true })
  return dir
}
function run(dir, ...args) { return spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' }) }

test('verification catches missing local links, unknown slots, and factories', () => {
  const dir = fixture()
  try {
    const file = join(dir, 'skills/dsh-ui-extension/SKILL.md')
    const initial = readFileSync(file, 'utf8')
    for (const bad of ['\n[broken](reference/no-such-file.md)\n', '\n```js\nctx.slots.inject(\'not.a.real.slot\', () => {})\n```\n', '\n```js\nctx.slots.inject(\'conversation.content\', () => {})\n```\n']) {
      writeFileSync(file, initial + bad)
      const result = run(dir, 'scripts/verify-skills.mjs')
      assert.notEqual(result.status, 0, result.stdout + result.stderr)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('slot generator refuses empty and incomplete live trees', () => {
  const dir = fixture()
  try {
    for (const trees of [[], [{ type: 'slot', name: 'other', kind: 'list', scope: 'root', children: [] }]]) {
      writeFileSync(join(dir, 'tree.json'), JSON.stringify({ data: { trees } }))
      const result = run(dir, 'scripts/extract-slots.mjs', '--from-inspect', 'tree.json')
      assert.notEqual(result.status, 0)
    }
    assert.equal(run(dir, 'scripts/extract-slots.mjs', '--check').status, 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('installer retains backup and copies complete skill into a temporary home', () => {
  const dir = fixture(); const home = join(dir, 'home')
  try {
    mkdirSync(join(home, 'skills', 'dsh-plugin-backend'), { recursive: true })
    writeFileSync(join(home, 'skills', 'dsh-plugin-backend', 'SKILL.md'), 'user original')
    const result = spawnSync(process.execPath, ['scripts/install-skills.mjs', '--force'], { cwd: dir, env: { ...process.env, DSH_HOME: home }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /backup:/)
    const backupPath = /backup: (.+?)\)/.exec(result.stdout)?.[1]
    assert.ok(backupPath)
    assert.equal(readFileSync(join(backupPath, 'SKILL.md'), 'utf8'), 'user original')
    assert.ok(readFileSync(join(home, 'skills/dsh-plugin-backend/reference/native-session.md'), 'utf8').includes('sessionController'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

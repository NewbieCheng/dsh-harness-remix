import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const dependencyRoot = process.env.DSH_TEST_NODE_MODULES

test('UI skeleton builds in a temporary copy with external React', { skip: !dependencyRoot || !existsSync(join(dependencyRoot, 'esbuild')) }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ui-build-'))
  try {
    cpSync(join(root, 'skills/dsh-ui-extension/assets/skeleton'), dir, { recursive: true })
    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    cpSync(join(dependencyRoot, 'esbuild'), join(dir, 'node_modules/esbuild'), { recursive: true })
    cpSync(join(dependencyRoot, '@esbuild'), join(dir, 'node_modules/@esbuild'), { recursive: true })
    const run = spawnSync(process.execPath, ['scripts/build-client.mjs'], { cwd: dir, encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
    const bundle = readFileSync(join(dir, 'lib/client.js'), 'utf8')
    assert.match(bundle, /^window\.__ModuleLoader__\.load/)
    assert.match(bundle, /require\(["']react["']\)/)
    assert.match(bundle, /disposeSection\(\)/)
    assert.match(bundle, /disposeButton\(\)/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

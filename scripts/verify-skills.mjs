/**
 * Fail the build when a skill stops being true.
 *
 * Every rule here exists because the previous version broke it: a skill that
 * advertised `reference/*.md` files that were never installed, a 77-key slot
 * table while the host declared 116, and recipes that registered `id` into a
 * single slot (a throw, not a replacement).
 *
 *   node scripts/verify-skills.mjs
 *
 * Exit code 1 lists every problem; `--quiet` prints only the summary.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const skillsDir = join(root, 'skills')
const snapshotPath = join(root, 'shared', 'slots.snapshot.json')
const quiet = process.argv.includes('--quiet')

const problems = []
const fail = (file, message) => problems.push(`${file}: ${message}`)

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
const slotKeys = new Set(snapshot.slots.map((slot) => slot.key))
const factoryNames = new Set(snapshot.factories)

const skills = readdirSync(skillsDir).filter((entry) => statSync(join(skillsDir, entry)).isDirectory())

/** Relative paths a reader is told to open; each one must exist inside the skill. */
const REFERENCE_PATTERN = /`((?:reference|assets|scripts)\/[A-Za-z0-9._/-]+\.(?:md|mjs|js|ts|tsx|json|yml))`/g
/** Slot keys used in fenced examples, so a renamed seat cannot hide in prose. */
const REGISTER_PATTERN = /(?:name:\s*|slots\.inject\()['"]([a-z][a-zA-Z0-9.-]+)['"]/g

const FORBIDDEN = [
  ['77 个插槽', 'the live host declares 116; count is generated, never hand-written'],
  ['conversation-queue-dock', 'this slot does not exist'],
  ['conversation-todo-dock', 'this slot does not exist'],
  ['单人槽注册即替换', 'same-priority registration throws; replacement needs an explicit lower priority'],
  ['admit({ headers', 'admit() takes the request object, not a wrapper'],
]

for (const skill of skills) {
  const dir = join(skillsDir, skill)
  const skillFile = join(dir, 'SKILL.md')
  if (!existsSync(skillFile)) {
    fail(skill, 'missing SKILL.md')
    continue
  }
  const text = readFileSync(skillFile, 'utf8')
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (front === null) fail(`${skill}/SKILL.md`, 'missing YAML frontmatter')
  else {
    const name = /^name:\s*(.+)$/m.exec(front[1])?.[1]?.trim()
    const description = /^description:\s*(.+)$/m.exec(front[1])?.[1]?.trim()
    if (name === undefined) fail(`${skill}/SKILL.md`, 'frontmatter has no name')
    else if (name !== skill) fail(`${skill}/SKILL.md`, `frontmatter name "${name}" != folder "${skill}"`)
    if (description === undefined || description.length < 20) {
      fail(`${skill}/SKILL.md`, 'frontmatter description is missing or too short to route on')
    }
  }
  const lines = text.split('\n').length
  if (lines > 320) fail(`${skill}/SKILL.md`, `${lines} lines; the entry file must stay a decision document (<=320)`)

  const files = [skillFile]
  const walk = (at) => {
    for (const entry of readdirSync(at)) {
      const full = join(at, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.md')) files.push(full)
    }
  }
  walk(dir)

  for (const file of files) {
    const relative = file.slice(root.length + 1).replace(/\\/g, '/')
    const body = readFileSync(file, 'utf8')
    if ((body.match(/```/g) ?? []).length % 2 !== 0) fail(relative, 'unbalanced code fence')

    // Paths are only "open this file" claims outside fenced examples; inside a
    // fence the same spelling may be a workspace-relative path from a skeleton.
    const prose = body.replace(/```[\s\S]*?```/g, '')
    for (const [, target] of prose.matchAll(REFERENCE_PATTERN)) {
      // A skill ships its own reference/assets; repository tools (scripts/) are
      // resolved from the repository root, which is where the command is run.
      if (existsSync(join(dir, target)) || existsSync(join(root, target))) continue
      fail(relative, `points at missing file ${target}`)
    }
    for (const [, key] of body.matchAll(REGISTER_PATTERN)) {
      if (key.includes('/') || key.startsWith('my-') || key.startsWith('example')) continue
      if (factoryNames.has(key)) fail(relative, `registers Factory "${key}" — factories are component definitions, not seats`)
      else if (!slotKeys.has(key) && /^[a-z]+(\.[a-zA-Z]+)+$/.test(key)) {
        fail(relative, `registers unknown slot "${key}" (not in shared/slots.snapshot.json)`)
      }
    }
    for (const [needle, why] of FORBIDDEN) {
      if (body.includes(needle)) fail(relative, `contains forbidden claim "${needle}" — ${why}`)
    }
  }
}

const compat = join(root, 'COMPAT.md')
if (!existsSync(compat)) fail('COMPAT.md', 'missing')
else if (!readFileSync(compat, 'utf8').includes(snapshot.dshVersion)) {
  fail('COMPAT.md', `does not mention the snapshot baseline ${snapshot.dshVersion}`)
}

if (problems.length > 0) {
  process.stderr.write(`verify-skills: ${problems.length} problem(s)\n`)
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`)
  process.exit(1)
}
if (!quiet) {
  const files = skills.reduce((sum, skill) => {
    const count = (at) => readdirSync(at).reduce((n, entry) => (statSync(join(at, entry)).isDirectory() ? n + count(join(at, entry)) : n + (entry.endsWith('.md') ? 1 : 0)), 0)
    return sum + count(join(skillsDir, skill))
  }, 0)
  process.stdout.write(`verify-skills: ok — ${skills.length} skills, ${files} markdown files, ${slotKeys.size} slots @ ${snapshot.dshVersion}\n`)
}

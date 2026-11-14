/**
 * Copy `shared/` into every skill so an installed skill is self-contained.
 *
 * The two skills must agree on inspection procedure, conflict handling and the
 * acceptance checklist. Keeping one copy in `shared/` and generating the copies
 * keeps them from drifting, while the copies keep a skill installable on its
 * own — a skill that points at `../other-skill/...` breaks the moment someone
 * installs only one of them.
 *
 *   node scripts/sync-shared.mjs          # write the copies
 *   node scripts/sync-shared.mjs --check  # fail when a copy is stale
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const sharedDir = join(root, 'shared')
const skillsDir = join(root, 'skills')

const check = process.argv.includes('--check')
const MARKER = '<!-- GENERATED from shared/ by scripts/sync-shared.mjs — edit the source, not this copy. -->'

function frontmatterOf(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)
  return match?.[0] ?? ''
}

const skills = readdirSync(skillsDir).filter((entry) => existsSync(join(skillsDir, entry, 'SKILL.md')))
const files = readdirSync(sharedDir).filter((entry) => entry.endsWith('.md'))

let stale = 0
for (const skill of skills) {
  const destDir = join(skillsDir, skill, 'reference', 'shared')
  if (!check) mkdirSync(destDir, { recursive: true })
  for (const file of files) {
    const sourceText = readFileSync(join(sharedDir, file), 'utf8')
    const body = `${frontmatterOf(sourceText)}${MARKER}\n\n${sourceText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')}`
    const dest = join(destDir, file)
    if (check) {
      if (!existsSync(dest) || readFileSync(dest, 'utf8') !== body) {
        process.stderr.write(`stale: ${dest}\n`)
        stale += 1
      }
      continue
    }
    writeFileSync(dest, body, 'utf8')
    process.stdout.write(`synced ${dest}\n`)
  }
}

if (check) {
  if (stale > 0) {
    process.stderr.write(`${stale} shared copies are stale; run node scripts/sync-shared.mjs\n`)
    process.exit(1)
  }
  process.stdout.write(`shared copies are current (${skills.length} skills, ${files.length} files)\n`)
}

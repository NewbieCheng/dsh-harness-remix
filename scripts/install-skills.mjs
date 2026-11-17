/**
 * Install the skills in this repository into a DSH home.
 *
 * The old installer copied only SKILL.md, so every `reference/*.md` the skill
 * pointed at was missing on the machine that loaded it — the failure mode this
 * rewrite exists to prevent. A skill directory is installed as a directory.
 *
 *   node scripts/install-skills.mjs                 # copy what is missing
 *   node scripts/install-skills.mjs --force         # overwrite our two skills
 *   node scripts/install-skills.mjs --remove-legacy # also delete renamed skills
 *   node scripts/install-skills.mjs --print         # show what would happen
 *
 * DSH scans `<dshHome>/skills/<name>/SKILL.md` and watches that root, so an
 * install shows up in the next catalog without restarting the host.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', 'skills')
const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const target = join(home, 'skills')

/** Names this repository used before the v2 rename; only ever removed on request. */
const LEGACY = ['dsh-ui-remix', 'dsh-backend-bridge', 'dsh-plugin-common']

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const print = args.has('--print')
const removeLegacy = args.has('--remove-legacy')

const log = (message) => process.stdout.write(`${message}\n`)

function declaredName(file) {
  const text = readFileSync(file, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return null
  const name = /^name:\s*(.+)$/m.exec(match[1])
  const description = /^description:\s*(.+)$/m.exec(match[1])
  if (!name || !description) return null
  return name[1].trim().replace(/^["']|["']$/g, '')
}

if (!existsSync(source)) {
  log('no skills/ folder next to this script — nothing to install')
  process.exit(0)
}

const folders = readdirSync(source).filter((entry) => statSync(join(source, entry)).isDirectory())
if (folders.length === 0) {
  log('skills/ has no skill folders — nothing to install')
  process.exit(0)
}

let installed = 0
let skipped = 0
for (const folder of folders) {
  const skillFile = join(source, folder, 'SKILL.md')
  if (!existsSync(skillFile)) {
    log(`skip ${folder}: no SKILL.md`)
    skipped += 1
    continue
  }
  const name = declaredName(skillFile)
  if (name === null) {
    log(`skip ${folder}: SKILL.md needs YAML frontmatter with name and description`)
    skipped += 1
    continue
  }
  if (name !== folder || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`invalid skill name or folder mismatch: ${folder}`)
  }
  const destDir = join(target, name)
  const dest = join(destDir, 'SKILL.md')
  if (existsSync(dest) && !force) {
    log(`keep ${name}: already installed (--force overwrites)`)
    skipped += 1
    continue
  }
  if (print) {
    log(`would install ${name} -> ${destDir}`)
    continue
  }
  const nonce = randomUUID()
  const backupRoot = join(home, 'skill-backups')
  const staging = join(backupRoot, `.${name}.${nonce}.staging`)
  const backup = join(backupRoot, `${name}.${nonce}.backup`)
  const originalExists = existsSync(destDir)
  try {
    mkdirSync(backupRoot, { recursive: true })
    cpSync(join(source, folder), staging, { recursive: true })
    const verifyTree = (src, dst) => {
      for (const entry of readdirSync(src, { withFileTypes: true })) {
        const a = join(src, entry.name); const b = join(dst, entry.name)
        if (entry.isSymbolicLink()) throw new Error(`symlink not supported: ${a}`)
        if (entry.isDirectory()) verifyTree(a, b)
        else if (!entry.isFile() || !readFileSync(a).equals(readFileSync(b))) throw new Error(`copy verification failed: ${a}`)
      }
    }
    verifyTree(join(source, folder), staging)
    mkdirSync(target, { recursive: true })
    if (originalExists) renameSync(destDir, backup)
    try { renameSync(staging, destDir) }
    catch (error) { if (originalExists) renameSync(backup, destDir); throw error }
    installed += 1
    log(`installed ${name} -> ${destDir}${originalExists ? ` (backup: ${backup})` : ''}`)
  } finally {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true })
  }
}

if (removeLegacy) {
  for (const name of LEGACY) {
    const legacyDir = join(target, name)
    if (!existsSync(legacyDir)) continue
    if (print) {
      log(`would remove legacy ${name}`)
      continue
    }
    rmSync(legacyDir, { recursive: true, force: true })
    log(`removed legacy ${name}`)
  }
}

log(`${installed} installed, ${skipped} skipped, target ${target}`)

/**
 * Generate the slot inventory from a live `cordis_inspect` dump (and optionally
 * the shipped `slot-catalog.ts`) instead of hand-maintaining a slot table.
 *
 * Why: the hand-written table in the old skill drifted (77 keys) while the live
 * host declared 116, and it listed Factory keys as slots. A generated table can
 * be re-run after every DSH upgrade, and the header records which build it came
 * from, so a reader can tell "this is 0.2.2-rc.3" from "this is today".
 *
 *   # 1. capture the live tree (any agent runtime with the cordis_inspect tool)
 *   cordis_inspect_query { platform: "client", provider: "Slots", method: "listSubTree" }
 *   #    -> save the whole JSON result as slots.tree.json
 *
 *   # 2. regenerate (from the repository root)
 *   node scripts/extract-slots.mjs --from-inspect slots.tree.json \
 *     [--catalog <dsh>/packages/extensions/cordis-client-runner/src/client/slot-catalog.ts] \
 *     [--version 0.2.2-rc.3] [--out .]
 *
 *   # 3. verify nothing changed without a deliberate regeneration
 *   node scripts/extract-slots.mjs --from-inspect slots.tree.json --check
 *
 * Outputs: shared/slots.snapshot.json and skills/dsh-ui-extension/reference/slots.generated.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

function parseArgs(argv) {
  const args = { out: root, check: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--check') args.check = true
    else if (arg === '--from-inspect') args.inspect = argv[++i]
    else if (arg === '--catalog') args.catalog = argv[++i]
    else if (arg === '--version') args.version = argv[++i]
    else if (arg === '--date') args.date = argv[++i]
    else if (arg === '--out') args.out = resolve(argv[++i])
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (args.inspect === undefined && args.check === false) {
    throw new Error('--from-inspect <slot-tree.json> is required')
  }
  return args
}

/** First sentence, collapsed, bounded — table cells must stay one line. */
function summarize(text, max = 96) {
  if (typeof text !== 'string' || text.trim() === '') return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  const stop = flat.search(/[。.!?]\s/)
  const sentence = stop === -1 ? flat : flat.slice(0, stop + 1)
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence
}

/** `an entry in 'sidebar' (client-ui-sidebar), so it exists while …` -> `client-ui-sidebar` */
function ownerPackage(declaredBy) {
  const match = /\(([a-z0-9@/._-]+)\)/i.exec(declaredBy ?? '')
  return match?.[1] ?? ''
}

/** The 0.2.x generated catalog carries declaredBy/occupants; the live tree does not. */
function readCatalog(file) {
  const table = new Map()
  if (file === undefined || !existsSync(file)) return table
  const text = readFileSync(file, 'utf8')
  const start = text.indexOf('export const CLIENT_SLOT_API')
  if (start === -1) return table
  for (const block of text.slice(start).split(/\n  \{\n    key: /).slice(1)) {
    const key = /'([^']+)'/.exec(block)?.[1]
    if (key === undefined) continue
    const declaredBy = /declaredBy: '((?:[^'\\]|\\.)*)'/.exec(block)?.[1] ?? ''
    const occupants = (/occupants: \[([\s\S]*?)\n    \]/.exec(block)?.[1] ?? '')
      .split('\n')
      .map((line) => line.trim().replace(/^'|',?$/g, ''))
      .filter(Boolean)
    table.set(key, { declaredBy, occupants })
  }
  return table
}

function walk(node, parent, slots, factories, catalog) {
  if (node === null || typeof node !== 'object') return
  if (node.type === 'factory') {
    factories.add(node.name)
    for (const child of node.children ?? []) walk(child, node.name, slots, factories, catalog)
    return
  }
  if (node.type !== 'slot') return
  const meta = catalog.get(node.name)
  slots.set(node.name, {
    key: node.name,
    kind: node.kind,
    scope: node.scope,
    parent: parent ?? null,
    replaceRisk: node.replaceRisk ?? 'unknown',
    purpose: node.purpose ?? '',
    registration: (node.registration ?? []).map((option) => ({
      name: option.name,
      type: option.type,
      required: option.required === true,
    })),
    keyDomain: node.keyDomain ?? '',
    declaredBy: ownerPackage(meta?.declaredBy) || null,
    occupants: meta?.occupants ?? [],
  })
  for (const child of node.children ?? []) walk(child, node.name, slots, factories, catalog)
}

const KIND_LABEL = {
  single: '单占',
  list: '列表',
  keyed: '键控',
  chain: '竞选',
  hoc: '包裹',
}

const RISK_LABEL = {
  none: '可加',
  'shadows-shipped-ui': '替换',
  'wraps-owner-content': '包裹',
  unknown: '未知',
}

function render(snapshot) {
  const lines = []
  const slots = [...snapshot.slots].sort((a, b) => a.key.localeCompare(b.key))
  const rows = slots.map((slot) => [
    `\`${slot.key}\``,
    KIND_LABEL[slot.kind] ?? slot.kind,
    slot.scope,
    RISK_LABEL[slot.replaceRisk] ?? slot.replaceRisk,
    slot.declaredBy ?? (slot.parent === null ? '运行时' : `父：\`${slot.parent}\``),
    summarize(slot.purpose),
  ])
  lines.push('# DSH 插槽能力索引（自动生成）')
  lines.push('')
  lines.push(`> 由 \`scripts/extract-slots.mjs\` 生成，勿手改。基线：**DSH ${snapshot.dshVersion}**，采集 ${snapshot.capturedAt}。`)
  lines.push(`> 运行中宿主共 **${slots.length} 个槽 + ${snapshot.factories.length} 个 Factory**。升级 DSH 后：重跑生成器 → 看 diff → 改文档。`)
  lines.push('')
  lines.push('## 怎么读这张表')
  lines.push('')
  lines.push('| 列 | 含义 | 使用时必须知道的事 |')
  lines.push('|---|---|---|')
  lines.push('| 类型 | 单占/列表/键控/竞选/包裹 | 列表才可“加”；单占注册前先确认能否替换 |')
  lines.push('| 作用域 | root / session / session-maybe | session 槽只在有会话时存在 |')
  lines.push('| 替换风险 | 可加 / 替换 / 包裹 | 替换 = 单占或键控槽，**已有人占位时注册即替换**；可加 = 列表，不动官方 |')
  lines.push('| 声明者 | 谁挂了才存在（`父：` 表示由该父槽的 entry 声明，包名待采集） | 声明者没挂载时注册会抛错，要用 `ctx.slots.inject` 等 |')
  lines.push('')
  lines.push('注意：`替换` 是**该槽的最坏情况**。单占槽若当前无人注册（例如 `sidebar.brand.mark`），直接注册就生效，不构成替换；')
  lines.push('动手前用 `Slots.listSubTree { root: "<key>" }` 看它的 occupants，再决定是否需要显式 `priority`。')
  lines.push('')
  lines.push('“用途”一列保留宿主原文（英文），避免二次翻译改变语义；决策看前三列即可。')
  lines.push('')
  lines.push('注册选项：单占无 `id`；列表要 `id`（可选 `order`/`label`）；键控要 `key`；竞选要 `select`。')
  lines.push('`priority` 只有“明确替换”时才写：数值越小越优先，同优先级重复注册直接抛错。')
  lines.push('')
  lines.push('## 全表')
  lines.push('')
  lines.push('| 槽 | 类型 | 作用域 | 替换风险 | 声明者 | 用途 |')
  lines.push('|---|---|---|---|---|---|')
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`)
  lines.push('')
  lines.push('## Factory（不是槽，别注册）')
  lines.push('')
  lines.push('这些名字出现在 `slots` 相关 API 里，但类型是 Factory：它们是**可复用组件定义**，不是落座点。')
  lines.push('')
  for (const name of [...snapshot.factories].sort()) lines.push(`- \`${name}\``)
  lines.push('')
  lines.push('## 重新生成')
  lines.push('')
  lines.push('```sh')
  lines.push('# 1) 取实时树：cordis_inspect_query { platform:"client", provider:"Slots", method:"listSubTree" }')
  lines.push('#    把整个返回 JSON 存成 slots.tree.json')
  lines.push('node scripts/extract-slots.mjs --from-inspect slots.tree.json --version "$(dsh --version)"')
  lines.push('node scripts/extract-slots.mjs --from-inspect slots.tree.json --check   # CI 用')
  lines.push('```')
  lines.push('')
  return lines.join('\n')
}

const args = parseArgs(process.argv.slice(2))
const outRoot = args.out
const snapshotPath = join(outRoot, 'shared', 'slots.snapshot.json')
const mdPath = join(outRoot, 'skills', 'dsh-ui-extension', 'reference', 'slots.generated.md')

if (args.check) {
  if (!existsSync(snapshotPath)) throw new Error(`missing ${snapshotPath}; run the generator once`)
  const current = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  const catalog = readCatalog(args.catalog)
  const treePath = args.inspect
  if (treePath === undefined) {
    process.stdout.write(`snapshot: ${current.slots.length} slots, ${current.factories.length} factories\n`)
    process.exit(0)
  }
  const raw = JSON.parse(readFileSync(treePath, 'utf8'))
  const slots = new Map()
  const factories = new Set()
  for (const tree of raw.data.trees) walk(tree, null, slots, factories, catalog)
  const before = JSON.stringify(current.slots)
  const after = JSON.stringify([...slots.values()].sort((a, b) => a.key.localeCompare(b.key)))
  if (before !== after) {
    process.stderr.write('slot snapshot is stale: regenerate with scripts/extract-slots.mjs\n')
    process.exit(1)
  }
  process.stdout.write('slot snapshot is current\n')
  process.exit(0)
}

const raw = JSON.parse(readFileSync(args.inspect, 'utf8'))
const catalog = readCatalog(args.catalog)
const slots = new Map()
const factories = new Set()
for (const tree of raw.data.trees) walk(tree, null, slots, factories, catalog)

const snapshot = {
  dshVersion: args.version ?? 'unknown',
  capturedAt: args.date ?? new Date().toISOString().slice(0, 10),
  source: 'cordis_inspect_query client/Slots listSubTree',
  slots: [...slots.values()].sort((a, b) => a.key.localeCompare(b.key)),
  factories: [...factories].sort(),
}

mkdirSync(dirname(snapshotPath), { recursive: true })
mkdirSync(dirname(mdPath), { recursive: true })
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
writeFileSync(mdPath, `${render(snapshot)}\n`, 'utf8')
process.stdout.write(
  `wrote ${snapshot.slots.length} slots + ${snapshot.factories.length} factories\n  ${snapshotPath}\n  ${mdPath}\n`,
)

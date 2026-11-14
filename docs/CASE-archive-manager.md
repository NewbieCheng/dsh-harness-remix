# 案例：Archive Manager 1.3.6（`@michengai/dsh-archive-manager`）

> 研究方式：读安装包 `lib/` 全部 19 个模块（3208 行）+ `cordis.patch.yml` + `package.json`。
> 它是目前“Host 服务增强 + typert RPC + 会话数据安全操作”最完整的一个样本。

## 1. 结构

```text
cordis.patch.yml
  - id: ui-workspace  disabled: false     # 明确不替换官方服务
  - insert: ui-workspace-archive-manager  # 单入口
lib/
  index.js            入口：3 条设置路由 + 鉴权 + 幂等注册（250 行）
  host-install.js     inject=[workspaceRegistry, sessionPersistence, typert]（26 行）
  workspace.js        ArchiveWorkspaceRegistry（1214 行）：typert 描述符 + 14 个方法
  archive-organizer.js 收藏（105 行）
  archive-discovery.js 会话正文检索/预览（182 行）
  session-move.js     会话工件 cwd 重写（346 行，高风险）
  cache-rebuild*.js   投影缓存重建（12+39+98 行）
  plugin-settings.js  原子写设置（186 行）
  sidebar-entry.js    侧栏入口状态（494 行）
  api-base.js / contracts.js / explorer-path-policy.js / native-explorer.js  小工具
  client.js           浏览器半（35 行压缩）
```

## 2. 七个可迁移模式

### 2.1 服务增强（overlay），不替换

`installArchiveWorkspace(registry)`（`workspace.js:1165`）：

```js
const target = registry
const restoreRemote = bindOverlayRemote(registry)
const originalUnarchive = target.unarchiveSession
const descriptor = Object.getOwnPropertyDescriptor(target, 'unarchiveSession')
for (const name of Object.getOwnPropertyNames(ArchiveWorkspaceRegistry.prototype)) {
  // 逐个方法拷到活实例上，记录 hadOwn/previous
  // 只包装 unarchiveSession（返回值补 archivedSessionIds），其余直接覆盖
}
target[workspaceOverlay] = true
return () => { /* 逆序还原；unarchiveSession 用原描述符恢复 */ }
```

要点：
- 双保险幂等：`registry instanceof ArchiveWorkspaceRegistry` 与 `Symbol.for('dsh-archive-manager.workspace-overlay')`；
- 每个方法都留还原路径（`hadOwn` → 恢复原值，否则 `delete`）；
- 通过 `Reflect.get(service, symbols.original)` 拿 Cordis 代理后的**原始对象**；
- patch 里显式 `disabled: false` 官方 `ui-workspace`，并注释“不要替换官方服务，否则停用后侧栏消失”。

**可迁移结论**：增强官方服务要“可逆 + 幂等 + 注释说明为什么不 disable”。代价是依赖内部字段（`symbols.original`、typert 的 `remote-methods` 描述符），属于**版本敏感代码**，必须集中在一处并写测试。

### 2.2 typert 做主通道

`ARCHIVE_MANAGER_TYPERT`（`workspace.js:382`）：

```js
const ARCHIVE_MANAGER_TYPERT = {
  package: '@michengai/dsh-archive-manager',
  face: 'host',
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: ARCHIVE_MANAGER_INVOCATIONS,   // 14 个方法
}
```

单个 invocation（`workspace.js:233+`）：

```js
{
  id: '@michengai/dsh-archive-manager#workspaceRegistry/unarchiveSession',
  service: 'workspaceRegistry',
  namespace: 'workspaceRegistry',
  method: 'unarchiveSession',
  invocation: { kind: 'direct' },
  parameters: [{ name: 'sessionId', wire: 'sessionId', source: 'json', codec }],
  result: codec,
  sourceLocation: { file: '…/workspace.js', line: 1, column: 1 },
}
```

codec 用 `{ mode:'strict', typeSymbol, create: () => schema, schema }`，schema 只需 `parse`（部分带 `safeParse`）。

**可迁移结论**：前端要调的业务方法优先走 typert；HTTP 只留给“设置/本地小操作”。

### 2.3 HTTP 只做设置，且带四件套

`index.js` 三条 exact 路由（`sidebar-entry`、`sidebar-favorite-star`、`open-in-explorer`）：

```js
if (header('x-michengai-archive-settings') !== '1') return false        // 自定义头
if (!isLoopbackAddress(request.socket?.remoteAddress)) return false     // loopback
if (site !== undefined && site !== 'same-origin') return false          // sec-fetch-site
if (origin && (new URL(origin).host !== host)) return false             // Origin==Host
```

读 body 有 64 KiB 上限；响应统一 `cache-control: no-store`。

### 2.4 路由幂等（重载不残留）

```js
const raw = Reflect.get(ctx.webServer, symbols.original) ?? ctx.webServer
for (const key of ['exact', 'prefixes']) {
  const table = Reflect.get(raw, key)
  if (table instanceof Map && table.has(path)) table.delete(path)
}
```

这是**反射兜底**：正常路径仍是 `register` 拿 disposer。写进规范时降级为“仅在确认残留时使用”。

### 2.5 存储：收藏走 domain，设置走文件

- `defineDomain({ name:'archive_manager_favorites', version:1, tables:{}, global:{ schema: favoriteStateSchema, initial:{ favoriteSessionIds: [] } } })`；
- 读写：`domain.global.get()` → `schema.parse` → `domain.global.set(next)`；
- 设置文件：`$DSH_HOME/archive-manager/settings.json`，tmp→rename，失败回滚 `.bak`，写操作串行队列。

### 2.6 只读优先的数据访问

```js
const live = this.ctx.get('sessions')?.get(sessionId)
if (typeof live?.snapshotEvents === 'function') return live.snapshotEvents()
const persistence = this.ctx.get('sessionPersistence')
return (await this.readStoredProjectionSource(persistence, sessionId)).events
```

注释写得很清楚：“只读归档日志；已有实时实例读快照，不调用 prepare、enter 或恢复接口”。检索时前后各校验一次“会话仍在归档中”，避免 TOCTOU。

### 2.7 危险操作要“结构校验 + 备份 + 单元测试”

`session-move.js` 直接改会话工件的 zstd 首帧：

```js
function scanFirstZstdFrame(buf) { /* 魔数、描述符、块结构、校验和全部校验 */ }
function rewriteSessionArtifactCwd(buf, cwd, isZstd) {
  const frame0 = scanFirstZstdFrame(buf)
  const header = JSON.parse(decompress(buf.subarray(0, frame0.end)))   // 只解第一帧
  header.cwd = cwd
  return Buffer.concat([recompress(headerJSON + '\n'), buf.subarray(frame0.end)])  // 其余帧原样
}
```

**这是本仓库里最该被“警告”的代码**：它假定会话格式 = “首帧 JSON header + 后续帧事件”。规范里明确要求通用插件不要模仿，除非有版本闸门、备份与测试。

## 3. 值得注意的写法

| 写法 | 评价 |
|---|---|
| `bindTypertRemote(this, this.name)` 挂在实例上 | ✅ 官方约定，照做 |
| `try { register } catch (already registered) { return () => {} }` | 🟡 幂等，但会掩盖真正的注册失败 |
| 客户端 `remote.$mount(descriptors)` 后返回 async disposer | 🟡 形状可用，调用表达式待验证 |
| `settings.section.icon` 等新槽用 try/catch 注册 | 🟡 0.2.1 没有这些槽；静默降级应至少 warn |
| 19 个模块拆得细 | ✅ 可读、可测；比单文件 16k 行好 |

## 4. 一句话总结

> Archive Manager 的价值不在“归档”业务，而在示范了三件事的**边界**：
> **服务可以增强但必须可逆**、**数据通道优先 typert 而非裸 HTTP**、**危险的文件操作要有结构校验与测试**。

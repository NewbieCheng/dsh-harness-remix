# Host 服务选摘（105 个里的常用 40）

> 权威用法：`cordis_inspect_query { platform:"host", provider:"Service", method:"listService", input:{ service:"<key>" } }`。
> 下表是签名摘要，用于“知道有什么、怎么调”；**参数顺序照抄，不要凭记忆改写**。

## 1. 注册与载体

| 服务 | 签名 | 用途 |
|---|---|---|
| `tools` | `register(definition, options?)` / `restrict(filter)` / `guard(guard)` | 注册模型工具 |
| `webServer` | `register({kind,path,handler}) → dispose` / `registerUpgrade` / `registerFallback` / `tapIndex` | HTTP 路由 |
| `connection` | `requestRejection(request)` / `admit(request)` / `browserPeer` / `authenticatedUrl(base)` | 鉴权 |
| `clientModules` | `graph()` / `clientPath(id)` / `onRebuilt(cb)` | 客户端 bundle 图（一般不用直接碰） |
| `commands` | `register(definition)` / `@Remote list(agent)` / `execute(...)` | 人用命令（`/xxx`） |
| `pluginManager` / `pluginMarket` / `pluginRegistryProbe` | 插件安装/市场 | 做插件生态时才用 |
| `configEditor` | `entries()` / `edit(entry, change)` | 持久化插件配置（官方设置页在用） |

## 2. RPC 与存储

| 服务 | 签名 | 用途 |
|---|---|---|
| `typert` | `register(contribution) → disposer` / `get(key)` / `list(filter)` | 类型化 RPC 注册表 |
| `typertGateway` | `invoke(request)` / `stream(request)` | RPC 分发（框架侧） |
| `storageDomain` | `open(defineDomain(spec)) → Domain` / `get(name)` | 有 schema 的持久化 |
| `storage` | 底层存储 | 一般不用 |
| `settings` | `describe()` / `update(ns, patch, rev)` / `configure({auto})` | 插件设置表单 |
| `settingsController` | `@Remote` 包装 | 前端设置页用 |
| `credentials` | `resolve(ref)` / `set(ref, value)` | 凭据（不落明文） |
| `fs` | 组合文件系统 | 插件读写文件优先用它 |

## 3. 会话与工作区

| 服务 | 签名 | 用途 |
|---|---|---|
| `sessions` | `get(id)` / `list()` / `create()` / `fork(source, boundary?)` | 内存会话表 |
| `sessionPersistence` | `open(id, access, opts)` / `list()` / `stat(id)` | 会话工件（append-only） |
| `sessionProjectionCache` | 投影缓存 | 归档/列表页 |
| `sessionController` | `@Remote list/create/prompt/fork/rename/selectModel` | 前端会话操作 |
| `sessionQuery` / `sessionProjections` | 检索与投影 | 搜索、统计 |
| `workspaceRegistry` | `create(path,title)` / `list()` / `archiveSession(id)` / `unarchiveSession(id)` | 工作区与归档 |
| `workspaceController` | `@Remote create/rename/delete/archiveSession/…` | 前端工作区操作 |
| `workingDirectory` | `get(session)` / `set(agent,path)` | 会话工作目录 |
| `sessionTitle` | 标题生成 | 只允许一个提供方 |
| `sessionSkillCatalog` / `skills` | 技能目录 | 技能加载 |

## 4. Agent 与模型

| 服务 | 签名 | 用途 |
|---|---|---|
| `agents` | `get(id)` / `list()` / `create()` / `resume()` / `register(agent)` | 活 agent |
| `agentLoop` | `create(id, opts, meta)` / `createAgent` / `resume` | agent 工厂 |
| `agentPresets` | `list()` / `resolve(id)` / `mount(ctx,id)` / `@Remote read/select` | 预设 |
| `llm` | `listProviders()` / `listModels(provider)` / `registerAdapter(...)` / `resolveModelInfo(...)` | 模型目录与调用 |
| `agentDefaultModel` | `currentSelection()` / `saveSelection(next)` | 默认模型 |
| `permissionPresets` | `catalog()` / `current(session)` / `set(session, name)` | 权限预设（会话级） |
| `systemPrompt` | `section(s)` / `context(c)` / `tools(provider)` / `variable(name, fn)` | 系统提示装配 |
| `subagents` | `registerProvider` / `prompt` / `listDescendants` | 子 agent |
| `compaction` | `compactIfNeeded` / `compactNow` | 上下文压缩 |

## 5. 运行时与交互

| 服务 | 签名 | 用途 |
|---|---|---|
| `approval` | `request(req)` / `setPolicy(agent, policy)` | 审批 |
| `userQuestions` | `ask(req)` / `@Remote answer(...)` | 结构化提问 |
| `jobs` / `jobController` | 后台任务 | `run_in_background` |
| `schedule` | 定时任务 | cron 类功能 |
| `goals` | 目标 | 长任务 |
| `web` | `search(request)` / `fetch(request)` | 联网 |
| `attachments` | `saveImages` / `readImage` | 附件 |
| `terminalController` / `terminals` | 终端会话 | — |
| `sandbox` / `sandboxPolicy` | 沙箱后端与策略 | 受控执行 |
| `subprocess` | `spawn(spec)` / `spawnTerminal(spec)` | 子进程（**务必用 effect 收尾**） |
| `mcpManager` | MCP 连接 | 接 MCP |
| `inspector` | 检查器 | 调试 |

## 6. 使用纪律

1. **硬依赖写 `inject`，软依赖用 `ctx.get()`**；
2. 服务方法可能返回 disposer——**一律用 `ctx.effect` 持有**；
3. `@Remote` 标记的方法是给前端/跨进程的，可直接调，但要注意其参数是 wire 形状；
4. 不确定签名就 inspect，不要猜参数顺序；
5. 不要为了“方便”把官方服务整体替换（见冲突矩阵 C1）。

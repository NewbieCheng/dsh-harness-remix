# 会话与工作区数据：读写边界

> **一句话：读可以随便读（用公开只读接口），写只能走官方服务。**
> 直接改会话工件 = 升级即损坏，这条没有例外。

## 1. 数据在哪

```text
$DSH_HOME/
  sessions/<encoded-cwd>/<session-id>/session.v4.jsonl.zstd   # 会话日志（append-only，zstd 帧）
  storages/…                                                  # storageDomain 的域
  archive-manager/settings.json                               # 插件自己的设置（示例）
```

会话 ID 与 cwd 的映射、标题、投影都在官方服务里，不要自己重建索引。

## 2. 读：优先内存，其次持久化

```js
// 有活实例：读快照，不激活、不改变状态
const live = ctx.get('sessions')?.get(sessionId)
const events = typeof live?.snapshotEvents === 'function' ? live.snapshotEvents() : undefined

// 没有活实例：只读打开
const persistence = ctx.get('sessionPersistence')
const handle = await persistence.open(sessionId, 'read')
const stored = await handle.read?.()   // 具体形状以 inspect 为准
```

规则：
- `access: 'read'` 打开，**不要**用写权限只为读；
- 读完即关；
- 大列表分页，别一次 `list()` 全量再过滤。

## 3. 投影与缓存

- 列表页/归档页需要“摘要、标题、最后活动时间”，用 `sessionProjections` / `sessionProjectionCache`；
- 缓存由官方维护，插件**不要**自己再建一份 JSON 索引（会不一致）；
- 缓存损坏的修复走官方诊断接口，不要手删文件。

## 4. 写：只能通过服务

| 想做的事 | 服务 |
|---|---|
| 归档/恢复会话 | `workspaceRegistry.archiveSession(id)` / `unarchiveSession(id)` |
| 移动到别的项目 | 官方 `workspaceRegistry` 的移动能力（版本相关，先 inspect） |
| 删除会话 | `workspaceRegistry.deleteSession(id)`（不可逆，必须二次确认） |
| 重命名/固定 | 官方会话服务 |
| 新建/续聊 | `sessionController.create/fork/prompt` 或 `agents` |

## 5. 危险操作红线

Archive Manager 为了让会话跟着工作区走，**直接重写过 zstd 首帧的 `cwd`**（解压首帧→改 header→重压→拼接剩余帧）。它能这么做是因为：

- 有 zstd 帧结构校验（魔数/块类型/校验和）；
- 有测试覆盖；
- 有明确的版本假设。

**通用插件不要模仿**。如果非做不可：

```text
[ ] 先备份原文件（同目录 .bak，保留时间戳）
[ ] 校验帧结构，失败即放弃（不写半成品）
[ ] 写入用 tmp→rename
[ ] 有单测：正常帧、截断帧、非 zstd、空文件
[ ] 在 COMPAT 里标明“依赖会话格式 vX”
[ ] 升级 DSH 后先跑一次诊断再启用
```

## 6. 诊断

```js
// 插件自己的诊断接口（不要塞进 /api/session）
POST /api/my-plugin/diagnose { sessionId }
→ { ok, sessionKnown, archived, cacheState, lastError }
```

- 诊断只读；
- 输出里不要带会话正文、绝对路径（或只留 basename）；
- 前端面板 20 秒静默后贴一次即可，不要轮询。

## 7. 反模式

| 反模式 | 后果 |
|---|---|
| 手改 `session.v4.jsonl.zstd` | 升级后会话打不开 |
| 自己维护 sessionId→cwd 映射 | 移动/重命名后错乱 |
| 用 `list()` 全量扫描 | 慢，且并发时形状会变 |
| 归档时删除而非标记 | 用户找不回 |
| 诊断接口返回正文 | 隐私泄漏 |

# 会话与工作区数据：读写边界

> **一句话：读取也必须经过身份与资源授权，写入走经核实的官方服务。**
> 不直接改会话工件；插件自己的业务绑定不等于官方会话索引。

## 1. 数据在哪

```text
$DSH_HOME/
  sessions/<encoded-cwd>/<session-id>/session.v4.jsonl.zstd   # 会话日志（append-only，zstd 帧）
  storages/…                                                  # storageDomain 的域
  archive-manager/settings.json                               # 插件自己的设置（示例）
```

会话 ID 与 cwd 的映射、标题、投影都在官方服务里，不要自己重建索引。

## 2. 读：使用宿主确认的只读接口

先验证调用主体对目标 session 的访问权限，再查询当前 `sessionController.events`、`follow` 和持久化服务的精确契约。根据需求选择可分页的历史、投影或已存在的内存快照，不为读取申请写权限。若使用持久化 handle，以当前版本的返回类型确认读取与关闭方式；不要猜测 `open` 参数或 handle 方法。大列表按可用的分页接口分批读取。

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

历史项目曾直接重写会话工件头部；它依赖内部格式，属于不可移植的高风险反例，不是通用方案。迁移或移动必须使用当前宿主确认的公开能力；缺失时明确不支持，不能自行改写用户会话。

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

# 存储：storageDomain 与原子写

> 两条路：**有结构、要校验、要演进** → `storageDomain`；**少量插件设置** → 一个 JSON 文件 + 原子写。
> 不要自己发明数据库，也不要把配置塞进会话日志。

## 1. storageDomain（推荐）

```js
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'

const spec = defineDomain({
  name: 'my_plugin_state',          // 域名单一、稳定，改名等于丢数据
  version: 1,                       // 结构变更时 +1，并提供迁移
  tables: {},                       // 需要多行数据时在这里声明
  global: {
    schema: stateSchema,            // 需要 parse()（Standard Schema 形状）
    initial: { enabled: false, ids: [] },
  },
})

export const inject = ['storageDomain']

export function apply(ctx) {
  ctx.effect(() => {
    let domain
    void ctx.storageDomain.open(spec).then((opened) => { domain = opened })
    return () => { domain = undefined }
  }, 'my-plugin: storage')
}
```

读 / 写：

```js
const state = stateSchema.parse(domain.global.get())
await domain.global.set({ ...state, enabled: true })
```

规则：
- `parse` 必须**防御性**（`archive-manager` 的写法是 `record()` 校验 + 长度上限 + 去重）；
- 写入前先 `parse` 当前值，避免旧数据形状把新代码带崩；
- 大集合设上限（如 10 万条）并在超限时报错，而不是无限增长；
- 域打开了就别在别处再存一份同样的数据。

## 2. 插件设置文件（少量、单机）

位置：`$DSH_HOME/<plugin>/settings.json`（`DSH_HOME` 默认 `~/.dsh`）。

```js
async function replaceTextFile(file, next) {
  await mkdir(dirname(file), { recursive: true })
  const nonce = `${process.pid}.${randomUUID()}`
  const tmp = `${file}.${nonce}.tmp`
  const backup = `${file}.${nonce}.bak`
  await writeFile(tmp, next, 'utf8')
  try {
    await rename(tmp, file)                 // 原子替换
    return
  } catch (error) {
    if (!['EEXIST', 'EPERM', 'EACCES'].includes(error.code)) { await unlink(tmp).catch(() => {}); throw error }
  }
  await rename(file, backup).catch(() => {}) // Windows 上目标被占用时走备份
  try {
    await rename(tmp, file)
  } catch (error) {
    await rename(backup, file).catch(() => {})
    await unlink(tmp).catch(() => {})
    throw error
  }
  await unlink(backup).catch(() => {})
}
```

再叠一个**串行写队列**，避免并发读改写丢更新：

```js
let queue = Promise.resolve()
const enqueue = (task) => (queue = queue.then(task, task))
```

## 3. 选择表

| 需求 | 选择 | 原因 |
|---|---|---|
| 收藏、开关、最近列表 | 设置文件或 domain.global | 量小、单机 |
| 多条目、要按 key 查 | `tables` | 结构化 |
| 跨设备/团队共享 | 不要用本地文件 | 需要外部服务 |
| 大量二进制 | 附件服务，不是 domain | 二进制不进 JSON |
| 用户在设置页改的参数 | `Config`（Schemastery） | 自动表单 + 层覆盖 |

## 4. 迁移

```js
const spec = defineDomain({ name: 'my_plugin_state', version: 2, tables: {}, global: { schema, initial } })
```

- 版本号只增不减；
- 迁移逻辑放 Host 启动期，幂等，可重入；
- 迁移失败要保留旧数据并明确报错，不要“清空重来”。

## 5. 反模式

| 反模式 | 后果 |
|---|---|
| 直接写 `~/.dsh/sessions/**` | 升级即损坏 |
| 用 `writeFile` 覆盖设置 | 断电/占用丢配置 |
| 多处各存一份状态 | 不一致 |
| 无限增长的数组 | 启动变慢、内存涨 |
| 明文存密钥 | 泄漏；用 `credentials` 或 env 名 |

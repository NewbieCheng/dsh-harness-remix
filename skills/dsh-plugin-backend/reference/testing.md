# 测试、诊断与发布

> 规则只有一条：**测试里不允许出现真实模型调用、真实用户目录、真实网络**。
> 历史 bug 大多不是“逻辑错”，是“顺序/形状假设错”——所以断言要针对形状与顺序。

## 1. 测试骨架

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('settings file survives a partial write', async () => {
  const home = await mkdtemp(join(tmpdir(), 'my-plugin-'))
  process.env.DSH_HOME = home
  try {
    // …调用被测函数
    assert.equal(await readSettings(), expected)
  } finally {
    await rm(home, { recursive: true, force: true })
    delete process.env.DSH_HOME
  }
})
```

```sh
node --test tests/*.test.mjs
```

## 2. 假宿主（测 apply/effect/dispose）

```js
function fakeCtx(services = {}) {
  const disposers = []
  const ctx = {
    effect(setup, label) {
      const dispose = setup()
      disposers.push({ dispose, label })
      return () => dispose?.()
    },
    get(key) { return services[key] },
    on() {}, emit() {},
    logger: { warn() {}, info() {} },
    ...services,
  }
  return { ctx, disposeAll: () => disposers.reverse().forEach((d) => d.dispose?.()) }
}
```

断言：注册了路由 → `disposeAll()` 后路由被释放；重复 apply 两次 → 第二次抛“已注册”或幂等。

## 3. 假边车（测 ACP/子进程）

- 写一个 `fake-agent.mjs`：读 stdin 的 JSON-RPC，按脚本回 `session/new` / `session/update` / 错误帧；
- 用 `spawn(process.execPath, ['fake-agent.mjs'])` 起，**不要**碰真 `dsh --profile acp`；
- 覆盖：乱序帧、半包、stderr 噪声、进程中途退出、超时。

## 4. 该测什么（按优先级）

| 优先 | 用例 |
|---|---|
| 1 | 参数校验：空、超长、类型错、数组里混脏数据 |
| 2 | 状态机：重复注册、卸载后重注册、并发写 |
| 3 | 失败路径：文件被占用、JSON 损坏、目标不存在 |
| 4 | 形状：事件/结果的字段名与嵌套（对齐 inspect 或真机日志） |
| 5 | 安全：拒绝非 loopback / 非 same-origin / 无自定义头 |

## 5. 诊断接口与日志

```js
POST /api/my-plugin/diagnose { "sessionId": "…" }
→ 200 { ok: true, checks: […], lastError: null }
```

日志用 JSON Lines，一条一个事件：

```json
{"event":"route-mount","path":"/api/my-plugin/health"}
{"event":"typert-register","package":"my-plugin","invocations":3}
{"event":"unsupported-host","detail":"slot conversation.input.right missing"}
```

**脱敏**：不写密钥、token、完整 prompt、用户文件内容；路径只留 basename。

## 6. 发布前

```sh
pnpm pack --dry-run          # 确认 files 里有 lib/、cordis.patch.yml、locale
dsh plugin --profile staging add ./my-plugin-0.1.0.tgz
dsh --profile staging --dump-config | grep -A3 my-plugin
```

- `engines.dsh` 必须写；
- 发布说明里写“验证过的 DSH 版本 + 需要重启”；
- 破坏性变更（返回形状、存储 schema）要升 minor 并在 COMPAT 标注。

## 7. 不要做

- ❌ 测试里连真模型、真网络；
- ❌ 用 `process.cwd()` 当数据目录；
- ❌ 断言“日志里有一行字”（日志会变）；
- ❌ 只测 happy path 就宣布完成。

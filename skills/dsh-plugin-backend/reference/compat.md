# 版本兼容、生效与回退（后端）

> Host 侧比 UI 侧稳定，但“服务签名、清单字段、配置投影”仍会变。
> 原则：**能力探测优先于版本判断；可回退优先于兼容分支。**

## 1. 生效矩阵

| 改了 | 要做什么 | 判据 |
|---|---|---|
| Host 源码（ESM） | `touch` 被 import 的模块 → 重载插件 → 刷新 | 新日志/新行为出现 |
| 被引入的模块 | 同样要 `touch` | 只改入口没用 |
| `cordis.patch.yml` | `dsh plugin add` 重新应用，或重启 Host | `--dump-config` 里那层变了 |
| 客户端源码 | 重新 build → 刷新 | `lib/client.js` mtime 变了 |
| `Config` schema | 重载 Host | `config` inspect 里字段变了 |
| 依赖升级 | `dsh plugin add <pkg>@x` | `package.json` + 行都在 |

**重载不是“日志有 host-start”**：看 `startedAt`/pid 是否变化，或你的 effect 清理是否真的跑过。

## 2. `engines.dsh`

```json
"engines": { "dsh": ">=0.2.0-rc.1 <0.3.0-0" }
```

- 安装与 profile 启动都会检查；
- 没有 `engines.dsh` 时回退检查 `@deepseek-ai/dsh*` 的 peer 范围；
- **不要写 `*`**，那等于没有闸门。

## 3. 能力探测模板

```js
/** 可选服务 + 方法存在性，两者都满足才用。 */
export function optional(ctx, key, method) {
  const service = ctx.get?.(key)
  return service && typeof service[method] === 'function' ? service : undefined
}

/** 需要“等就绪”而不是“现在没有”。 */
export function whenReady(ctx, deps, callback) {
  ctx.inject(deps, (c) => callback(c))
}
```

```js
export function apply(ctx) {
  const typert = optional(ctx, 'typert', 'register')
  if (typert === undefined) {
    ctx.logger?.warn?.('my-plugin: typert missing, RPC disabled')
  } else {
    ctx.effect(() => typert.register(CONTRIBUTION), 'my-plugin: typert')
  }
}
```

## 4. 已知版本差异（后端）

| 能力 | 0.2.1-rc.2 | 0.2.2-rc.3 | 处理 |
|---|---|---|---|
| 客户端槽基数 | single/list/keyed/chain | 增加 `hoc` | 只影响 UI 半 |
| `settings.section.icon` | 不存在 | 存在 | 注册前探测 |
| `contextMenu.*` | 不存在 | 存在 | 同上 |
| `webServer.register` 返回 disposer | 是 | 是 | 稳定 |
| `connection.requestRejection` | 是 | 是 | 稳定 |
| typert 客户端调用 | 观察到 | 观察到 | 用 client inspect 确认 |

## 5. 升级后的固定动作

```text
1) dsh --version
2) host/Service inspect 对比你用的服务签名（尤其是参数顺序）
3) host/Config inspect 看自己的行是否仍被正确投影
4) 重载 → 看诊断日志有没有 unsupported-host / register-failed
5) 跑测试（假宿主）
6) 真机：健康接口、前端数据、停用恢复
7) 更新 COMPAT.md
```

## 6. 回退策略

| 情况 | 回退 |
|---|---|
| 新服务不存在 | 关闭该功能，日志一条 `unsupported-host`，其余功能照常 |
| 签名变了 | 按方法存在性分支；不要 `try/catch` 吞掉所有错误 |
| 存储 schema 变了 | 升 version + 迁移；失败保留旧数据 |
| 插件整体不可用 | 用户 `dsh plugin remove`，或 patch 里 `disabled: true`；确认官方行未被你改坏 |

## 7. 不要做

- 不要按版本号写一堆 if/else（优先探测能力）；
- 不要用 `try/catch {}` 静默吞掉注册失败；
- 不要在运行时动态改 `package.json`/patch 文件（用户配置归用户）；
- 不要把“在我机器上能跑”当兼容性结论。

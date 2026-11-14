# 版本兼容与升级

> DSH 的界面在动。本仓库的立场：**不追求“所有版本通用”，追求“升级后可验证、可回退”**。
> 基线见根目录 `COMPAT.md`；槽位清单由 `scripts/extract-slots.mjs` 生成。

## 1. 版本矩阵（本仓库已核对）

| DSH | 槽位数 | 基数种类 | 核对方式 |
|---|---|---|---|
| 0.2.2-rc.3（运行中） | **116** + 13 Factory | single/list/keyed/chain/**hoc** | `client/Slots` live inspect |
| 0.2.1-rc.2（源码快照） | 100 | single/list/keyed/chain | 生成的 `slot-catalog.ts` |

差异不是“多几个槽”这么简单：0.2.2 多出 `hoc` 基数、`conversation.hero.frame`、`conversation.chat.markdown.fence`、`sidebar.session.action` 等整类扩展点。
**结论：只读源码会漏扩展点，必须 inspect 运行中实例。**

## 2. 生效矩阵（改完为什么没生效）

| 改了 | 构建 | 生效 |
|---|---|---|
| 后端源码（纯 ESM） | 否 | Host 重载 + 刷新；被 import 的模块先 `touch` |
| 客户端源码 | **是** | 刷新页面（HMR 可用时自动） |
| `cordis.patch.yml` | 否 | 重新 `dsh plugin add` 或重启 Host |
| 运行时注入的 CSS/JS | 否 | 保存 + 刷新 |
| 插件安装/升级 | — | 按管理器 `nextStep`，需要时重启 |

`touch` 的原因：加载器只重新求值 mtime 变了的模块；没 touch 的引入方继续用旧 import，症状就是“改了没生效”。

## 3. 升级 DSH 后的固定流程

```text
1) dsh --version                                   # 记录新版本
2) cordis_inspect_query client/Slots listSubTree    # 存成 slots.tree.json
3) node scripts/extract-slots.mjs --from-inspect slots.tree.json --version <新版本>
4) git diff skills/dsh-ui-extension/reference/slots.generated.md
5) 逐条处理 diff：新增=补区域导航；删除=删配方；kind/risk 变化=改方案
6) node scripts/verify-skills.mjs                   # 文档里的槽名必须都还存在
7) 真机跑一遍配方 1/3/7/9（品牌、输入框、设置、全屏）
8) 更新 COMPAT.md
```

## 4. 兼容策略

| 场景 | 策略 |
|---|---|
| 插件要跨多个 DSH 小版本 | 在 `package.json` 写 `engines.dsh`，例如 `">=0.2.0-rc.1 <0.3.0-0"` |
| 用到了新版本才有的槽 | 注册前 `ctx.slots` 探测；没有就降级隐藏入口，不要抛错 |
| 宿主的 DOM/结构变化 | 只依赖 `data-*` 与 `[class*="_local"]`；升级后先跑自检清单 |
| 官方服务签名变化 | 用 `ctx.get()` 取可选服务 + 方法存在性判断 |
| 完全无法兼容 | 明确关闭功能并在诊断里报一条 `unsupported-host`，而不是静默失败 |

## 5. 探测模板

```js
/** 宿主有这个槽才挂；没有就退化成无入口，不报错。 */
function hasSlot(ctx, key) {
  try {
    return typeof ctx.slots?.entries === 'function' && ctx.slots.entries(key).length >= 0
  } catch { return false }
}

/** 可选服务：取不到就降级。 */
function optionalService(ctx, key, method) {
  const service = ctx.get?.(key)
  return service && typeof service[method] === 'function' ? service : undefined
}
```

## 6. 不要做

- 不要根据版本号写 if/else 分支堆逻辑——优先能力探测；
- 不要把 `priority` 当版本兼容手段；
- 不要为了兼容旧版保留已删除槽的注册（会抛错），用 `try/catch` 也要留一条 `console.warn`；
- 不要在文档里写死“共 N 个槽”，改成引用生成表。

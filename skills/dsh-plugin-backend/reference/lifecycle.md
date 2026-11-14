# Cordis 生命周期与依赖注入

> DSH 的 Host 是一个 Cordis 应用：每一行配置是一个 **plugin**，每个 plugin 跑在一个 **fiber** 里。
> 你写的不是“一个函数”，是“一个有依赖、有清理、可被卸载重载的单元”。

## 1. 插件形态

```js
// 命名导出式（Host 半最常用）
export const name = 'my-plugin'
export const inject = ['webServer']
export function apply(ctx, config) { /* … */ }

// 对象式（需要 control/自定义时）
export default {
  name: 'my-plugin',
  inject: { required: ['webServer'], optional: ['typert'] },
  apply(ctx, config) { /* … */ },
}
```

| 导出 | 作用 |
|---|---|
| `name` | 诊断与冲突提示里显示的名字 |
| `inject` | 硬依赖；缺失 → 该 fiber 等待/失败，不会拿到 `undefined` |
| `Config` | Schemastery schema；Loader 用它校验并填默认值 |
| `apply` | 同步、轻量；所有注册在这里发生 |

## 2. 三个生命周期原语

```js
export function apply(ctx) {
  // 1) effect：注册 + 清理成对出现
  ctx.effect(() => {
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, 'my-plugin: ticker')

  // 2) 异步初始化：effect 里返回 promise 不会被等待，显式 await
  ctx.effect(() => {
    let cancelled = false
    void (async () => {
      const data = await load()
      if (!cancelled) use(data)
    })()
    return () => { cancelled = true }
  }, 'my-plugin: bootstrap')

  // 3) 等依赖就绪再挂
  ctx.inject(['typert'], (c) => {
    const dispose = c.typert.register(CONTRIBUTION)
    return dispose
  })
}
```

规则：
- **一个 effect 一个关注点**，label 写清“谁在做什么”，诊断里靠它定位；
- effect 的清理函数必须幂等（重载会再调一次）；
- 不要用全局变量/`process.on('exit')` 做清理。

## 3. 服务：定义与消费

```js
import { Service } from '@deepseek-ai/cordis'

export class MyService extends Service {
  constructor(ctx) {
    super(ctx, 'myService')       // 服务键
  }
  async doThing(input) { /* … */ }
}

// 在插件里提供
export function apply(ctx) {
  ctx.effect(() => new MyService(ctx), 'my-plugin: service')
}

// 消费（硬依赖写在 inject，软依赖用 get）
const mine = ctx.get('myService')
```

- 服务键就是 `ctx.<key>`；同名多个提供者会冲突，先查 `host/Service` inspect；
- **不要替换官方服务来“增强”**：包一层、留原方法引用、可还原（见 `conflict-matrix.md` C1）。

## 4. 事件

| 模式 | 写法 | 用途 |
|---|---|---|
| emit | `ctx.on('session/event', (session, event) => {})` | 观察 |
| waterfall | `ctx.on('tools/pre-execute', async (exec, next) => decision)` | 策略拦截，返回值可改流程 |
| guard | `ctx.tools.guard(fn)` | 单调拒绝，不能反悔 |

事件名与签名用 `host/Event` inspect 查，不要背。

## 5. 配置

```js
import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  timeoutMs: Schema.number().default(30000),
  mode: Schema.union(['fast', 'accurate']).default('fast'),
})

export function apply(ctx, config) { /* config 已校验、已填默认 */ }
```

- 凡是“不同部署可能要改”的值都做成配置字段；
- 不要导出普通对象当 `Config`（不满足 Standard Schema）；
- 配置改了 → `settings/document-updated`，表单会自动刷新。

## 6. 卸载与重载

- 卸载 fiber：所有 effect 清理逆序执行；路由、定时器、子进程都该消失；
- 重载判据不是“日志里有 host-start”，而是你的清理真的跑过；
- 开发期改 Host 源码：先 `touch` 被 import 的模块，再重载（加载器只重估 mtime 变了的模块）；
- 插件**不是热加载**：管理器返回 `restart-required` 时如实报告。

## 7. 反模式

| 反模式 | 后果 |
|---|---|
| 顶层读文件/建连接 | 测试无法隔离、重载泄漏 |
| `inject` 写可选服务 | 该环境缺失时整个插件起不来 |
| 注册不返回 disposer | 二次启用即冲突 |
| 用 `process.exit` 收尾 | 沙箱/宿主一起挂 |
| 在 `apply` 里 await 长任务 | 启动被拖死 |

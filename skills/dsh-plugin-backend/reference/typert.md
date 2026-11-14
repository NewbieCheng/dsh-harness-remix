# typert：类型化 RPC

> 前端调 Host 的第一选择。比手写 HTTP 强的地方：**方法签名、参数 codec、业务对象 lookup 都在注册表里**，调用方不需要解析自由 JSON。
> 本文的 Host 侧写法实测自 Archive Manager 1.3.6；客户端的确切调用方式随版本变化，标了 ⛔ 的地方必须自己 inspect 验证。

## 1. 它解决什么

```text
浏览器 ──(channel /api)──> typertGateway ──> Service 方法
                 ↑
         registry: { package, model, invocations[] }
```

- 注册表只描述“能调什么、参数是什么类型”；
- 真正调用由 `typertGateway` 分发到你注册的服务实例；
- 结果 codec 负责编码/解码（含二进制字段）。

## 2. Host 侧最小写法

```js
// 1) 描述一个方法
const inputSchema = {
  parse(input) {
    if (typeof input?.sessionId !== 'string') throw new TypeError('sessionId required')
    return { sessionId: input.sessionId }
  },
}

const codec = (typeSymbol, schema) => ({ mode: 'strict', typeSymbol, create: () => schema, schema })

const INVOCATIONS = [{
  id: 'my-plugin#myService/doThing',
  service: 'myService',
  namespace: 'myService',
  method: 'doThing',
  invocation: { kind: 'direct' },
  parameters: [{ name: 'input', wire: 'input', source: 'json', codec: codec('my-plugin/types#Input', inputSchema) }],
  result: codec('my-plugin/types#Output', outputSchema),
  sourceLocation: { file: 'my-plugin/lib/service.js', line: 1, column: 1 },
}]

const CONTRIBUTION = {
  package: 'my-plugin',
  face: 'host',
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: INVOCATIONS,
}

export function apply(ctx) {
  ctx.effect(() => ctx.typert.register(CONTRIBUTION), 'my-plugin: typert')
}
```

```js
// 2) 服务方法要能被远程调用：标记 + 绑定
import { Remote, bindTypertRemote } from '@deepseek-ai/dsh-typert-protocol'

export class MyService extends Service {
  static inject = ['storageDomain']
  constructor(ctx) {
    super(ctx, 'myService')
    this.typertRemote = bindTypertRemote(this, this.name)
  }
  async doThing(input) { /* … */ }
}
// 给方法加 Remote 标记（第一方包由生成器写，第三方可手写）
Remote('doThing')(MyService.prototype.doThing, { kind: 'method', name: 'doThing', static: false, private: false })
```

要点：
- `service` 必须与 Cordis 服务键一致，否则网关找不到实例；
- `parameters[].wire` 是 wire 名，**客户端传的是这个名**；
- `source: 'json'` 表示普通 JSON；业务对象要用 lookup（见 `TypertLookupMap`），不确定就转成 JSON；
- 返回形状变化 = 破坏性变更，加字段可以，改字段名不行。

## 3. 客户端侧

```js
export const inject = ['remote']

export async function apply(ctx) {
  const remote = ctx.get('remote')
  if (remote === undefined) return
  const dispose = await remote.$mount(MY_REMOTE_DESCRIPTORS)   // 同一个 { package, descriptors } 形状
  return dispose
}
```

- 挂载后才可按 `service.method(...)` 调用；
- ⛔ **具体调用表达式以运行中宿主为准**：用 `client/Service` inspect 看 `remote` 服务的成员，或在动态包里试一次；
- 不要把 descriptor 里的 `id` 当 URL 用。

## 4. 什么时候不要用 typert

| 场景 | 用什么 |
|---|---|
| 健康检查、静态文件、SSE | Web 路由 |
| 写本地小设置（单机） | 路由 + 四件套鉴权（见 `routes-auth.md`） |
| 给模型调用的能力 | `ctx.tools.register()` |
| 跨进程/外部协议 | 子进程边车（`acp.md`） |

## 5. 版本与验证

| 项 | 状态 |
|---|---|
| `ctx.typert.register(contribution)` | ✅ 源码 + 真实插件 |
| `{ mode:'strict', typeSymbol, create, schema }` codec | ✅ Archive Manager 1.3.6 |
| `Remote()` 标记 + `bindTypertRemote(service, name)` | ✅ 同上 |
| 客户端 `remote.$mount(...)` | 🟡 观察到，未在第三方最小工程复现 |
| 客户端调用表达式 | ⛔ 待验证（用 inspect 确认后再写进代码） |

验证命令：

```text
cordis_inspect_query { platform:"client", provider:"Service", method:"listService", input:{ service:"remote" } }
cordis_inspect_query { platform:"host",   provider:"Service", method:"listService", input:{ service:"typert" } }
```

## 6. 反模式

- 用 typert 传大文件/流（用附件或路由流式）；
- 一个方法塞五种语义（应按参数分支拆方法）；
- 不做输入校验就信任 `input`（codec 只保证形状，不保证业务规则）；
- 把密钥/凭据放进返回值。

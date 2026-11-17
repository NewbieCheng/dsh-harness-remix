# Web 路由与鉴权

> 路由适合：健康检查、本地设置、静态资源、SSE。
> 选择 RPC 或路由取决于调用方、流式需求和实际宿主契约；类型与 codec 不替代身份认证、操作授权及资源归属检查。参见 [`typert.md`](typert.md)。

## 1. 注册

```js
export const inject = ['webServer', 'connection']

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'exact',                       // 'exact' | 'prefix'
    path: '/api/my-plugin/status',       // 绝对路径，无尾斜杠
    handler(request, response) { /* 自己管完整响应 */ },
  })
  ctx.effect(() => dispose, 'my-plugin: status route')
}
```

| 规则 | 说明 |
|---|---|
| 一次一个路由 | 多个路由多次 `register` |
| 同名 `(kind, path)` 抛错 | 注册前判重，或保证卸载真的跑过 |
| 顺序无关 | 先 exact，再最长 prefix，最后 fallback |
| 一个 fallback 座位 | 只有 SPA dist 该占；插件不要抢 |
| handler 自己持响应 | 可以挂住（SSE），dispose 时连接要能断 |

## 2. 鉴权三层

```js
function guard(ctx, request, response) {
  // 第 1 层：Connection 的 Host/Origin/会话校验
  const rejection = ctx.connection.requestRejection(request)
  if (rejection !== undefined) { response.writeHead(rejection).end(); return false }

  // 第 2 层（要区分“是不是已认证浏览器”时）：拿 peer 比对
  const admission = ctx.connection.admit(request)
  if ('rejection' in admission) { response.writeHead(admission.rejection).end(); return false }
  if (admission.peer.id !== ctx.connection.browserPeer.id) {
    response.writeHead(403).end('BROWSER_REQUIRED'); return false
  }

  // 第 3 层：业务参数（下面 §3 单独讲）
  return true
}
```

> `requestRejection()` 的确切信任检查以当前宿主契约为准；需要识别或授权 Peer 时使用宿主支持的 admission 接口。不要假设所有认证凭据都是浏览器。
> 把 `headers` 包成对象再传给 `admit` 是错写法：它接受的是 request 本身。

## 3. 本地写操作的四件套

来自 Archive Manager 的实测实现，适用于“只允许本机页面写一个小设置”：

```js
const TRUSTED_HEADER = 'x-my-plugin-settings'

function isTrustedLocalRequest(request) {
  const header = (name) => {
    const value = request.headers?.[name]
    return Array.isArray(value) ? value[0] : value
  }
  if (header(TRUSTED_HEADER) !== '1') return false                       // ① 自定义头：挡跨站表单
  const remote = (request.socket?.remoteAddress ?? '').toLowerCase().replace(/^\[|\]$/g, '')
  if (!(remote === '::1' || remote.startsWith('127.') || remote.startsWith('::ffff:127.'))) return false  // ② loopback
  const site = header('sec-fetch-site')
  if (site !== undefined && site !== 'same-origin') return false          // ③ 同源
  const host = header('host')
  if (!host) return false
  const origin = header('origin')
  if (!origin) return true                                                // 同源 GET 可能没有 Origin
  const url = new URL(origin)
  return url.host === host && (url.protocol === 'http:' || url.protocol === 'https:')  // ④ Origin==Host
}
```

自定义头同时是**CSRF 的开关**：浏览器跨站请求带不了它，除非预检通过。

## 4. 请求体

```js
function readJsonBody(request, limit = 64 * 1024) {
  return new Promise((resolve) => {
    const chunks = []
    let bytes = 0
    let invalid = false
    request.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes > limit) { invalid = true; chunks.length = 0; return }
      if (!invalid) chunks.push(chunk)
    })
    request.on('end', () => {
      if (invalid) { resolve(null); return }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { resolve(null) }
    })
    request.on('aborted', () => resolve(null))
    request.on('error', () => resolve(null))
  })
}
```

## 5. 幂等注册（重载安全）

注册只管理插件自己的路由，保存 disposer 并在卸载时调用；发生冲突应诊断所有者，不反射修改宿主内部表或删除其他插件的路由。

## 6. SSE / 流式

```js
handler(request, response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  const timer = setInterval(() => response.write(`data: ${JSON.stringify(tick())}\n\n`), 1000)
  request.on('close', () => clearInterval(timer))       // 客户端断开必须停
}
```

- 不要用长轮询替代 SSE；
- dispose 时要能主动结束所有挂住的响应，否则 Host 卸载会等连接。

## 7. 反模式

| 反模式 | 原因 |
|---|---|
| 只校验 `Origin` | 同源页面也能被 XSS 利用；缺 loopback/自定义头 |
| 把任意 URL 当上游 | SSRF |
| 路由里做长任务 | 应交给 jobs/子进程 |
| 用路由承载权限/凭据 | 注入层不承载安全边界 |
| 不设 `cache-control: no-store` | 中间层缓存鉴权结果 |

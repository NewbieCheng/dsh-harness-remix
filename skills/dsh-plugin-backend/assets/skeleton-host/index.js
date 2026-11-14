/**
 * Minimal Host plugin.
 *
 * What it wires, and why each piece is here:
 * - `Config` — the user-editable knobs; DSH validates and projects a form.
 * - `storageDomain` — structured state with a schema, versioned, migrated.
 * - two routes — one read, one guarded write, both owned by `ctx.effect`.
 * - `ctx.get('typert')` — optional capability; when missing the plugin still works.
 */
import Schema from '@deepseek-ai/schemastery'
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import { localWriteRejection, normalizeGreeting, statusPayload } from './src/logic.js'
import { readSettings, updateSettings } from './src/settings.js'

export const name = 'dsh-hello-host'

export const inject = ['webServer', 'storageDomain', 'connection']

export const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('关闭后状态接口返回 503'),
  trustHeader: Schema.string().default('x-dsh-hello-host').description('本地写操作要求的自定义请求头'),
})

const stateDomain = defineDomain({
  name: 'hello_host_state',
  version: 1,
  tables: {},
  global: {
    schema: {
      parse(value) {
        const record = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
        return statusPayload(record)
      },
    },
    initial: { ok: true, greeting: 'hello', hits: 0 },
  },
})

/** Read the JSON body with a hard size cap; `null` means "not a JSON object". */
function readJsonBody(request, limit = 16 * 1024) {
  return new Promise((resolve) => {
    const chunks = []
    let bytes = 0
    request.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes <= limit) chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null)
      } catch {
        resolve(null)
      }
    })
    request.on('error', () => resolve(null))
  })
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

export function apply(ctx, config) {
  let domain
  let opening
  const opened = () => {
    opening ??= ctx.storageDomain.open(stateDomain).then((value) => {
      domain = value
      return value
    })
    return opening
  }

  ctx.effect(() => {
    void opened().catch((error) => {
      ctx.logger?.warn?.(`dsh-hello-host: storage domain failed: ${String(error?.message ?? error)}`)
    })
    return () => { domain = undefined }
  }, 'dsh-hello-host: storage domain')

  const routes = [
    {
      kind: 'exact',
      path: '/api/dsh-hello-host/status',
      async handler(request, response) {
        const rejection = ctx.connection.requestRejection(request)
        if (rejection !== undefined) { response.writeHead(rejection).end(); return }
        if (!config.enabled) { sendJson(response, 503, { ok: false, error: 'disabled' }); return }
        const gate = await opened().catch(() => undefined)
        if (gate === undefined) { sendJson(response, 503, { ok: false, error: 'storage unavailable' }); return }
        const state = statusPayload(gate.global.get())
        await gate.global.set({ ...state, hits: state.hits + 1 })
        await updateSettings((current) => ({ ...current, lastSeen: new Date().toISOString() })).catch(() => {})
        sendJson(response, 200, state)
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-hello-host/greeting',
      async handler(request, response) {
        if (request.method !== 'POST') {
          response.writeHead(405, { allow: 'POST' }).end()
          return
        }
        const rejection = ctx.connection.requestRejection(request)
        if (rejection !== undefined) { response.writeHead(rejection).end(); return }
        const denial = localWriteRejection(request, { headerName: config.trustHeader })
        if (denial !== undefined) { sendJson(response, 403, { ok: false, error: denial }); return }
        const body = await readJsonBody(request)
        if (body === null) { sendJson(response, 400, { ok: false, error: 'invalid json body' }); return }
        let greeting
        try {
          greeting = normalizeGreeting(body.greeting)
        } catch (error) {
          sendJson(response, 400, { ok: false, error: String(error.message ?? error) })
          return
        }
        const gate = await opened().catch(() => undefined)
        if (gate === undefined) { sendJson(response, 503, { ok: false, error: 'storage unavailable' }); return }
        const state = statusPayload(gate.global.get())
        const next = { ...state, greeting }
        await gate.global.set(next)
        sendJson(response, 200, next)
      },
    },
  ]

  for (const route of routes) {
    ctx.effect(() => ctx.webServer.register(route), `dsh-hello-host: ${route.path}`)
  }

  // Optional capability: the plugin works without it, and says so once.
  const typert = ctx.get('typert')
  if (typert === undefined) {
    ctx.logger?.info?.('dsh-hello-host: typert not available, RPC layer skipped')
  }

  ctx.logger?.info?.(`dsh-hello-host: ready (${routes.length} routes, enabled=${config.enabled})`)
}

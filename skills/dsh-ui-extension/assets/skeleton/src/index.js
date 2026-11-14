/**
 * Host half of the minimal UI plugin.
 *
 * It owns one authenticated route. The point is the shape, not the feature:
 * - `inject` names the services this plugin cannot work without;
 * - the route is registered once and its disposer is owned by `ctx.effect`,
 *   so unloading the fiber really removes the route;
 * - the handler asks Connection for a rejection instead of re-implementing
 *   Origin/Host/session checks.
 */
export const name = 'dsh-hello-ui'

export const inject = ['webServer', 'connection']

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'exact',
    path: '/api/dsh-hello-ui/health',
    handler(request, response) {
      const rejection = ctx.connection.requestRejection(request)
      if (rejection !== undefined) {
        response.writeHead(rejection).end()
        return
      }
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      response.end(JSON.stringify({ ok: true, plugin: 'dsh-hello-ui' }))
    },
  })

  ctx.effect(() => dispose, 'dsh-hello-ui: health route')
}

/**
 * Client half: two additive seats, no imports beyond React.
 *
 * Rules this file demonstrates:
 * - `inject: ['slots']` — without it the seat is withheld;
 * - every registration is wrapped in `ctx.slots.inject(key, ...)` because the
 *   slot only exists while the entry that declares it is mounted;
 * - list seats pass `id` + `order`; a single seat would pass neither;
 * - the component is plain `createElement`, so nothing here needs a JSX build.
 */
import { createElement as h } from 'react'

export const name = 'dsh-hello-ui-client'

export const inject = ['slots']

const BUTTON = 'dsh-hello-ui.hello'
const SECTION = 'dsh-hello-ui'

export function apply(ctx) {
  ctx.slots.inject('conversation.input.right', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.right',
        id: BUTTON,
        order: 900,
        label: () => 'Hello',
      },
      () =>
        h(
          'button',
          {
            type: 'button',
            'data-dsh-hello-ui': '',
            title: 'dsh-hello-ui',
            style: {
              height: 24,
              padding: '0 8px',
              borderRadius: 6,
              border: 0,
              cursor: 'pointer',
              background: 'var(--dsw-alias-bg-layer-2)',
              color: 'var(--dsw-alias-label-primary)',
            },
            onClick: () => window.dispatchEvent(new CustomEvent('dsh-hello-ui:pressed')),
          },
          'Hi',
        ),
    ),
  )

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: SECTION,
        order: 900,
        label: () => 'Hello UI',
      },
      () =>
        h(
          'div',
          { 'data-dsh-hello-ui': '', style: { padding: 16, color: 'var(--dsw-alias-label-primary)' } },
          'Hello from a DSH plugin. Replace this section with your own settings UI.',
        ),
    ),
  )
}

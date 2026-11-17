# DSH 插槽能力索引（自动生成）

> 由 `scripts/extract-slots.mjs` 生成，勿手改。基线：**DSH 0.2.2-rc.3**，采集 2026-11-14。
> 运行中宿主共 **116 个槽 + 13 个 Factory**。升级 DSH 后：重跑生成器 → 看 diff → 改文档。

## 怎么读这张表

| 列 | 含义 | 使用时必须知道的事 |
|---|---|---|
| 类型 | 单占/列表/键控/竞选/包裹 | 列表才可“加”；单占注册前先确认能否替换 |
| 作用域 | root / session / session-maybe | session 槽只在有会话时存在 |
| 替换风险 | 可加 / 替换 / 包裹 | 替换风险依实际占位和注册语义判断；列表重用已有 id 也可能替换 |
| 声明者 | 谁挂了才存在（`父：` 表示由该父槽的 entry 声明，包名待采集） | 声明者没挂载时注册会抛错，要用 `ctx.slots.inject` 等 |

注意：`替换` 是**该槽的最坏情况**。单占槽若当前无人注册（例如 `sidebar.brand.mark`），直接注册就生效，不构成替换；
动手前用 `Slots.listSubTree { root: "<key>" }` 看它的 occupants，再决定是否需要显式 `priority`。

“用途”一列保留宿主原文（英文），避免二次翻译改变语义；决策看前三列即可。

注册选项：单占无 `id`；列表要 `id`（可选 `order`/`label`）；键控要 `key`；竞选要 `select`。
`priority` 只有“明确替换”时才写：数值越小越优先，同优先级重复注册直接抛错。

## 全表

| 槽 | 类型 | 作用域 | 替换风险 | 声明者 | 用途 |
|---|---|---|---|---|---|
| `contextMenu.content` | 键控 | root | 替换 | 父：`shell.overlay` | Optional React rows for existing extension positions; data contributions need no renderer. |
| `contextMenu.icon` | 键控 | root | 替换 | 父：`shell.overlay` | Business-owned glyph or image selected by the action's icon key. |
| `conversation.approval.detail` | 单占 | session | 替换 | client-ui-approval | Optional detail for the Tool call correlated with an approval request. |
| `conversation.chat.assistant-actions` | 列表 | session | 可加 | client-ui-chat | Ordered actions for one finalized assistant message. |
| `conversation.chat.commandview` | 键控 | session | 替换 | client-ui-chat | Command row keyed by the command name. |
| `conversation.chat.flow` | 单占 | session | 替换 | client-ui-chat | Ordered Chat rows and local echoes with viewport-bound visibility hooks. |
| `conversation.chat.markdown.fence` | 包裹 | session | 包裹 | 父：`conversation.view` | Language-keyed layers around one Markdown fence in the Chat flow; the content is the plain code… |
| `conversation.chat.message.images` | 单占 | session | 替换 | client-ui-chat | Renderer for one consecutive group of durable message images. |
| `conversation.chat.node` | 键控 | session | 替换 | client-ui-chat | Final Chat node renderer, keyed by `ChatNodeKind`. |
| `conversation.chat.reasoning.body` | 单占 | session | 替换 | client-ui-chat | Expanded reasoning body with raw and display-ready text. |
| `conversation.chat.text-interaction` | 键控 | session | 替换 | 父：`conversation.view` | Area-local text gestures and surfaces; each consumer registers its own synchronous admission. |
| `conversation.chat.turnTail` | 列表 | session | 可加 | client-ui-chat | Ordered feature contributions before a completed Turn's action row. |
| `conversation.chat.user.before` | 竞选 | session | 可加 | 父：`conversation.chat.node` | Message-source decoration owned and rendered by the user Node entry. |
| `conversation.chat.user.images` | 单占 | session | 替换 | client-ui-chat | User-message images, including pending and local-echo previews, independently replaceable from … |
| `conversation.composer` | 竞选 | session | 可加 | client-ui-conversation | Selector-routed replacements for the current Session's resident composer; fixed overlays must p… |
| `conversation.composer.bar` | 单占 | session-maybe | 替换 | client-ui-conversation | Resident composer body, including the no-Session inert state; fixed overlays must portal to the… |
| `conversation.composer.dock` | 列表 | session | 可加 | client-ui-conversation | Ambient entries below the composer card; fixed overlays must portal to the document body becaus… |
| `conversation.header` | 单占 | session-maybe | 替换 | client-ui-conversation | Resident navigation container, including when no Session is selected. |
| `conversation.header.leading` | 单占 | root | 可加 | client-ui-conversation | Global navigation before the Session title, available without a Session. |
| `conversation.hero.agentPreset` | 单占 | session-maybe | 替换 | client-ui-conversation | Agent-preset control staged for a New Session. |
| `conversation.hero.brand.mark` | 单占 | root | 可加 | client-ui-conversation | Brand mark shown before the blank-session headline. |
| `conversation.hero.frame` | 包裹 | root | 包裹 | 父：`conversation.content` | Layers wrapping the Conversation scroll body; `hero` reports a blank, standalone home. |
| `conversation.hero.options` | 列表 | session | 可加 | client-ui-conversation | Compact options right-aligned in the New Session row after the workspace and preset controls; r… |
| `conversation.hero.workspace` | 单占 | root | 替换 | client-ui-conversation | Workspace picker shown by the blank-session Hero. |
| `conversation.hero.workspace.directoryFlow` | 单占 | root | 替换 | client-ui-workspace | Directory-flow hole under the conversation empty-state picker (declared by the WorkspacePicker … |
| `conversation.input.activity` | 单占 | session | 替换 | client-ui-conversation | Compact action after the model selector; it can expand across the toolbar while retaining the e… |
| `conversation.input.attachments` | 单占 | session-maybe | 替换 | client-ui-conversation | Optional draft-attachment rail and drop target; fixed overlays must portal to the document body… |
| `conversation.input.dock` | 列表 | session | 可加 | client-ui-conversation | Full-width entries above the composer card; fixed overlays must portal to the document body bec… |
| `conversation.input.left` | 列表 | session | 可加 | client-ui-conversation | Compact controls at the left of the composer tool row; fixed overlays must portal to the docume… |
| `conversation.input.model` | 单占 | session | 替换 | client-ui-conversation | Model selector inside the composer tool row. |
| `conversation.input.model.label` | 单占 | session | 可加 | client-ui-model-selection | Non-interactive inline model label; selection controls remain owner-managed. |
| `conversation.input.model.options` | 列表 | session | 可加 | 父：`conversation.input.model` | Session options appended after model and reasoning controls in the root menu. |
| `conversation.input.overlay` | 列表 | session | 可加 | client-ui-conversation | Floating entries rendered inside the resident composer card; fixed overlays must portal to the … |
| `conversation.input.permission` | 单占 | session | 替换 | client-ui-conversation | Current-session permission control inside the composer tool row; fixed overlays must portal to … |
| `conversation.input.plan` | 单占 | session | 替换 | client-ui-conversation | Plan control inside the composer tool row; fixed overlays must portal to the document body beca… |
| `conversation.input.right` | 列表 | session | 可加 | client-ui-conversation | Compact controls before the composer submit action; fixed overlays must portal to the document … |
| `conversation.plan-review.actions` | 列表 | session | 可加 | client-ui-user-questions | Actions for the exact plan under review; approval remains with the question composer. |
| `conversation.session` | 单占 | session | 替换 | client-ui-conversation | Strict per-Session Conversation body. |
| `conversation.session.header` | 单占 | session | 替换 | client-ui-conversation | Strict per-Session title, actions, and View navigation. |
| `conversation.session.header.actions` | 列表 | session | 可加 | client-ui-conversation | Title-adjacent Session actions in ascending order; overflow is clipped and faded before the uti… |
| `conversation.session.header.actions.subagent.footer` | 列表 | session | 可加 | 父：`conversation.session.header.actions` | Content below the root Session's subagent tree. |
| `conversation.session.header.corner` | 单占 | session | 替换 | client-ui-conversation | The header's far-right corner, past the utilities' edge and into the header's own padding, for … |
| `conversation.session.header.lineage` | 单占 | session | 替换 | client-ui-conversation | Optional replacement for one Session breadcrumb title; overlays must portal because the title a… |
| `conversation.session.header.utilities` | 列表 | session | 可加 | client-ui-conversation | Right-aligned Session utilities in ascending order. |
| `conversation.session.header.views.actions` | 列表 | root | 可加 | 父：`conversation.session.header` | Rows of the View tab row's More menu; the header shows More only while this list has registrati… |
| `conversation.trajectory.images` | 单占 | session | 替换 | client-ui-trajectory | Renderer for one group of durable record images in the Trajectory ledger. |
| `conversation.user.text.node` | 键控 | session | 替换 | client-ui-conversation | One business-owned inline renderer for a pure JSON text node. |
| `conversation.view` | 列表 | session | 可加 | client-ui-conversation | Registered Conversation target Views, rendered one at a time. |
| `deliverables.file.actions` | 列表 | session | 可加 | client-ui-deliverables | Open one file through its authorized Session event coordinates. |
| `deliverables.review.file.actions` | 列表 | session | 可加 | client-ui-deliverables | The same file actions owned by a changed-file review tab. |
| `main` | 键控 | root | 替换 | client-ui-layout | Central panel selected by sidebar entry id. |
| `main.conversation` | 单占 | session-maybe | 替换 | client-ui-conversation | Conversation shell beneath its root-scoped main-panel entry. |
| `plugins.add.actions` | 列表 | root | 可加 | client-ui-plugin-manager | Additional MenuItemButton rows after installation: 72px high, with a title and a description ca… |
| `plugins.bundle.activation` | 键控 | root | 替换 | client-ui-plugin-manager | Optional guidance after the user enables a bundle from the list, keyed by npm package name. |
| `plugins.bundle.config` | 键控 | root | 替换 | client-ui-plugin-manager | A bundle's own configuration, keyed by the bundle's package name and rendered on the bundle's p… |
| `plugins.detail.actions` | 列表 | root | 可加 | client-ui-plugin-manager | Controls at the head of a detail page, before the page's own switch and uninstall, rendered wit… |
| `plugins.detail.badge` | 列表 | root | 可加 | client-ui-plugin-manager | Tags beside a detail page's title, after the version, beta, and problem tags the page draws its… |
| `plugins.detail.section` | 列表 | root | 可加 | client-ui-plugin-manager | Sections under a detail page's own content: after the source on a bundle's page, after the conf… |
| `plugins.item` | 列表 | root | 可加 | client-ui-plugin-manager | One official plugin the Plugins page lists in its Official group after the official bundles: `l… |
| `plugins.row.config` | 键控 | root | 可加 | client-ui-plugin-manager | The configuration of one row a bundle declares, keyed by `<package name>#<row id>` with the row… |
| `plugins.tab` | 列表 | root | 可加 | client-ui-plugin-manager | Tabs after the page's own Installed tab, such as Discover: `label` names the tab and `order` pl… |
| `rightbar` | 单占 | root | 替换 | client-ui-layout | The right column: a track the centre makes room for, or nothing. |
| `rightbar.session` | 单占 | session | 替换 | client-ui-sidebar-right | Session content selected by the root-scoped right Sidebar controller. |
| `root` | 单占 | root | 替换 | 运行时 | The built-in render-tree root hole (seeded by SlotCore): the one slot the shell itself renders,… |
| `settings.action` | 列表 | root | 可加 | client-ui-settings-general | Optional actions rendered in the content-column header before Close. |
| `settings.close` | 单占 | root | 替换 | client-ui-settings-general | The close button's visually-hidden label text (the button itself — icon, geometry, focus — is s… |
| `settings.general.item` | 列表 | root | 可加 | client-ui-settings-general | One preference row inside the General section — the additive seat for a single setting that nee… |
| `settings.header` | 单占 | root | 替换 | client-ui-settings-general | The panel title text seat. |
| `settings.launcher` | 单占 | root | 替换 | client-ui-settings-general | Optional sidebar account launcher; opens the shell-owned settings panel. |
| `settings.launcher.notifications` | 单占 | root | 替换 | 父：`settings.launcher` | Notifications anchored at the account menu; the contribution owns its markup and lifecycle. |
| `settings.models.footer` | 列表 | root | 可加 | client-ui-settings-models | Ordered extension area after the provider rows and the add controls. |
| `settings.models.provider-card` | 键控 | root | 可加 | client-ui-settings-models | One provider card's adapter extension area, dispatched with `entryKey = settingsNs` on every ca… |
| `settings.models.sign-in` | 单占 | root | 替换 | client-ui-settings-models | Optional account login choice before the credential editor. |
| `settings.onboarding` | 列表 | root | 可加 | client-ui-settings-general | Root-scoped onboarding steps contributed by settings features. |
| `settings.plugins.tab` | 列表 | root | 可加 | client-ui-settings-plugins | One page inside the Plugins settings section. |
| `settings.section` | 列表 | root | 可加 | client-ui-settings-general | One settings page per list entry. |
| `settings.section.icon` | 列表 | root | 可加 | 父：`sidebar.settings` | Optional navigation icons addressed by the matching settings.section id. |
| `settings.trigger` | 单占 | root | 替换 | client-ui-settings-general | The sidebar-foot trigger row content: icon + label, supplied as slot content (the accessible na… |
| `shell.bottom` | 单占 | root | 替换 | client-ui-layout | Full-width bottom content below all three columns. |
| `shell.leading` | 单占 | root | 替换 | client-ui-layout | Window-chrome seat at the frame's top-left, over every main panel. |
| `shell.overlay` | 列表 | root | 可加 | client-ui-layout | Frame-wide floating layer, above every column and outside their scroll containers. |
| `shell.quota-notice` | 竞选 | root | 可加 | client-ui-chat | Frame-wide quota notice chain. |
| `sidebar` | 单占 | root | 替换 | client-ui-layout | The whole left column. |
| `sidebar.brand.mark` | 单占 | root | 替换 | client-ui-sidebar | Brand mark rendered in the expanded brand row and collapsed rail. |
| `sidebar.brand.name` | 单占 | root | 替换 | client-ui-sidebar | Brand name rendered beside the expanded mark. |
| `sidebar.chat.conversation` | 单占 | session | 替换 | client-ui-subagent | Session-scoped Conversation occurrence hosted by one Sidebar chat tab. |
| `sidebar.footer.action` | 列表 | root | 可加 | client-ui-sidebar | Optional actions beside Settings at the sidebar foot. |
| `sidebar.panellist` | 列表 | root | 可加 | client-ui-sidebar | Global panel icons. |
| `sidebar.panellist.actions` | 列表 | root | 可加 | 父：`sidebar` | Rows of the panel list's More menu; the sidebar shows More only while this list has registratio… |
| `sidebar.right.pane.tab` | 键控 | session | 可加 | client-ui-sidebar-right | One tab's body, dispatched with the `id` of the type in force for `tab.kind`. |
| `sidebar.right.pane.tab.title` | 键控 | session | 可加 | client-ui-sidebar-right | A tab's title as its chip (and a floating panel's header) shows it, dispatched with the same ke… |
| `sidebar.right.tab.document` | 键控 | session | 可加 | client-ui-sidebar-documentpreview | Document body selected by a registered implementation id. |
| `sidebar.right.tab.document.action` | 键控 | session | 可加 | client-ui-sidebar-documentpreview | Renderer-specific controls before the document toolbar's reload button. |
| `sidebar.right.tab.document.actions` | 列表 | session | 可加 | client-ui-sidebar-documentpreview | Header toolbar contributions acting on the previewed file, rendered after the preview's own con… |
| `sidebar.right.tab.document.office.pdf` | 键控 | session | 可加 | client-ui-sidebar-documentpreview | PDF presentation supplied with Office-owned converted bytes. |
| `sidebar.right.tab.document.unpreviewable` | 列表 | session | 可加 | client-ui-sidebar-documentpreview | Empty-state contributions for a file this preview cannot render, offered where Retry would stan… |
| `sidebar.right.tab.files.actions` | 列表 | session | 可加 | client-ui-sidebar-files | Workspace directory actions after the `files` page's reload control. |
| `sidebar.right.tab.guide` | 竞选 | session | 可加 | client-ui-sidebar-right | The guide tab's body. |
| `sidebar.right.tab.guide.actions` | 列表 | root | 可加 | 父：`sidebar.right.pane.tab` | Rows of the guide's More menu; the guide shows More only while this list has registrations. |
| `sidebar.right.tab.guide.entry` | 键控 | session | 可加 | client-ui-sidebar-right | One provider's guide card, with the standard card as the owner's fallback. |
| `sidebar.right.tab.menu.item` | 列表 | session | 可加 | client-ui-sidebar-right | Extra items at the end of one tab's actions menu, in registration order. |
| `sidebar.session.action` | 包裹 | root | 包裹 | 父：`sidebar` | HOC layer around the inner content of the New-session row — the Tooltip and button the shell pa… |
| `sidebar.session.row.hover` | 列表 | root | 可加 | client-ui-workspace | Section of the Session row's hover card between its relative time and its trailing status line. |
| `sidebar.session.row.leading` | 列表 | root | 可加 | client-ui-workspace | Leading decoration of one Session row, in the 16px cell before the title that the row's own sta… |
| `sidebar.session.row.trailing` | 列表 | root | 可加 | 父：`sidebar.workspaces` | Non-interactive icons after the row's time label, before its pin marker, in ascending `order`. |
| `sidebar.settings` | 单占 | root | 替换 | client-ui-sidebar | The settings seat at the sidebar foot. |
| `sidebar.toggle.badge` | 单占 | root | 替换 | client-ui-sidebar | Non-interactive notification inside the collapsed sidebar expand button. |
| `sidebar.workspaces` | 单占 | root | 替换 | client-ui-sidebar | The workspace/session browsing region: section header, search, the grouped/flat session list, a… |
| `sidebar.workspaces.directoryFlow` | 单占 | root | 替换 | client-ui-workspace | Directory-flow hole under the sidebar browsing region (declared by the WorkspaceBrowser entry). |
| `sidebar.workspaces.session.menu.item` | 列表 | root | 可加 | client-ui-workspace | Legacy external Session menu rows, in ascending `order`, rendered together before the built-in … |
| `sidebar.workspaces.session.row.action` | 列表 | root | 可加 | client-ui-workspace | The hover buttons at the end of one Session row, in ascending `order`, after the "..." menu tri… |
| `tool.call.images` | 单占 | session | 替换 | client-ui-tool | Durable images of a settled image-bearing Tool call, rendered through the attachment presentati… |
| `tool.call.toolview` | 键控 | session | 替换 | client-ui-tool | Keyed Tool view dispatched by wire name, including custom tools. |
| `tool.view.cordis` | 键控 | session | 可加 | client-ui-cordis | Interactive Package-owned region rendered inside the latest eligible `cordis_run` card in the c… |
| `workspace.picker.directoryFlow` | 单占 | root | 替换 | 父：`workspace.picker` | Directory-flow hole under every `workspace.picker` Factory occurrence (declared by the Factory … |
| `workspace.toast` | 键控 | root | 替换 | client-ui-workspace | Workspace notices selected by their existing business discriminator. |

## Factory（不是槽，别注册）

这些名字出现在 `slots` 相关 API 里，但类型是 Factory：它们是**可复用组件定义**，不是落座点。

- `contextMenu.button`
- `conversation.approval.card`
- `conversation.chat.reasoning.content`
- `conversation.chat.user.content`
- `conversation.content`
- `conversation.images.content`
- `conversation.user.text`
- `sidebar.files.navigator`
- `sidebar.files.navigator.toggle`
- `sidebar.files.tree`
- `sidebar.panel.icon`
- `workspace.picker`
- `workspace.toast.content`

## 重新生成

```sh
# 1) 取实时树：cordis_inspect_query { platform:"client", provider:"Slots", method:"listSubTree" }
#    把整个返回 JSON 存成 slots.tree.json
node scripts/extract-slots.mjs --from-inspect slots.tree.json --version "$(dsh --version)"
node scripts/extract-slots.mjs --from-inspect slots.tree.json --check   # CI 用
```


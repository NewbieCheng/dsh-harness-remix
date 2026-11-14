# UI 配方（12 个）

> 每个配方：**目标 → 落座点 → 代码 → 坑 → 验收**。
> 所有槽名都可在 [`slots.generated.md`](slots.generated.md) 里查到；查不到就是版本不支持，先 inspect。

---

## 配方 1：换侧栏品牌

**落座点**：`sidebar.brand.mark` / `sidebar.brand.name`（单占，默认无 owner）。

```js
const Mark = ({ size = 24 }) =>
  React.createElement('div', {
    style: { width: size, height: size, borderRadius: 6, background: 'var(--dsw-alias-brand-primary)' },
  })

ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(
  { name: 'sidebar.brand.mark' }, Mark))
```

**坑**：展开态行高 42px、折叠 rail 36px，尺寸要跟；别在 mark 里放交互（它不是按钮）。
**验收**：展开/折叠、亮/暗、窄屏都正常。

---

## 配方 2：侧栏插件入口 + 主区面板

**落座点**：`sidebar.panellist`（列表）+ `main`（键控，key 与入口 id 一致）。

```js
const ID = 'my-panel'
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
  { name: 'sidebar.panellist', id: ID, order: 20, label: () => '我的面板' }, MyIcon))
ctx.slots.inject('main', () => ctx.slots.register(
  { name: 'main', key: ID }, MyPanel))
```

**坑**：`main` 一次只显示一个 entry，打开面板时会话不可见——必须给“返回会话”入口。
**验收**：开/关面板、切会话、缩放，面板状态不丢。

---

## 配方 3：输入框右侧加按钮（最常用）

**落座点**：`conversation.input.right`（列表）。

```js
ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
  name: 'conversation.input.right', id: 'my-plugin.quick', order: 100,
  label: () => '快捷指令',
  inject: () => ({ run: () => document.dispatchEvent(new CustomEvent('my-plugin:quick')) }),
}, ({ run }) => React.createElement('button', {
  type: 'button', 'data-my-plugin': '', onClick: run, title: '快捷指令',
}, '⚡')))
```

**坑**：工具行高度受限（约 28px）；不要拦截 Enter/Tab；禁用态要可见。
**验收**：有/无会话、发送中/空闲、窄屏都不挤。

---

## 配方 4：输入卡片上方的历史/建议条

**落座点**：`conversation.input.dock`（列表，整宽）+ `conversation.input.overlay`（列表，卡片内浮层）。

```js
ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(
  { name: 'conversation.input.dock', id: 'my-plugin.history', order: 50, label: () => '历史' }, HistoryBar))
```

**坑**：dock 会挤压消息区，给固定最大高度并允许折叠；联想文本要避开 IME 组合期。
**验收**：输入中文、删字、Esc 退出都正常；官方 placeholder 不被覆盖。

---

## 配方 5：会话头按钮

**落座点**：`conversation.session.header.actions`（列表）。

```js
ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
  { name: 'conversation.session.header.actions', id: 'my-plugin.review', order: 100, label: () => '评审' }, ReviewButton))
```

**坑**：这一行溢出会被裁切+淡出，弹层必须 portal 到 body。
**验收**：长标题、窄窗口时按钮不消失不重叠。

---

## 配方 6：一轮结束后追加贡献

**落座点**：`conversation.chat.turnTail`（列表）。

```js
ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register(
  { name: 'conversation.chat.turnTail', id: 'my-plugin.summary', order: 50, label: () => '本轮回执' }, TurnReceipt))
```

**坑**：渲染在官方动作行之前；不要在里面发请求（会随滚动反复挂载）。
**验收**：多轮对话、长会话滚动、切换模型都正常。

---

## 配方 7：设置页加一节

**落座点**：`settings.section`（列表）+ `settings.section.icon`（列表）。

```js
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: 'my-plugin', order: 45,
  label: () => '我的插件', icon: 'settings',
}, MySettingsSection))
```

**坑**：设置是弹窗，别在里面再开全屏；状态持久化走 Host 设置或 `localStorage`。
**验收**：设置能打开/关闭、切语言、暗色正常；重开设置值还在。

---

## 配方 8：插件详情页配置区

**落座点**：`plugins.bundle.config`（键控，key 用**自己的包名**）。

```js
ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
  { name: 'plugins.bundle.config', key: 'my-plugin' }, BundleConfigCard))
```

**坑**：只在详情页 `view:'page'` 渲染；配置读写要走 Host 路由或 typert，不要直接读文件。
**验收**：从插件管理点进自己的 Bundle，配置可见可存；停用后不报错。

---

## 配方 9：全屏工作台 + 留洞

**落座点**：`shell.overlay`（列表）+ `sidebar.footer.action`（列表）做入口；真正全屏用 portal。

```js
// 入口
ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
  { name: 'sidebar.footer.action', id: 'my-plugin.workbench', order: 10, label: () => '工作台' }, WorkbenchButton))

// 覆盖层：壳内（低于官方弹窗）
const Cover = () => ReactDOM.createPortal(
  React.createElement('div', { 'data-my-plugin': '', style: { position: 'fixed', inset: 0, zIndex: 1000 } }), document.body)
```

**留洞**（右侧保留原生会话）：

```css
[data-my-plugin='workbench'] { position: fixed; inset: 0 520px 0 0; z-index: 1000; }
```

**坑**：DSH 的 grid 是内联样式，改列宽要 `!important` 并监听 style 变化重贴；必须可 Esc 关闭并归还焦点。
**验收**：会话仍可输入/发消息；关掉后完全回到原生；弹窗不被盖。

---

## 配方 10：把 DSH 嵌进自己的壳

**做法**：`<iframe src="http://127.0.0.1:<port>/?token=...">`，token 只用一次，之后靠 cookie。

| 坑 | 处理 |
|---|---|
| `frame-ancestors` 没放行 → 白屏无报错 | Host 侧配置放行来源，或同源反代 |
| 跨源 cookie 被 SameSite 拦 | 优先同源部署/反代 |
| `dsh-app://` 下相对 `/api` 404 | 用 Host 绝对地址或一次性 bootstrap ticket |
| 双滚动条 / 焦点逃逸 | iframe 内部自己滚；宿主不要 `overflow:hidden` |
| 主题不一致 | 传主题参数或 postMessage，统一用 `--dsw-alias-*` |

🟡 这一条的 Host 侧细节随版本变化，落地前用 `cordis_inspect` 与真机确认（0.2.2-rc.3 未在本仓库复核）。

---

## 配方 11：主题与质感

```css
[data-my-plugin] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  border: 0;
  box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgb(0 0 0 / 0.12));
}
```

**坑**：不写颜色字面量；不做全局选择器；圆角/描边遵循官方规范（见 [`theming.md`](theming.md)）。
**验收**：亮/暗两套截图；第三方插件卡片不被误伤。

---

## 配方 12：DOM 兜底——把“工作区”标题变成下拉

> 只有确认 `sidebar.workspaces` 不能替换（要复刻搜索/筛选/新建）时才走这条。

**锚点**：`[class*="_sectionHeader"]` + 含 `input` + ≥2 个 `button`（见 [`dom-anchors.md`](dom-anchors.md) §3）。

```js
// 结构与清理见 dom-anchors.md §4；这里只写差异
const trigger = doc.createElement('button')
trigger.setAttribute('data-my-plugin', '')
trigger.textContent = '工作区 ▾'
trigger.addEventListener('click', openMenu)
found.label.parentElement.insertBefore(trigger, found.label)
found.label.style.display = 'none'
```

**坑**：标题文本会随分组在“工作区/会话”间切换；隐藏列表要隐藏 header 的**下一个兄弟**而不是删除；每轮先清理防双份。
**验收**：切换分组后官方列表能回来；搜索/筛选/新建仍可用；关插件后标题恢复。

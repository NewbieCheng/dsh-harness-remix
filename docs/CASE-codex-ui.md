# 案例：Codex UI 2.2.2（`@michengai/dsh-codex-ui`）

> 研究方式：读安装包 `lib/` 完整源码（非 README）、`package.json`、`cordis.patch.yml`、`CHANGELOG.zh-CN.md`。
> 用途：把“多子插件 UI 套件”的工程做法提炼成可迁移模式；**不是**让你模仿它的全部实现。

## 1. 结构

```text
package.json
  exports: "." | "./session-title" | "./settings-skin" | "./composer"
           | "./sidebar" | "./theme" | "./desktop-menu" | "./client"
  dsh.bundle.patch: ./cordis.patch.yml
  dsh.client: { platform:"web", inject:[8 个官方 client 包] }
cordis.patch.yml  → insert 7 行（6 个子插件 + 聚合入口）
lib/
  index.mjs                 聚合入口（依赖管理、关于页、profile 解析）
  session-title-plugin.mjs  会话标题（2358 行，最大）
  composer-plugin.mjs       输入框增强（Host 端点 + LLM 预测）
  sidebar-plugin.mjs        侧栏（42 行）
  theme-plugin.mjs          主题（42 行）
  settings-skin-plugin.mjs  设置皮肤（33 行）
  desktop-menu-plugin.mjs   桌面窗口菜单（582 行）
  client.js                 浏览器半（16399 行，__ModuleLoader__ 包装）
  profile-resolver-*.mjs    profile 解析（子插件共用）
```

## 2. 七个可迁移模式

### 2.1 子插件开关端点（最值得抄）

每个 UI 子插件的 Host 半都只做一件事：

```js
// sidebar-plugin.mjs（节选）
export const inject = ['webServer']
function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.get('webServer').register({
      kind: 'exact', path: '/api/michengai/dsh-codex-ui/sidebar',
      handler: (_req, res) => {
        const disabled = isSubPluginDisabledOnDisk('codex-ui-sidebar', undefined, ctx)
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        res.end(JSON.stringify({ enabled: !disabled }))
      },
    })
    return () => dispose?.()
  }, 'michengai-codex-ui: sidebar state')
}
```

- 客户端先探测 `{enabled}`，**false 就整体回退官方 UI**；
- `isSubPluginDisabledOnDisk` 读 profile 的 `cordis.patch.yml`，所以“用户在插件管理里关掉这一行”真的会生效；
- 失败/不可达时按“关闭”处理（fail-closed）。

**可迁移结论**：任何“增强官方 UI”的插件都应该有**按能力粒度的开关 + 客户端的降级路径**，而不是一个总开关。

### 2.2 只加列表槽，不抢单占槽

客户端注册点（`grep slots.register client.js`）：

| 槽 | 基数 | 用途 |
|---|---|---|
| `conversation.input.dock` ×3 | list | 输入历史、建议条 |
| `conversation.input.overlay` | list | 补全浮层 |
| `contextMenu.icon` ×2 | keyed | 菜单图标 |
| `settings.section` + `settings.section.icon` | list | 设置页 |
| `sidebar.panellist` | list | 侧栏面板（通过镜像重排） |

没有一处往 `conversation.input.model` / `permission` 这类单占槽里塞——**这是它能和官方、和其他插件共存的关键**。

### 2.3 槽位镜像（多插件协作）

`SidebarNav` 用 `ctx.slots.entriesOfSlot('sidebar.panellist')` 读出**其他插件**注册的面板项，按自己的布局重排：

```js
ctx.slots.entriesOfSlot('sidebar.panellist')
  .filter(e => typeof e.options.id === 'string')
  .map(e => ({ id: e.options.id, order: e.options.order ?? 0, label: e.options.label, component: e.component }))
```

再订阅 `ctx.slots.subscribe('sidebar.panellist', sync)` 与 `ctx.locale.subscribe(sync)`，插件装卸/切语言时自动重排。

**代价**：它复制了别人的组件引用；CHANGELOG #54 记过“无组件注册项导致初始化失败”——**必须过滤没有 component 的 entry**。

### 2.4 能力探测而非版本判断

```js
const isDirectoryFlowAvailable = () =>
  typeof ctx.slots?.entries === 'function' &&
  ctx.slots.entries('sidebar.workspaces.directoryFlow').length > 0
```

没有这个子槽就不渲染“添加工作区”按钮，避免“点了没反应”。

### 2.5 原生优先、DOM 兜底

同一功能两条路径：
- 有 `ctx.get('contextMenus')` → 官方注册；
- 没有 → `MutationObserver` + `data-*` 标记注入，卸载时整体移除。

注入节点全部带 `data-dsham-*` 之类标记，`cleanup` 一次性删掉。

### 2.6 主题只用 token + 属性开关

- 玻璃/云母：`[data-dsh-glass]` 属性 + 一段 `GLASS_CSS_TEXT`，全部基于 `var(--dsw-alias-*)` 与 `color-mix`；
- 不重定义主题变量；
- 设置皮肤把样式**限定在设置弹窗容器内**（CHANGELOG 明确记录过“规则外溢导致第三方卡片被拉伸”的修复）。

### 2.7 配套依赖管理

`index.mjs` 读 profile 的 `package.json` / `cordis.patch.yml`，用官方插件管理能力做安装/升级，并维护“配套插件”状态。**这属于生态工程，不是每个插件都需要**；需要时按 `manifest.md` 的 profile 结构读，不要自己写 `node_modules`。

## 3. CHANGELOG 里的教训（直接进规范）

| 事件 | 教训 | 进哪条规范 |
|---|---|---|
| #54 无组件注册项导致初始化失败 | 镜像 entry 必须过滤 | `conflict-matrix.md` B3/B4 |
| 重复声明子插槽 → 激活失败 | 只有 owner 能声明 child | B3 |
| 停用官方 `ui-sidebar`/`ui-settings-general` 才不冲突 | 替换=关闭官方行，代价是停用后要能恢复 | C1/C2 |
| 切模型白屏（原生节点被剔除） | 不要删 React 管的节点 | D/elements |
| 设置皮肤规则外溢 | 全局选择器会误伤第三方 | D2 |
| 安装期构建脚本未运行 | 发布预构建产物 | `manifest.md` §6 |

## 4. 不要照抄的

- 16k 行单 bundle：可维护性差，新插件应拆包；
- 大量 DOM 注入：应作为兜底而非主路径；
- 依赖管理内嵌在 UI 插件里：生态级能力应独立；
- 用 `alert` 之类的浏览器全局做用户反馈（骨架里只用于演示，正式产品用官方 primitives）。

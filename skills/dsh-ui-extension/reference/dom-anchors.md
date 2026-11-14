# 元素定位与 DOM 注入

> 只在“没有槽、也没有服务”时才用这一页。**类名是哈希的**：构建用 `[hash]_[local]`，
> 页面上长这样：`a1b2c_sectionHeader`。写 `.sectionHeader` 永远匹配不到。

## 1. 锚点优先级（从稳到脆）

| 级别 | 锚点 | 例子 | 稳定性 |
|---|---|---|---|
| 1 | 官方 `data-*` 属性 | `[data-shell-overlay]`、`[data-rightbar-col]` | 高（语义属性，少改） |
| 2 | ARIA / role | `[role="menu"]`、`[role="dialog"]` | 高 |
| 3 | 类名子串 | `[class*="_sectionHeader"]` | 中（local 名可能改） |
| 4 | 结构 + 文本 | 找“含 input 且有 ≥2 个 button 的 header” | 低（i18n 会变） |
| 5 | 裸文本 | `textContent === '工作区'` | **最脆**，DSH 支持 8 种语言 |
| ✗ | 裸哈希类名、`nth-child` 深链 | `.a1b2c_sectionHeader`、`div > div:nth-child(3)` | 升级必坏 |

## 2. 已验证的稳定属性

| 属性 | 位置 |
|---|---|
| `[data-shell-overlay]` | `shell.overlay` 所在层 |
| `[data-shell-bottom]` | 底部条 |
| `[data-shell-leading]` | 桌面标题栏左侧 |
| `[data-rightbar-col]` | 右栏列 |
| `[data-sidebar-collapsed]` | 侧栏折叠态（在 frame 上） |
| `[data-rightbar-collapsed]` | 右栏收起态 |
| `[data-global-panel]` | 主区全局面板 |
| `[data-platform="darwin"]` / `[data-fullscreen]` | 平台/全屏 |
| `[data-row-key="workspace:<id>"]` | 侧栏工作区行（会话行同构） |

## 3. 侧栏工作区标题：不用文本的找法

```js
/** 不依赖语言，也不依赖哈希值：靠“结构指纹”。 */
function findWorkspaceHeader(doc) {
  const headers = doc.querySelectorAll('[class*="_sectionHeader"]');
  for (const header of headers) {
    const label = header.querySelector('[class*="_sectionLabel"]');
    if (!label) continue;
    if (!header.querySelector('input')) continue;              // 必须有搜索框
    if (header.querySelectorAll('button').length < 2) continue; // 筛选 + 新建
    return { header, label };
  }
  return null;
}
```

要点：`[class*="_localName"]` 只匹配“local 名”，哈希前缀不影响；再叠结构条件，就不会误命中别处的 header。

## 4. 注入范式（B 计划模板）

```js
const MARK = 'data-my-plugin';

function install(doc) {
  let observer = null;
  let mounted = null;

  const cleanup = () => {
    for (const node of doc.querySelectorAll(`[${MARK}]`)) node.remove();
    if (mounted?.hidden) mounted.hidden.style.display = '';   // 恢复官方节点
    mounted = null;
  };

  const mount = () => {
    const found = findAnchor(doc);
    if (!found) { cleanup(); return; }
    if (mounted?.anchor === found.anchor && mounted.trigger?.isConnected) return;
    cleanup();                                                 // 每轮先清，防重渲染后双份
    const trigger = doc.createElement('button');
    trigger.setAttribute(MARK, '');
    trigger.type = 'button';
    trigger.textContent = '我的入口';
    found.anchor.parentElement.insertBefore(trigger, found.anchor);
    found.anchor.style.display = 'none';                       // 只隐藏，不删除
    mounted = { anchor: found.anchor, hidden: found.anchor, trigger };
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    (doc.defaultView?.requestAnimationFrame ?? setTimeout)(() => { scheduled = false; mount(); });
  };

  observer = new MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true });
  mount();

  return () => { observer?.disconnect(); cleanup(); };         // 必须返回 disposer
}
```

## 5. 十条硬规则

1. **只追加**，不删除/不移动 React 管理的节点；隐藏用 `display:none` 且可恢复。
2. 所有自己创建的节点带 `data-<plugin>` 标记，便于一次性清理与自查。
3. 浮层挂 `document.body`（portal），`z-index ≤ 1100`（官方弹窗约 1200）。
4. 每次 mount 前先 cleanup；不依赖“React 会保留我的节点”。
5. 用 `requestAnimationFrame` 节流，别在 observer 回调里直接改 DOM。
6. 事件监听用 `{ capture: true }` 时要在 disposer 里用同样参数移除。
7. 不抢快捷键（Enter/Tab/Esc/Cmd+K）；需要时先 `preventDefault` 再 `stopPropagation`。
8. 不读也不写官方节点的 `className`（哈希会变）；要加样式就加自己的 `data-*`。
9. 注入层**不承载权限、凭据、业务写操作**——这些走 Host 与 typert。
10. 升级 DSH 后第一件事：跑一遍注入，确认 `[class*="_local"]` 还对得上；对不上就降级关闭。

## 6. 定位不到时怎么查

1. `cordis_inspect_query { platform:"client", provider:"Slots", method:"listSubTree" }`：先确认是不是真没槽。
2. 运行中宿主取 bundle：`/plugins/??<package>/client.js&rev=<rev>`，对应 `.map` 里有 `sourcesContent`。
3. 在 `sourcesContent` 里搜组件名（如 `WorkspaceBrowser`），看 `css.sectionLabel` 这类写法。
4. 元素定位插件常把节点指到 `src/client-entry.js` 之类的入口文件，那是误报，以源码为准。

## 7. 自检

- [ ] 折叠/展开侧栏各一次，锚点仍命中；
- [ ] 切“工作区/会话”分组，仍命中；
- [ ] 切语言（8 种里挑 2 种），不依赖文本的锚点仍命中；
- [ ] 亮/暗主题各一次；
- [ ] 重复开关插件 3 次，页面只有一份注入节点；
- [ ] 关掉插件后官方节点恢复可见、无残留。

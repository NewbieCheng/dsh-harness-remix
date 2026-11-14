# 元素能力地图

> 回答四个问题：**这个元素属于哪个宿主模块？有没有官方落座点？能不能替换？推荐怎么做、风险是什么？**
> “宿主模块”是 DSH 的 client 包名（`@deepseek-ai/dsh-client-ui-*`），用于查源码与判断谁能声明子槽。

## 1. 判定流程

```text
元素 ──> 有槽？（查 slots.generated.md）
          ├─ 有，list/keyed ──> 追加，安全
          ├─ 有，single 无 occupant ──> 直接注册
          ├─ 有，single 有 occupant ──> 替换：显式 priority + 回退开关 + 已移除声明
          └─ 无 ──> 有官方服务/事件？（查 host Service/Event inspect）
                      ├─ 有 ──> 用服务扩展（如 contextMenus、commands）
                      └─ 无 ──> DOM 兜底（dom-anchors.md，登记 + 只追加 + disposer）
```

## 2. 主界面骨架

| 元素 | 宿主模块 | 落座点 | 可否替换 | 推荐方案 | 风险 |
|---|---|---|---|---|---|
| 整壳三栏 | `ui-layout` | `root` | 理论上可，实际不可 | **不要动**；要全屏用 `shell.overlay` 或 portal | 顶掉整个 AppFrame，所有槽消失 |
| 左栏 | `ui-sidebar` | `sidebar` | 可（不建议） | 改内部子槽 | 折叠/抽屉/拖宽逻辑要自己实现 |
| 主区面板 | `ui-layout` + `ui-conversation` | `main`（键控） | 加新 key 安全 | 新 key + `sidebar.panellist` 入口 | 面板打开时会话不可见（main 单选） |
| 会话本体 | `ui-conversation` | 无独立可导出组件 | **不可搬迁** | 留洞（右侧露出）或整壳 iframe | 没有“聊天组件”可嵌到别处 |
| 右栏 | `ui-sidebar-right` | `rightbar` / `rightbar.session` | 可 | 用 `sidebar.right.pane.tab` 加标签 | 右栏宽度与拖拽由宿主管 |
| 壳内浮层 | `ui-layout` | `shell.overlay`（列表） | — | **首选**：常驻面板/toast/拖拽层 | 祖先有 `overflow`，`fixed` 浮层要 portal |
| 底部条 / 桌面标题栏 | `ui-layout` | `shell.bottom` / `shell.leading` | 可 | 单占注册 | 标题栏需 `-webkit-app-region: drag`，否则拖不动窗口 |

## 3. 侧栏

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 品牌图标/名字 | `ui-sidebar` | `sidebar.brand.mark` / `.name` | 直接换（无 owner 时注册即生效） | 尺寸按 42px 行高/36px rail 调 |
| 插件导航入口 | `ui-sidebar` | `sidebar.panellist` + `.actions` | 加 | 入口 id 要与 `main` 的 key 对应 |
| 底部动作 | `ui-sidebar` | `sidebar.footer.action` | 加 | 与设置按钮同排，注意宽度 |
| **“工作区”标题行** | `ui-workspace` | 无子槽（整块是 `sidebar.workspaces`） | ① 换整块（要复刻搜索/筛选/新建）② 或 **跑到标题位置做 DOM 增强** | 标题文本会随分组切换“工作区/会话”；类名是哈希 |
| 工作区列表 | `ui-workspace` | `sidebar.workspaces.session.row.*`、`session.menu.item` | 加行内动作/菜单项 | 行是虚拟列表，DOM 会被复用 |
| 新建工作区目录流 | `ui-workspace` | `sidebar.workspaces.directoryFlow` | 替换该子槽 | 替换后要自己处理选择/取消/错误 |
| 会话行悬停 | `ui-workspace` | `sidebar.session.row.hover` / `.leading` / `.trailing` | 加 | 悬停区高度受限，别放浮层 |

## 4. 输入框

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 右侧按钮 | `ui-conversation` | `conversation.input.right`（列表） | **加** | 尺寸跟工具行 24–28px；别抢 Enter/Tab |
| 左侧按钮 | 同上 | `conversation.input.left`（列表） | 加 | 同上 |
| 上方整宽条 | 同上 | `conversation.input.dock`（列表） | 加 | 会挤压消息区，注意高度 |
| 卡片内浮层 | 同上 | `conversation.input.overlay`（列表） | 加 | 祖先 `overflow`，浮层 portal |
| 输入历史/联想 | 同上 | `conversation.input.dock` + `overlay` 组合 | 加 | 需要自己处理 IME、焦点、Esc |
| 模型选择器 | `ui-model-selection` | `conversation.input.model`（单占） | **不要替换**：用 `conversation.input.model.options` 加选项 | 替换会丢模型目录/思考强度/渠道状态 |
| 权限位 | `ui-permission-presets` | `conversation.input.permission`（单占） | 不要替换 | 权限是会话级，UI 与后端预设耦合 |
| 计划位 | `ui-plan` | `conversation.input.plan`（单占） | 不要替换 | 同上 |
| 附件轨 | `ui-attachment` | `conversation.input.attachments`（单占） | 不要替换 | 拖放与上传回执绑定 |
| 发送/停止逻辑 | `ui-conversation` | `conversation.composer.bar`（单占） | 不要替换 | 等于自己实现输入框 |

## 5. 消息区

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 一轮结束后的贡献 | `ui-chat` | `conversation.chat.turnTail`（列表） | **加** | 渲染在动作行之前 |
| 助手动作行 | `ui-chat` | `conversation.chat.assistant-actions`（列表） | 加 | 溢出会被裁切 |
| 消息节点类型 | `ui-chat` | `conversation.chat.node`（键控） | 加**新**节点类型；改已有 key 等于替换 | key 表固定，抢 key 会顶掉官方渲染 |
| 思考正文 | `ui-chat` | `conversation.chat.reasoning.body`（单占） | 可换 | 折叠态/流式更新由 owner 传 |
| 代码块 | `ui-chat` | `conversation.chat.markdown.fence`（hoc） | 包裹（按语言） | 不能替换内容，只能包 |
| 消息图片 | `ui-chat` | `conversation.chat.message.images` / `.user.images`（单占） | 可换，二者独立 | 授权 loader 由 owner 提供 |
| 选中引用 | `ui-chat` | `conversation.chat.text-interaction`（键控） | 加新 key | 只能在自己的 key 下生效 |
| 审批卡片 | `ui-approval` | `conversation.approval.detail`（单占） | 可换 | 与工具调用 id 关联 |
| 用户消息正文 | `ui-conversation` | 只有 Factory `conversation.user.text`（+ 内联 `conversation.user.text.node` 键控） | 用 `conversation.user.text.node` 加新 key | 直接改会让队列/目标命令一起变 |
| 消息容器/流 | `ui-chat` | `conversation.chat.flow`（单占） | 不要替换 | 虚拟滚动、可见性钩子全在里面 |

## 6. 会话头

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 标题旁按钮 | `ui-conversation` | `conversation.session.header.actions`（列表） | **加** | 溢出裁切 + 淡出，浮层要 portal |
| 右侧工具 | 同上 | `conversation.session.header.utilities`（列表） | 加 | 同上 |
| 最右角 | 同上 | `conversation.session.header.corner`（单占） | 换 | 只放一个控件 |
| 面包屑标题 | 同上 | `conversation.session.header.lineage`（单占） | 换 | 标题区裁切溢出 |
| 视图“更多”菜单 | 同上 | `conversation.session.header.views.actions`（列表） | 加 | 有注册才显示“更多” |
| 无会话时的全局导航 | 同上 | `conversation.header.leading`（单占） | 换 | 常驻，注意宽度 |

## 7. 首屏 / 设置 / 插件管理

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 新会话选项 | `ui-conversation` | `conversation.hero.options`（列表） | 加 | 只右对齐一排，注意宽度 |
| 首屏品牌/工作区/预设 | 同上 | `conversation.hero.*`（单占） | 换 | 工作区选择替换后要自己接目录流 |
| **设置页一节** | `ui-settings-general` | `settings.section` + `.icon`（列表） | **加**（首选） | 设置是弹窗，别在里面再开全屏 |
| 通用设置一行 | 同上 | `settings.general.item`（列表） | 加 | 行高与开关控件对齐 |
| 插件详情配置区 | `ui-plugin-manager` | `plugins.bundle.config`（键控，用自己包名） | 加 | 只在 `view:'page'` 渲染 |
| 插件详情章节/动作/标签 | 同上 | `plugins.detail.section` / `.actions` / `.badge` | 加 | 跟随页面 subject |
| 插件页新标签 | 同上 | `plugins.tab`（列表） | 加 | order 决定位置 |
| 设置外壳零件 | `ui-settings-general` | `settings.trigger/header/close/launcher` | 不必要不动 | 会破坏整页布局 |

## 8. 右栏 / 工具卡片

| 元素 | 宿主模块 | 落座点 | 推荐方案 | 风险 |
|---|---|---|---|---|
| 右栏新标签页 | `ui-sidebar-right` | `sidebar.right.pane.tab`（键控） | 加新 key | 内容自己渲染，尺寸受容器限制 |
| 文档预览动作 | `ui-sidebar-documentpreview` | `sidebar.right.tab.document.action(s)` | 加 | — |
| 文件标签动作 | `ui-sidebar-files` | `sidebar.right.tab.files.actions` | 加 | — |
| 自定义工具卡片 | `ui-tool` | `tool.call.toolview`（键控，用工具名） | 加新 key | 抢已有工具名会替换官方卡片 |
| 工具结果图片 | `ui-tool` | `tool.call.images`（单占） | 可换 | 走附件展示插件 |
| 交付文件动作 | `ui-deliverables` | `deliverables.file.actions` | 加 | 需要会话事件坐标 |

## 9. 官方没有落座点的（别硬找）

| 想要 | 现实 | 替代 |
|---|---|---|
| 把会话组件搬到自己的壳里 | 会话没有可导出组件，`main` 单选 | 整壳 iframe，或留洞让原生会话露出来 |
| 改发送按钮行为 | `conversation.composer.bar` 整块是单占 | 用 `input.right/left` 加按钮，走自己的命令 |
| 改模型目录/渠道 | 属于 `ctx.llm` 与设置，不是 UI | 后端注册 provider + `settings.models.*` 槽 |
| 改消息渲染内部结构 | `chat.flow`/`chat.node` 替换代价极高 | 用 `turnTail`/`assistant-actions`/`hoc` 包 |
| 全局换肤 | 主题归 `ui-theme` | 主题插件 + token，不逐节点内联 |

**一句话**：能靠列表槽解决的，永远不要用替换；能靠替换解决的，永远不要用 DOM。

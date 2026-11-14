# 插槽按区域导航

> 只列“会用到”的槽与用法建议；完整 116 项见 [`slots.generated.md`](slots.generated.md)。
> 标记：**加** = 追加（list/keyed，安全）｜**换** = 单占且默认有 occupant（要显式 priority + 回退）｜**嵌** = 只能由 owner 声明，别注册。

## 1. 外壳与布局

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `root` | 单占 | **别碰** | 唯一根槽，注册会顶掉整个 AppFrame |
| `sidebar` | 单占 | 换（不建议） | 整个左栏；替换等于重写侧栏 |
| `main` | 键控 | 加（新 key） | 主区面板，key 与侧栏入口 id 对应 |
| `main.conversation` | 单占 | 别碰 | 会话外壳，替换=没有会话 |
| `rightbar` | 单占 | 换（不建议） | 右栏整体 |
| `rightbar.session` | 单占 | 换 | 右栏在有会话时的内容 |
| `shell.overlay` | 列表 | **加（首选）** | 壳内浮层；常驻面板、toast、拖拽层 |
| `shell.bottom` | 单占 | 换 | 底部横条 |
| `shell.leading` | 单占 | 换 | 桌面标题栏左侧（红绿灯旁），注意 `-webkit-app-region: drag` |
| `shell.quota-notice` | 竞选 | 加（`select`） | 额度提示链 |
| `workspace.toast` | 键控 | 加（新 key） | 工作区通知（key 表固定，用未占 key） |
| `contextMenu.content` | 键控 | 加（新 key） | 右键菜单里的 React 行；数据型条目走官方 `contextMenus` 服务 |
| `contextMenu.icon` | 键控 | 加（新 key） | 菜单图标 |

## 2. 侧栏

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `sidebar.brand.mark` / `.name` | 单占 | 换/加 | 品牌图标/名字（无 owner 时注册即生效） |
| `sidebar.panellist` | 列表 | **加** | 插件导航入口（首选入口位） |
| `sidebar.panellist.actions` | 列表 | 加 | 入口右侧动作 |
| `sidebar.footer.action` | 列表 | **加** | 底部动作（全屏工作台入口） |
| `sidebar.settings` | 单占 | 换 | 设置入口 |
| `sidebar.toggle.badge` | 单占 | 换 | 折叠按钮角标 |
| `sidebar.workspaces` | 单占 | 换（高风险） | 整块工作区（标题+搜索+筛选+新建+列表）；替换要自己复刻全部功能 |
| `sidebar.workspaces.directoryFlow` | 单占 | 换 | 新建工作区的目录选择流 |
| `sidebar.workspaces.session.row.action` | 列表 | 加 | 会话行悬停动作 |
| `sidebar.workspaces.session.menu.item` | 列表 | 加 | 会话行菜单项 |
| `sidebar.session.row.leading` / `.trailing` / `.hover` | 列表 | 加 | 会话行首/尾/悬停区 |
| `sidebar.session.action` | 包裹 | 加 | 包住会话行动作区（hoc） |

## 3. 输入区（用户最常改）

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `conversation.input.right` | 列表 | **加** | 发送按钮左侧的紧凑控件（首选） |
| `conversation.input.left` | 列表 | **加** | 工具行左侧控件 |
| `conversation.input.dock` | 列表 | **加** | 输入卡片上方的整宽条（历史、建议） |
| `conversation.input.overlay` | 列表 | **加** | 输入卡片内的浮层（联想、补全） |
| `conversation.composer.dock` | 列表 | 加 | 卡片下方环境条 |
| `conversation.input.model` | 单占 | 换（高风险） | 模型选择器 |
| `conversation.input.model.options` | 列表 | 加 | 模型菜单里的会话选项 |
| `conversation.input.model.label` | 单占 | 换（此行无 occupant） | 只读模型名标签 |
| `conversation.input.permission` / `.plan` / `.attachments` / `.activity` | 单占 | 换（高风险） | 权限位/计划位/附件轨/活动区 |
| `conversation.composer` | 竞选 | 加 | 整个输入区的选举链（少见） |
| `conversation.composer.bar` | 单占 | 别碰 | 输入区主体；替换=自己实现输入框 |

## 4. 消息与会话

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `conversation.view` | 列表 | 加 | 会话视图（chat / trajectory…） |
| `conversation.session` | 单占 | 换 | 会话视图容器 |
| `conversation.chat.flow` | 单占 | 换（不建议） | 消息流本体 |
| `conversation.chat.node` | 键控 | 加（新 key）/换 | 按节点类型渲染；key 表固定，常用 `user`/`assistant-step`/`tool-call`/`turn-tail` |
| `conversation.chat.turnTail` | 列表 | **加** | 一轮结束后、动作行之前的贡献 |
| `conversation.chat.assistant-actions` | 列表 | **加** | 助手消息动作行（复制、重试旁） |
| `conversation.chat.text-interaction` | 键控 | 加 | 区域文本手势（选中引用等） |
| `conversation.chat.markdown.fence` | 包裹 | 加 | 按语言包裹代码块（hoc） |
| `conversation.chat.reasoning.body` | 单占 | 换 | 思考正文渲染 |
| `conversation.chat.message.images` | 单占 | 换 | 消息图片组 |
| `conversation.approval.detail` | 单占 | 换 | 审批卡片详情 |
| `conversation.plan-review.actions` | 列表 | 加 | 计划评审动作 |
| `conversation.session.header.actions` | 列表 | **加** | 会话头按钮（标题旁） |
| `conversation.session.header.utilities` | 列表 | 加 | 头部右侧工具 |
| `conversation.session.header.corner` | 单占 | 换 | 头部最右角 |
| `conversation.session.header.lineage` | 单占 | 换 | 面包屑标题 |
| `conversation.session.header.views.actions` | 列表 | 加 | 视图切换“更多”菜单 |
| `conversation.header.leading` | 单占 | 换 | 全局导航（无会话也显示） |

## 5. 首屏（新会话）

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `conversation.hero.options` | 列表 | **加** | 新会话行右侧选项 |
| `conversation.hero.brand.mark` | 单占 | 换 | 空会话标题前图标 |
| `conversation.hero.workspace` | 单占 | 换 | 工作区选择 |
| `conversation.hero.agentPreset` | 单占 | 换 | Agent 预设选择 |
| `conversation.hero.frame` | 包裹 | 加 | 包裹整个首屏（hoc） |

## 6. 设置

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `settings.section` | 列表 | **加** | 设置页新增一节（首选） |
| `settings.section.icon` | 列表 | 加 | 该节的图标 |
| `settings.general.item` | 列表 | 加 | 通用设置里的一行 |
| `settings.action` | 列表 | 加 | 设置页动作 |
| `settings.plugins.tab` | 列表 | 加 | 插件页标签页 |
| `settings.models.provider-card` | 键控 | 加 | 模型页渠道卡片 |
| `settings.models.footer` | 列表 | 加 | 模型页页脚 |
| `settings.onboarding` | 列表 | 加 | 首次引导 |
| `settings.trigger` / `.header` / `.close` / `.launcher` / `.models.sign-in` | 单占 | 换 | 设置外壳零件，非必要不动 |

## 7. 插件管理页

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `plugins.item` | 列表 | 加 | 官方插件分组里加卡片 |
| `plugins.tab` | 列表 | 加 | 页面标签（如“发现”） |
| `plugins.add.actions` | 列表 | 加 | “添加插件”菜单里的安装项 |
| `plugins.detail.section` | 列表 | 加 | 详情页章节 |
| `plugins.detail.actions` / `.badge` | 列表 | 加 | 详情页动作/标签 |
| `plugins.bundle.config` | 键控 | 加（自己的包名） | Bundle 详情页配置区 |
| `plugins.bundle.activation` | 键控 | 加 | 启用后的引导 |
| `plugins.row.config` | 键控 | 加 | 单行配置入口 |

## 8. 右栏 / 文件

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `sidebar.right.pane.tab` | 键控 | 加（新 key） | 右栏标签页 |
| `sidebar.right.pane.tab.title` | 键控 | 加 | 标签标题 |
| `sidebar.right.tab.document` | 键控 | 加 | 文档预览标签 |
| `sidebar.right.tab.document.action(s)` | 键控/列表 | 加 | 文档操作 |
| `sidebar.right.tab.files.actions` | 列表 | 加 | 文件标签动作 |
| `sidebar.right.tab.guide(.entry/.actions)` | 竞选/键控/列表 | 加 | 引导面板 |
| `sidebar.right.tab.menu.item` | 列表 | 加 | 标签菜单项 |
| `sidebar.chat.conversation` | 单占 | 换 | 侧栏内的会话预览 |

## 9. 工具卡片与交付物

| 槽 | 类型 | 建议 | 用途 |
|---|---|---|---|
| `tool.call.toolview` | 键控 | 加（自定义工具名） | 自定义工具的结果卡片 |
| `tool.call.images` | 单占 | 换 | 工具结果图片 |
| `tool.view.cordis` | 键控 | 加（`self`） | 动态包自己的交互区 |
| `deliverables.file.actions` | 列表 | 加 | 交付文件动作 |
| `deliverables.review.file.actions` | 列表 | 加 | 评审文件动作 |

---

**判断口诀**：`列表/键控` 放心加；`单占` 先看表格“建议”列；写“别碰/嵌”的，换思路比硬上便宜。

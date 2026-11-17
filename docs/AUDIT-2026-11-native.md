# 审计：原生会话与 ACP 并列升级（2026-11-17）

## 范围和证据

本轮检查两套 DSH 开发 skill、模板和维护脚本。CLI 输出 `0.2.2-rc.3`；运行中 Host Inspect 查询 `sessionController`、`connection`、`typert`，Client Inspect 查询 `shell.overlay` 和服务目录。OpenFilm 的实现及 mock 覆盖见 [原生聊天案例](CASE-native-chat.md)。CLI 版本不能独立证明 GUI 版本一致；接口存在不等于 GUI 行为已验收。

## 处置

| 类别 | 处理 |
|---|---|
| 保留 | 前后端分工、ACP 边车、生命周期、槽位生成、共享内容、假宿主测试 |
| 新增 | Host 原生会话、身份绑定、流事件与持久事件分离、预设与技能隔离、三种工作台集成路径 |
| 修正 | 会话引擎和传输通路分层；RPC 不替代授权；拒绝超限请求；状态 GET 不再写入；安装替换前暂存、校验并保留备份 |
| 删除 | 会话工件直接重写步骤、反射删除宿主路由示例；去除不经验证的动态工具和固定 HMR 保证 |
| 待验证 | ACP 当前具体 framing、权限模式、恢复与交互；原生桥真实审批、重连、完整历史、GUI；跨平台和多版本兼容 |

## 验收与局限

`scripts/verify-skills.mjs` 检查本地 Markdown 相对链接、声明引用、已知槽与 Factory；其本身不是语义证明。`extract-slots --check` 无 live tree 时只核对快照渲染，不能证明当前宿主未变化。测试用临时目录和假服务，不调用真实模型。安装器的备份位于 DSH home 的 `skill-backups/`（技能扫描根之外），由用户决定何时清理；`--remove-legacy` 仍是单独的显式删除选项，本轮不使用。

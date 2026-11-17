# 原生 UI、自有工作台与外部嵌入

> ✅ `client/Slots listSubTree {root:'shell.overlay'}` 在当前实例显示 list/root；具体版本和占位者始终重新查询。源码仓库可选案例见 `docs/CASE-native-chat.md`；单独安装时不依赖该文件。

## 三种不同的需求

1. **增强 DSH 原生页面**：先查公开 slot、scope、kind、owner 和现有占位；用自己的 id/key 添加，重复官方 id/key 可能遮蔽已有功能。
2. **DSH 内嵌入自己的工作台**：先决定 `main` 的切换/卸载语义是否足够；只有需要切页常驻时才考虑 `shell.overlay` 管理独立面板。组件卸载时释放监听和资源，明确关闭、焦点归还、显示恢复与窄屏行为。
3. **把 DSH 页面嵌入外壳**：先检查当前部署的认证、CSP/frame-ancestors、来源与 cookie 行为，再做真实环境验证；不能假设同源代理或 URL 参数必然可行。

## iframe 与会话

工作台 iframe 的 bootstrap 由 Host 控制，精确校验 URL、协议、来源和权限；`postMessage` 检查 origin、source、消息类型及参数，避免泄漏凭据。iframe 和 UI 隐藏都不是安全边界。聊天 UI 通过明确的 RPC/HTTP/SSE 契约访问 Host，Host 再使用原生会话或 ACP；用户身份、项目和会话归属均在 Host 验证。

消息流断线、重复、取消、审批不可用时提示清楚，不能为了重连静默重复发送 prompt。长连接、定时器、消息监听、iframe 等需可清理。不要把 DOM 覆盖层当鉴权层。

## 生效和验收

客户端改动先构建，再刷新目标页面；只有确认同一 DSH checkout 的 `pnpm run dev:web` watcher 正在重建相关 client bundle 时，才声称 HMR 可用。其他改动按实际部署构建、重载或遵循管理器 `nextStep`。不要通过启动另一个服务器冒充当前 GUI 已更新。

覆盖开关→恢复、切会话、面板重入、亮暗色、窄屏、键盘焦点、iframe 来源失败与退出清理。GUI 未验证就记录待验。

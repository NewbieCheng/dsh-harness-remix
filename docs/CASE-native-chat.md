# 案例：OpenFilm 的 Host 原生会话桥

> 案例基于本地 `dsh-openfilm` 源码与 mock 测试；不是公开 API 承诺，也不代表 GUI 已真机验收。原生直连与 ACP 是并列方案。

## 可复用模式

- `src/native/dsh-native-agent-service.mjs:1-6,376-404,435-485,508-565`：Host 内复用 `sessionController`，按对话获取原生 session，通过 `follow` 翻译流，再发送 prompt 和取消。
- `src/native/dsh-session-store.mjs:32-49,72-85`：插件保存业务 project/conversation 到 sessionId 的映射；原生会话内容仍由 DSH 管理。
- `src/official/official-chat-rpc.mjs:12-18`：RPC 分发器要求外层认证与项目验证，不从浏览器直接接收路径或原生 session ID。
- `cordis.patch.yml:12-32,61-80` 与 `src/native/openfilm-skills.mjs:27-49`：领域 preset、项目指令根和专用 skill 注册。
- `tests/dsh-native-agent-service.test.mjs:146-207`：假宿主覆盖多对话隔离、流式事件及模型操作，不证明实际 GUI。

## 不能照搬的假设

该项目将非法 conversation 回退为空标识、映射写入失败时继续运行，并在部分恢复失败时新建 session；这些是当前项目的具体行为，不能当通用的安全或无损同步规范。面板审批回答路径与重连/重放语义应逐版本独立验证。项目文档中仍有历史 ACP 描述，与当前原生实现混杂时应以源码和当前宿主契约核实。

## 验证边界

✅ 宿主 inspect 可确认 `sessionController` 当前公开的方法及类型。✅ 源码和 mock 可确认测试覆盖的实现。⛔ 实际多会话、权限交互、断线恢复、完整历史及 UI 生效仍需针对目标 DSH 版本进行真机验收。

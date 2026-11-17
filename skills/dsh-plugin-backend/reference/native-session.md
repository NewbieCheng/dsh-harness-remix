# Host 原生会话与对话同步

> ✅ 证据：运行中的 `host/Service listService {service:"sessionController"}`；调用前重新 inspect 实际宿主。源码仓库可选案例为 `docs/CASE-native-chat.md`；单独安装时不依赖此文件，它不是 API 契约。原生方案与 [`acp.md`](acp.md) 并列，不替代 ACP。

## 选择与边界

Host 进程内需要真实 DSH 会话且宿主提供匹配能力时，可注入 `sessionController`。外部进程或需要 ACP 互操作时考虑 ACP。RPC、HTTP、SSE 是 UI 传输方式，可与任何后端引擎组合，不负责自动授权。

业务身份经认证和归属检查后由 Host 解析：`(projectId, conversationId) → sessionId`。区分外部 conversationId、DSH sessionId、幂等 requestId、产品 turnId、流 attemptId 和持久 seq；客户端传来的 ID 不是授权凭证。每次操作校验主体、项目、会话绑定、归档状态及业务参数。严禁客户端指定任意 cwd/sessionId 越权访问。

## 生命周期与数据流

1. 检查 `sessionController` 的运行时契约和部署支持的版本；没有能力时明确不可用，不能擅自切 ACP 或换模型。
2. 已有绑定先核实归属和可恢复性；不存在、损坏或暂不可用时区分原因，提示用户，不静默创建替代会话。并发创建同一业务对话要串行化；只持久化插件自有绑定，原生会话及其索引由 DSH 管理。
3. 根据已核实的 `create({workspaceId?, cwd?, agentPreset?})` 选择工作区及预设；确认真实返回的 sessionId 和工作目录，预设变更不自动迁移已有会话。
4. 根据运行中签名调用 `follow({address:{kind:'session',sessionId}, assistantStream:true}, signal)`，处理 snapshot、持久 event、可选 assistant-stream。`prompt({requestId,sessionId,mode,content}, signal)` 的 accepted 只表示已接收，不表示回合完成。请求标识按实际宿主约定生成并处理重复提交。
5. snapshot 是起点；持久事件按序列维护权威状态，assistant-stream 的 attempt/index 是临时显示。最终持久事件提交时对同一 attempt 收口，不能把流片段再附加一次。重连需按运行时契约重新建立基线及分页，不能凭空假设 `follow` 有恢复游标参数；对缺口、重叠、未知事件和截断数据明确处理。
6. `cancel({sessionId})` 请求取消活动回合，不等于订阅断开；AbortSignal 用于订阅或请求生命周期，终态以宿主实际事件和状态为准。卸载清理订阅、计时器、监听器和 in-flight 资源。
7. `modelCatalog`/`selectModel` 与 `projections` 的参数和信号以 inspect 为准；模型不可用必须报告，不能假装切换成功。

## 审批与历史

审批由 DSH 的授权和交互机制决定；自定义页面能否展示/回答审批必须检查当前版本的真实交互契约。没有有效回答路径时明确阻塞或拒绝，禁止自动批准。历史读取可使用 `events` 分页、`follow` snapshot 等经核实的能力，仍须做主体和资源授权。UI 可维护展示缓存，但不反向改写 DSH 历史。

## 失败和测试

至少用假宿主模拟：两个项目／两个对话隔离、并发新建、存在但暂不可读、映射持久化失败、断线重连、重复/乱序流帧、提交去重、取消与卸载、审批不可达、模型错误。无真实模型、真实 HOME、用户会话或网络访问。真实 GUI 验收另行记录，不可用 mock 通过冒充真机通过。

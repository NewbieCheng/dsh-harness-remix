# ACP 边车：把 DSH 当“对话引擎”接出去

> 适用：你有一个外部壳/服务，想复用 DSH 的会话、模型、工具、权限，而不是自己实现 agent loop。
> 可选做法：在提供该 profile 的 DSH 版本启动 `dsh --profile acp`，用其实际支持的 ACP 传输通信。Host 内原生会话也是独立可选方案，见 [`native-session.md`](native-session.md)。

## 1. 什么时候用它

| 场景 | 用 ACP | 用 typert/路由 |
|---|---|---|
| 外部桌面壳或独立进程需要 Agent 协议 | 可选 | 按需要选传输；Host 内原生会话也是另一种引擎 |
| 自动化流水线要跑一个 agent | 可选 | 依部署与实际支持的接口决定 |
| 插件前端取一点插件数据 | — | ✅ |
| 在同进程内加一个工具/能力 | — | ✅ |

## 2. 概念流程（版本相关；不能当已验证的完整协议实现）

```text
spawn dsh --profile acp  (stdio)
  → initialize                 { protocolVersion, clientCapabilities }
  → session/new   { cwd }      ← { sessionId, configOptions }
  → session/prompt{ sessionId, prompt:[{type:'text',text}] }
  ← session/update{ sessionId, update:{ sessionUpdate:'agent_message_chunk', content:{type:'text',text} } }
  ← session/update{ …, update:{ sessionUpdate:'agent_thought_chunk' } }   # 思考流
  ← session/update{ …, update:{ sessionUpdate:'tool_call' } }
  ← session/request_permission { … }                                       # 审批询问
  → session/cancel | session/set_config_option
  → session/resume { sessionId, cwd }                                      # 续聊
```

- 子进程可执行文件须来自用户配置或已验证的 DSH 安装；`process.execPath` 可能只是 Node，不可无条件当作 DSH。
- 按目标 ACP 实现与协商的传输 framing 解码，不要假定所有 JSON-RPC 都使用同一种帧格式；stderr 只当日志，不混入协议流；
- 断开/退出要 `close()`，Windows 上要杀进程树。

## 3. 配置选项

以下是历史插件观察，具体 `session/new` 响应、选项和编码必须在目标 ACP 实现中重新核实：

| option | 值 | 备注 |
|---|---|---|
| `model` | 分组（provider → models），`currentValue` 是**字符串化的数组** | 改的时候传同样形状的字符串 |
| `reasoning_effort` | `off/low/high/max` | 第三方渠道可能没有 `off` |

- 权限选项与环境变量依 ACP 实现及版本核实；`DSH_PERMISSION_MODE` 的实际作用尚未在本仓最小复现，不能假设一定生效。
- 审批必须由真实协议路径处理，未验证前不得自动放行。
- 模型渠道是否在 ACP 进程可用取决于其 profile 与版本；先检查配置和凭据，不自动修改用户 profile。若需调整，取得明确授权并验证。

## 4. 会话映射与存储

- 项目 → sessionId 的映射由你维护（例如 `$DSH_HOME/<plugin>/acp-sessions.json`，原子写）；
- 会话正文在子进程的 profile 里（`$DSH_HOME/sessions/…`），**不要**自己解析；
- 重启后按实际支持的协议恢复；恢复失败区分不存在、权限和暂时性错误，提示用户，不能静默创建替代会话或重放请求。

## 5. 失败处理

| 失败 | 处理 |
|---|---|
| 子进程起不来 | 报明确错误 + 候选命令列表，不要空转重试 |
| 模型不可用 | 明确报错或征求用户同意后切换；不要静默回退 |
| 请求超时 | 单次请求超时（如 180s）+ 可取消 |
| 进程崩溃 | 标记会话断开，允许重建；不静默重放 |

## 6. 安全

- 子进程的权限就是你给的权限；不要默认 `danger-full-access` 之外再无限制；
- 不要把宿主 token/cookie 传给子进程；
- 日志里不要出现完整 prompt 与文件内容。

## 7. 验证状态

| 项 | 状态 |
|---|---|
| `dsh --profile acp` 存在、stdio JSON-RPC | 🟡 历史案例记录；当前会话未启动子进程验证 |
| `configOptions` 只有 model/reasoning_effort | 🟡 来自实际插件探测，版本相关 |
| `DSH_PERMISSION_MODE` 生效 | 🟡 待在本机复测 |
| `session/resume` 契约 | 🟡 待复测 |

落地前用真机跑一遍：起子进程 → `session/new` → 发一条 → 收到 `agent_message_chunk` → 关掉。

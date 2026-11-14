# ACP 边车：把 DSH 当“对话引擎”接出去

> 适用：你有一个外部壳/服务，想复用 DSH 的会话、模型、工具、权限，而不是自己实现 agent loop。
> 做法：起 `dsh --profile acp` 子进程，用 ACP（Agent Client Protocol，stdio JSON-RPC）通信。

## 1. 什么时候用它

| 场景 | 用 ACP | 用 typert/路由 |
|---|---|---|
| 外部桌面壳要完整对话能力 | ✅ | — |
| 自动化流水线要跑一个 agent | ✅ | — |
| 插件前端取一点插件数据 | — | ✅ |
| 在同进程内加一个工具/能力 | — | ✅ |

## 2. 最小流程

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

- 子进程命令解析要兜底：PATH → 安装目录 → `process.execPath`；
- **按 JSON-RPC 帧解析，不要按行读**；stderr 只当日志，不混入协议流；
- 断开/退出要 `close()`，Windows 上要杀进程树。

## 3. 配置选项

`session/new` 返回的 `configOptions` 实测通常只有两个：

| option | 值 | 备注 |
|---|---|---|
| `model` | 分组（provider → models），`currentValue` 是**字符串化的数组** | 改的时候传同样形状的字符串 |
| `reasoning_effort` | `off/low/high/max` | 第三方渠道可能没有 `off` |

- **没有 permission 选项**：权限不是 ACP 配置项；
- 权限模式通过环境变量 `DSH_PERMISSION_MODE` 传给子进程（🟡 实测于 openfilm 插件，版本相关）；
- 想用桌面 profile 的渠道：把 `llm-pi-ai` 的 provider 描述**幂等**写进 acp profile 的 `cordis.patch.yml`，密钥留在 DSH 凭据里。

## 4. 会话映射与存储

- 项目 → sessionId 的映射由你维护（例如 `$DSH_HOME/<plugin>/acp-sessions.json`，原子写）；
- 会话正文在子进程的 profile 里（`$DSH_HOME/sessions/…`），**不要**自己解析；
- 重启后要能 `session/resume`；resume 失败就新建并提示用户。

## 5. 失败处理

| 失败 | 处理 |
|---|---|
| 子进程起不来 | 报明确错误 + 候选命令列表，不要空转重试 |
| 模型不可用 | 回退到默认模型，并记 `acp-model-fallback` |
| 请求超时 | 单次请求超时（如 180s）+ 可取消 |
| 进程崩溃 | 标记会话断开，允许重建；不静默重放 |

## 6. 安全

- 子进程的权限就是你给的权限；不要默认 `danger-full-access` 之外再无限制；
- 不要把宿主 token/cookie 传给子进程；
- 日志里不要出现完整 prompt 与文件内容。

## 7. 验证状态

| 项 | 状态 |
|---|---|
| `dsh --profile acp` 存在、stdio JSON-RPC | ✅ 本机 CLI 有 acp profile |
| `configOptions` 只有 model/reasoning_effort | 🟡 来自实际插件探测，版本相关 |
| `DSH_PERMISSION_MODE` 生效 | 🟡 待在本机复测 |
| `session/resume` 契约 | 🟡 待复测 |

落地前用真机跑一遍：起子进程 → `session/new` → 发一条 → 收到 `agent_message_chunk` → 关掉。

<!-- GENERATED from shared/ by scripts/sync-shared.mjs — edit the source, not this copy. -->

# 用 inspect 读真机，而不是背文档

> 这条规范排第一，因为其余所有规范都会随 DSH 版本变化。
> 本机实测过的事故：源码快照是 0.2.1-rc.2（100 槽、4 种基数），运行中的桌面端是 **0.2.2-rc.3（116 槽、5 种基数，多了 `hoc`）**。只看源码会漏掉整整一类扩展点。

## 1. 先发现当前可用 provider

先调用 `cordis_inspect_list`，再用其返回的 platform/provider/method 与输入 schema 调用 `cordis_inspect_query`。Inspect 是只读发现接口，不是业务 Service。下表是历史快照，不能假设所有环境都提供。

| platform | provider | 方法 | 回答什么 |
|---|---|---|---|
| client | `Slots` | `listSubTree` | 这个槽存在吗？基数？谁能注册？谁已经占了？ |
| client | `Slots` | `listSubTree { root }` | 这个槽的 catalog + occupants（查到单个槽时返回） |
| client | `Theme` | `listTokens` | 主题 token 名、是否必须亮暗两套 |
| client | `Service` | `listService` | 客户端服务签名（`slots`、`modules`、`locale`…） |
| client | `Builtin` | `listBuiltins` | 动态包能用的纯 JS 符号 |
| host | `Service` | `listService` | 105 个 Host 服务的精确签名 |
| host | `Event` | `listEvents` | 事件名与监听签名（含 waterfall/emit 模式） |
| host | `Config` | `listConfigs` | 当前 profile 里每个插件行的 Config JSON Schema |
| host | `Tool` | `listTools` | 当前 agent 可见工具（含动态注册） |

## 2. 三条使用纪律

1. **先查，再写**。要注册槽、要调服务、要读配置，先跑一次 inspect。文档里的签名只是“上次核对的快照”。
2. **把结果当证据**。回答用户时给出 `provider/method` 与关键字段，而不是“我记得”。
3. **失败就看实际诊断**。只能使用清单中声明的 inspect 方法；不存在“临时/回执通道”的通用保证。客户端不可达时报告未验证，勿猜。

## 3. 标准动作

### 3.1 确认一个槽能不能加

```text
cordis_inspect_query { platform:"client", provider:"Slots", method:"listSubTree", input:{ root:"conversation.input.right" } }
```

读三个字段就够决策：

| 字段 | 决策 |
|---|---|
| `kind: "list"` | 可以加，必须给 `id` |
| `kind: "single"` + 无 occupant | 可以注册（不必给 id） |
| `kind: "single"` + 有 occupant | **这是替换**：要么不做，要么显式 `priority` 更小 + 提供回退 |
| `keyDomain.already taken` | keyed 槽只能用自己的 key，不能抢已占的 |

### 3.2 确认一个服务方法

```text
cordis_inspect_query { platform:"host", provider:"Service", method:"listService", input:{ service:"storageDomain" } }
```

返回里带 JSDoc 与类型声明。**签名照抄，不要改写参数顺序**。

### 3.3 确认版本

```sh
dsh --version          # 运行中的 CLI
```

把版本写进本次交付的说明里。两份文档引用不同版本时，以**运行中**那份为准。

## 4. 何时重新核实

涉及当前宿主的接口事实，无论写代码还是写文档都应核实；不可查时注明版本和证据缺口。已有代码和旧骨架只是线索，不自动成为当前版本的事实。

# COMPAT — 版本基线与验证状态

> 本仓库的每条断言都必须有来源。这里记录**在哪个版本上、用什么方式**验证过。
> 升级 DSH 后按 [`skills/dsh-ui-extension/reference/compat.md`](skills/dsh-ui-extension/reference/compat.md) 的流程重跑。

## 1. 基线

| 项 | 值 | 采集方式 | 日期 |
|---|---|---|---|
| 运行中 DSH | **0.2.2-rc.3** | `dsh --version`（`resources/runtime/cli/bin/dsh.cmd`） | 2026-11-14 |
| 客户端插槽 | **116 槽 + 13 Factory** | `cordis_inspect_query` client/Slots `listSubTree` | 2026-11-14 |
| 基数种类 | single / list / keyed / chain / **hoc** | 同上 | 2026-11-14 |
| Host 服务 | 105 个 | `cordis_inspect_query` host/Service `listService` | 2026-11-14 |
| 主题 token | 14 个语义别名 | client/Theme `listTokens` | 2026-11-14 |
| 源码快照 | 0.2.1-rc.2（100 槽，无 `hoc`） | `vendor/dsh` 生成的 `slot-catalog.ts` | 2026-11-14 |

**两处版本不一致这件事本身就是结论**：只读源码会漏掉 16 个槽和整类 `hoc` 扩展点。

## 2. 已验证（可当事实用）

| 断言 | 证据 |
|---|---|
| 注册语义：单占同优先级第二次注册抛错；列表需要 `id`；键控需要 `key`；竞选需要 `select` | `packages/client/ui-slots/src/index.ts:1215-1240` |
| `priority` 越小越优先，同优先级冲突 | 同上 |
| 槽只在声明它的 entry 挂载时存在，必须 `inject` 后注册 | `docs/subsystems/slots.zh.md` + SlotCore 校验 |
| 客户端产物是 `window.__ModuleLoader__.load({id, factory:(require)=>…})` | `packages/client/tsdown.client.ts:660-670`；本机 esbuild 复现成功（2571 B 产物，react 外部化） |
| 共享模块表 11 项（react…ui-dockkit） | `packages/client/web/src/platform.ts:8-16` |
| `dsh.bundle.patch` / `dsh.profile.bundles` / `engines.dsh` 字段与层序 | `packages/util/package-manifest/src/types.ts` + `docs/user/develop/basic/publish.zh.md` |
| `webServer.register({kind,path,handler})` 返回 disposer、同名抛错 | `packages/host/webserver/src/index.ts` + generated cordis surface |
| `connection.requestRejection(request)` / `admit(request)` / `browserPeer` | `packages/client/connection/src/rpc.ts:200-300` |
| `settings` 自动表单（`configure({auto})`，默认 true） | `packages/settings/settings/src/index.ts:261-316` |
| `storageDomain.open(defineDomain({name,version,tables,global}))` + `domain.global.get/set` | 源码 + Archive Manager 1.3.6 |
| `typert.register({package,face,model,invocations})` + strict codec 形状 | Archive Manager 1.3.6 `lib/workspace.js` |
| CSS Modules 命名 `[hash]_[local]`（裸类名选择器必失效） | `packages/client/tsdown.client.ts:595` |
| 骨架后端 9 个单测通过 | `skills/dsh-plugin-backend/assets/skeleton-host`（node --test） |

## 3. 待验证（使用前必须自己确认）

| 项 | 状态 | 怎么验 |
|---|---|---|
| 客户端 `remote.$mount(descriptors)` 后的调用表达式 | 🟡 观察到，未最小复现 | `client/Service` inspect `remote` + 试调 |
| ACP `configOptions` 只有 model/reasoning_effort | 🟡 来自现有插件探测 | 真机起 `dsh --profile acp` 跑一次 |
| `DSH_PERMISSION_MODE` 生效 | 🟡 | 同上 |
| iframe/`dsh-app://` 的 `frame-ancestors` 现状 | 🟡 0.2.2 未复核 | 起 Web 实例嵌一次 |
| `settings.section.icon` / `contextMenu.*` 在 0.2.1 缺失 | ✅ 已确认缺失 | 0.2.1 源码 grep |

## 4. 重生成

```sh
node scripts/extract-slots.mjs --from-inspect slots.tree.json --version "$(dsh --version)"
node scripts/sync-shared.mjs
node scripts/verify-skills.mjs
```

`slots.tree.json` 的取法：`cordis_inspect_query { platform:"client", provider:"Slots", method:"listSubTree" }`，把整个返回保存下来。

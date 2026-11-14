<!-- GENERATED from shared/ by scripts/sync-shared.mjs — edit the source, not this copy. -->

# 插件冲突矩阵

> 每一行都来自真实事故或真实源码约束，不是假设。
> 用法：动手前扫一遍“我会不会踩”；出问题后按“检测”列定位，按“裁决”列改。

## A. 版本与产物

| # | 冲突 | 症状 | 根因 | 检测 | 裁决 |
|---|---|---|---|---|---|
| A1 | 三处版本不一致 | 文档写的 API 在真机上不存在 | 桌面端、`vendor` 源码、profile 依赖可能各是一个版本 | `dsh --version`；`cordis_inspect` 对表 | 以**运行中**版本为准，版本写进交付说明 |
| A2 | 客户端产物过期 | 改了 `src/` 但界面没变 | 只 build 了 host 半，或 Host 没重载 | 看 `lib/client.js` mtime 与页面加载报告 | 先 build 再刷新；Host 改动先 `touch` 再重载 |
| A3 | 动态包当静态包写 | `import` 报错、React 拿不到 | 动态 Cordis 包禁止 import，只能 `React.createElement` + `styles.insert` | 产物里有没有 `__ModuleLoader__.load` | 两条通路分开：静态=可 import；动态=纯 JS |

## B. 槽位

| # | 冲突 | 症状 | 根因 | 检测 | 裁决 |
|---|---|---|---|---|---|
| B1 | 单占槽重复注册 | `single slot "x" already has a registration` | 同 `priority`（默认 0）冲突 | `Slots` inspect 看 `kind`+occupant | 不加到单占槽；确需替换则显式更小 `priority` + 回退开关 |
| B2 | 把 Factory 当槽 | 注册抛 “not declared” | Factory 是组件定义，不是落座点 | `Slots` 返回里 `type:"factory"` | 查生成表；Factory 只能被 owner 渲染 |
| B3 | 子槽重复声明 | 激活失败 “already declared …” | 两个 entry 都 `children` 声明同一 key | 报错里点名第一个声明者 | 只有渲染该位置的 owner 能声明；其他包 `inject`+`register` |
| B4 | 未声明就注册 | `slot "x" is not declared` | owner entry 没挂载（其它插件没开、面板没打开） | `declaredBy` 列 | 一律 `ctx.slots.inject(key, () => register(...))` |
| B5 | 抢 keyed 已有 key | 抛冲突，或顶掉官方行 | `keyDomain.already taken` 里有这个 key | inspect 的 `keyDomain` | 只用自己的 key；要改官方行用 list 槽旁挂 |
| B6 | 排序打架 | 按钮顺序随机、重启后变 | 混用 `order` 与 `priority` | 读注册参数 | 列表槽只用 `order`；`priority` 只用于替换 |
| B7 | 作用域误判 | 无会话时组件不渲染/抛错 | `session` 槽要求会话 binding | 看 `scope` | 无会话也要显示 → 用 `root`/`session-maybe` 槽 |

## C. 服务与生命周期

| # | 冲突 | 症状 | 根因 | 检测 | 裁决 |
|---|---|---|---|---|---|
| C1 | 替换官方服务 | 停用插件后功能全没 | 把官方行 `disabled: true` 或整类替换 | patch 里有无 `disabled` | **增强不替换**：包一层、留 `hadOwn/previous`、可还原 |
| C2 | 单提供方互斥 | 装 A 就要关 B | 宿主只接受一个 provider（如会话标题） | 查官方行与文档 | 不自动关官方；让用户显式选择，并在 UI 里说明 |
| C3 | 路由重复注册 | 二次启用失败 / 404 | `webServer.register` 同名抛错 | 启动日志里的重挂载告警 | 每次注册留 disposer；重载路径先释放 |
| C4 | 清理不彻底 | 热重载后双份 UI、监听泄漏 | 只删 DOM 不断开 observer/订阅 | 重复开关 3 次看是否累积 | `ctx.effect` 包住一切；返回的组合 disposer 必须可重复调用 |
| C5 | 服务替换顺序 | 增强层被下一个插件覆盖 | 后加载者胜 | 打印加载顺序 | 通过 `ctx.inject` 等待依赖，不假设顺序 |

## D. 样式与主题

| # | 冲突 | 症状 | 根因 | 检测 | 裁决 |
|---|---|---|---|---|---|
| D1 | 写死颜色 | 亮色模式瞎眼/暗色发灰 | 绕过 token | grep `#fff`/`rgb(` | 只用 `--dsw-alias-*`；必须覆盖时亮暗各写一份 |
| D2 | 全局选择器外溢 | 第三方卡片被拉宽、按钮变形 | 选择器没限定在自己容器内 | 装一个带 tab 的插件看 | 一律前缀 `[data-<plugin>]`；不写 `div`/`button` 裸选择器 |
| D3 | token 重定义 | 全站色阶乱 | 功能包覆盖主题变量 | diff 主题变量 | 主题归主题包；功能包只消费 |
| D4 | 层级打架 | 自己的浮层盖住官方弹窗 / 被裁掉 | z-index 或祖先有 `overflow:hidden` | 看 `shell.overlay` 与 portal | 覆盖层 ≤ 1100；`fixed` 浮层 portal 到 body |

## E. 数据与权限

| # | 冲突 | 症状 | 根因 | 检测 | 裁决 |
|---|---|---|---|---|---|
| E1 | 直接读写会话文件 | 升级后会话打不开 | 私改 session 工件/zstd 帧 | grep `zstd`/`session.v4` | 只用 `sessions`/`sessionPersistence` 的公开只读接口 |
| E2 | 路由只校验 Origin | 任意网页可触发写操作 | 缺 loopback + 同源 + 自定义头 | 审计 handler | 写操作三件套；敏感操作走 typert |
| E3 | 密钥进前端/日志 | 泄漏 | 把 key 塞进响应或日志 | grep 日志字段 | 只存 env/凭据名；日志脱敏 |
| E4 | 静默降级 | 功能没了但没人知道 | `try/catch` 吞掉注册失败 | 搜 `catch {}` | 至少 `console.warn` + 诊断接口上报 |

## F. 一键自检

```text
[ ] 版本已记录（dsh --version）        [ ] 槽位/服务已用 inspect 核对
[ ] 所有注册都有 disposer              [ ] 重复开关 3 次无累积
[ ] 单占槽没有误加                    [ ] 停用插件后官方 UI 完整回来
[ ] 亮/暗、窄屏、折叠都过              [ ] 没有写死颜色/全局选择器
[ ] 写操作三件套齐                    [ ] 日志无密钥
```

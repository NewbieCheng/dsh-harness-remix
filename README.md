# DSH Harness Remix · DeepSeek Harness 插件开发规范

> 两套可直接安装的 DSH skill：**改界面** 和 **写后端**。
> 不绑定具体插件；给任何在 DSH 上做扩展的人或 AI 用。
> 基线：**DSH 0.2.2-rc.3** / 116 个客户端插槽 / 105 个 Host 服务（见 [`COMPAT.md`](COMPAT.md)）。

## 两套 skill

| skill | 覆盖 | 什么时候用 |
|---|---|---|
| [`dsh-ui-extension`](skills/dsh-ui-extension/SKILL.md) | 插槽选择、元素能力地图、替换与回退、DOM 兜底、主题 token、客户端构建 | “把 DSH 某个位置换成我的组件”“加按钮/面板/设置页”“改主题”“嵌进我的壳” |
| [`dsh-plugin-backend`](skills/dsh-plugin-backend/SKILL.md) | bundle/profile 清单、Cordis 生命周期、Host 服务、路由与鉴权、typert RPC、存储、设置、会话数据、ACP 边车 | “给插件加后端”“接自己的服务/模型”“存插件数据”“发成可安装包” |

两者共享一份 `shared/`（inspect 用法、冲突矩阵、验收），由脚本生成到各自 `reference/shared/`，保证单独安装也自足。

## 为什么重写（v1 → v2）

v1 的两份 SKILL.md 心法不错，但事实层建立在旧快照上：

| 问题 | 证据 | v2 做法 |
|---|---|---|
| 只装了 SKILL.md，`reference/` 全是死链 | 安装器只 `copyFileSync` | 安装器递归复制整目录 |
| 说“77 个插槽” | 真机 **116** + 13 Factory | 生成器从 live inspect 产出全表 |
| 把单占槽标成“多” | `conversation.input.model` 等实为 single，注册即抛错 | 表里带 `类型/替换风险`，规则写死 |
| 把 Factory 当槽 | `conversation.content`/`user.text`/`approval.card` | 生成表单列 Factory，禁止注册 |
| 用哈希类名做选择器 | 构建是 `[hash]_[local]` | 改用 `data-*` / `[class*="_local"]` / 结构指纹 |
| 缺清单层 | 无 `dsh.bundle`/`profile`/`engines` | 新增 `manifest.md` |
| 缺 typert / storageDomain / settings | 只有 HTTP 路由 | 各补一篇 + 骨架 |

## 安装

```sh
node scripts/install-skills.mjs --force                 # 覆盖两套 skill
node scripts/install-skills.mjs --force --remove-legacy  # 同时删掉旧名字（dsh-ui-remix / dsh-backend-bridge）
```

装到 `$DSH_HOME/skills/<name>/`（默认 `~/.dsh/skills`）。DSH 会 watch 这个目录，下一次 catalog 就能看到。

## 维护

```sh
node scripts/extract-slots.mjs --from-inspect slots.tree.json --version "$(dsh --version)"
node scripts/sync-shared.mjs          # shared/ → 各 skill
node scripts/verify-skills.mjs        # 死链、未知槽、Factory 误用、禁用词、行数上限
```

- 事实写进 `reference/`，`SKILL.md` 只放决策（≤320 行）；
- 每条断言标来源：`✅ 源码` / `🟡 真机` / `⛔ 待验证`；
- 待验证项集中在 [`COMPAT.md`](COMPAT.md) §3，不要在正文里假装确定；
- 升级 DSH：重生成 → 看 diff → 改文档 → 真机回归。

## 目录

```
.
├─ README.md  AGENTS.md  COMPAT.md
├─ shared/                     # 单一事实源（生成到两个 skill）
│  ├─ inspect-usage.md
│  ├─ conflict-matrix.md
│  └─ acceptance.md
├─ skills/
│  ├─ dsh-ui-extension/{SKILL.md, reference/*, assets/skeleton}
│  └─ dsh-plugin-backend/{SKILL.md, reference/*, assets/skeleton-host}
├─ scripts/{extract-slots,sync-shared,verify-skills,install-skills}.mjs
└─ docs/{CASE-codex-ui.md, CASE-archive-manager.md, AUDIT-2026-11.md}
```

## 边界

- 不改 DSH 本体（`app.asar`、源码、`vendor/dsh`）；
- 覆盖/替换必须带默认关闭的回退开关与本版本已验证的恢复路径；
- 注入层不承载权限、凭据、业务写操作；
- 未在真机看到行为，不写“已完成”。

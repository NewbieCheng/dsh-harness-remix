# DSH Harness Remix · DeepSeek Harness 改造 skills

> 两个可直接安装的 DSH（DeepSeek Harness）改造 skill：**改 UI** 和 **接后端**。
> 不绑定任何具体插件；给任何在 DSH 上做界面改造 / 服务接入的人或 AI 用。

## 是什么

| skill | 覆盖 | 什么时候用 |
|---|---|---|
| [`dsh-ui-remix`](skills/dsh-ui-remix/SKILL.md) | 替换官方原生组件、任意插槽挂 UI、整壳接入（iframe/WebView）、全屏工作台、留洞保留原生会话、主题、元素定位、注入范式 | “把 DSH 某个位置换成我的组件”“把 DSH 嵌进我的壳”“做自定义工作台” |
| [`dsh-backend-bridge`](skills/dsh-backend-bridge/SKILL.md) | Host 插件骨架、服务注入、Web 路由与鉴权、ACP 对话边车、模型/思考/权限、存储、诊断、测试规范 | “给插件加后端”“接自己的服务/模型”“把 DSH 对话接进别的系统” |

两个 skill 都带 `reference/` 明细：

- UI：`slots.md`（**77 个插槽全表**）、`element-map.md`（文本+结构定位）、`recipes.md`（9 个可抄配方）；
- 后端：`host-api.md`、`acp.md`、`models-permissions.md`、`diagnostics.md`。

## 不是什么

- 不改 DSH 本体（`app.asar`、DSH 源码、`vendor/dsh`）；
- 不是某个具体插件的文档，不依赖任何第三方插件；
- 不承诺“所有版本通用”：插槽/DOM 随 DSH 版本变化，升级后按 `element-map.md` §6 重新提取并回归。

## 安装

```sh
# 1) 复制到 DSH 用户 skill 目录
cp -r skills/* ~/.dsh/skills/

# 或 2) 用脚本（推荐，带 --force 覆盖）
node scripts/install-skills.mjs --force
```

装好后在 DSH 会看到 `dsh-ui-remix`、`dsh-backend-bridge` 两个 skill。

## 使用

对 AI 直接说：

- “用 `dsh-ui-remix` 把侧栏的‘工作区’标题换成我的下拉”
- “用 `dsh-ui-remix` 把 DSH 整个嵌到我的 Electron 壳里，保留登录态”
- “用 `dsh-backend-bridge` 给插件加一个 `/api/...` 路由，接我自己的服务”
- “用 `dsh-backend-bridge` 把对话接到 ACP，模型和权限跟着 DSH 走”

## 事实基础与版本

- 插槽表与布局来自 **DSH Web 客户端 source map**（2026-11，桌面版），77 个槽逐个提取；
- 后端模式来自真实 DSH 插件的 Host/ACP 实现与真机探测；
- 明确标注“以真机为准”的部分（如 `rightbar` entry 契约）不要当保证；
- 升级 DSH 后：先跑 `element-map.md` §6 的提取流程，再回归本 skill 的验收清单。

## 目录结构

```
.
├─ README.md
├─ scripts/
│  └─ install-skills.mjs        # 把 skills/ 镜像到 ~/.dsh/skills
└─ skills/
   ├─ dsh-ui-remix/
   │  ├─ SKILL.md
   │  └─ reference/{slots,element-map,recipes}.md
   └─ dsh-backend-bridge/
      ├─ SKILL.md
      └─ reference/{host-api,acp,models-permissions,diagnostics}.md
```

## 维护

1. DSH 升级后重新提取插槽/DOM（`element-map.md` §6），更新 `reference/`；
2. 改 skill 后在本地 `cp -r skills/* ~/.dsh/skills/` 验证触发与内容；
3. 提交信息建议：`feat: ...` / `fix: ...` / `docs: ...`，并在 README 版本段记 DSH 版本；
4. 新增 skill：`skills/<name>/SKILL.md`，frontmatter 必须有 `name`、`description`。

## 边界

- 覆盖/遮罩类方案必须带默认关闭的开关，DSH 升级后先回归再开；
- 不在注入层承载权限、凭据、业务写操作；
- 未在真机看到行为，不写“已完成”。

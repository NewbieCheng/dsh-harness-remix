# AGENTS.md — 维护本仓库的规则

> 本仓库是**规范仓库**：产出的是给别的 agent 读的 skill。这里的“正确”= 可验证、可重生成、不虚构。

## 1. 三条硬规则

1. **不虚构 API**。写进文档的每个服务/方法/槽，必须来自 `cordis_inspect`、源码行号，或本仓库 `COMPAT.md` 的已验证表。猜的写 `⛔ 待验证`。
2. **数字不手写**。槽数量、Factory 数量、token 数量一律来自生成物；`SKILL.md` 里只写“见生成表”。
3. **改了事实就重生成**：`extract-slots.mjs` → `sync-shared.mjs` → `verify-skills.mjs`，三步全绿才算改完。

## 2. 目录职责

| 路径 | 谁改 | 规则 |
|---|---|---|
| `skills/*/SKILL.md` | 人 | ≤320 行；只放决策树、铁律、工作流、文件地图 |
| `skills/*/reference/*.md` | 人 | 事实与配方；每条断言标来源 |
| `skills/*/reference/slots.generated.md` | **脚本** | 禁止手改 |
| `skills/*/reference/shared/*` | **脚本** | 禁止手改（改 `shared/`） |
| `skills/*/assets/*` | 人 | 必须能跑：后端骨架 `node --test` 全绿 |
| `shared/` | 人 | 两份 skill 都要用的内容 |
| `docs/CASE-*.md` | 人 | 只写真实源码里读到的模式，附文件路径 |

## 3. 改一个论断的流程

```text
1) 找到证据（inspect 结果 / 源码行号 / 真机行为）
2) 改 reference（不是改 SKILL.md 的结论段就完事）
3) node scripts/verify-skills.mjs
4) 若动到槽：重跑 extract-slots 并看 diff
5) 若动到 shared：sync-shared 后 verify
```

## 4. 验证标记

| 标记 | 含义 | 要求 |
|---|---|---|
| `✅` | 源码或真机确认 | 附来源（路径:行 / inspect） |
| `🟡` | 真机观察过，但未最小复现 | 写清“观察到”的场景 |
| `⛔` | 未验证 | 必须写“怎么验”，不能只写“不知道” |

## 5. 禁止

- 禁止把旧版结论原样搬进新版（`verify-skills` 的禁用词表就是为此）；
- 禁止为了“看起来完整”编造示例输出；
- 禁止在 `SKILL.md` 里堆 API 细节（下沉到 reference）；
- 禁止提交未跑过 `verify-skills` 的改动；
- 禁止把 `reference/` 里的文件在安装时丢掉（安装器必须递归复制）。

## 6. 提交

```
feat: 新增 X 配方与生成器
fix: 修正 conversation.input.model 的基数判定
docs: 重生成槽表（0.2.2-rc.3）
```

提交前：

```sh
node scripts/sync-shared.mjs --check
node scripts/verify-skills.mjs
(cd skills/dsh-plugin-backend/assets/skeleton-host && node --test --experimental-test-isolation=none tests/*.test.mjs)
```

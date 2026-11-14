# 最小可装 UI 插件（骨架）

> 复制这个目录 → 改成你的包名 → `npm i` → `npm run build` → `dsh plugin add ./`。
> 它做两件事：输入框右侧一个按钮、设置页一节。删掉不需要的，保留结构与清理。

## 目录

```
.
├─ package.json              # dsh.bundle + dsh.client 声明（关键）
├─ cordis.patch.yml          # 配置层：insert 一行
├─ src/index.js              # Host 半：一条鉴权路由
├─ src/client/index.ts       # Client 半：两个列表槽注册
├─ scripts/build-client.mjs  # esbuild → __ModuleLoader__ 产物
└─ lib/                      # 构建产物（git 忽略）
```

## 步骤

```sh
# 1) 改包名：package.json 的 name、cordis.patch.yml 的 name、src/index.js 的 name
# 2) 装依赖并构建
npm i
npm run build          # 产出 lib/index.js（无）+ lib/client.js（有包装）

# 3) 装进 profile
dsh plugin --profile desktop add ./

# 4) 确认这一层被应用
dsh --profile desktop --dump-config | grep -A2 "dsh-hello-ui"

# 5) 起界面
dsh --profile desktop
```

## 你应该看到

1. 输入框右侧多一个 “Hi” 按钮（有会话时才出现——`conversation.input.right` 是 `session` 作用域）；
2. 设置页多一节 “Hello UI”；
3. 点按钮触发 `dsh-hello-ui:pressed` 事件（控制台可监听）；
4. 停用插件后两者消失，官方界面完整回来。

## 改造成你的插件

| 想加什么 | 改哪里 | 用哪个槽 |
|---|---|---|
| 侧栏入口 | `src/client/index.ts` 再加一个 register | `sidebar.panellist` |
| 主区面板 | 同上 + `main`（key 与入口 id 一致） | `main`（键控） |
| 消息尾部贡献 | 同上 | `conversation.chat.turnTail` |
| 设置项 | 改现有 section 组件 | `settings.section` |
| 后端数据 | `src/index.js` 加路由或 typert | 见 `dsh-plugin-backend` skill |

## 自检

- [ ] `node -e "…startsWith('window.__ModuleLoader__.load')"` 通过（build 脚本已内置）
- [ ] `dsh --dump-config` 里能看到自己这一层
- [ ] 没会话时不崩（`session` 槽在无会话时不会挂载，这是正常的）
- [ ] 重复启停 3 次，按钮不重复
- [ ] 暗色下按钮可见（用的是 `--dsw-alias-*`）

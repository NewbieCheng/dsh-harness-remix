# 最小可装后端插件（骨架）

> 复制 → 改包名 → `npm test` → `dsh plugin add ./`。
> 它演示 Config、storageDomain 状态与两条路由；设置文件模块独立示范原子写，不在只读状态请求中使用。写路由的 loopback 守卫只适合该示例的本机部署，不代替认证和业务授权。

## 目录

```
.
├─ package.json          # dsh.bundle + engines.dsh
├─ cordis.patch.yml      # insert 一行，带 config
├─ index.js              # Cordis 装配：inject / effect / 路由 / domain
├─ src/logic.js          # 纯函数（校验、状态修复、本地写守卫）——被测试覆盖
├─ src/settings.js       # 原子写 JSON + 串行更新
├─ tests/*.test.mjs      # node --test，不碰网络/模型/真实 HOME
└─ README.md
```

## 跑起来

```sh
npm test                                   # 先跑纯函数与设置文件测试
dsh plugin --profile desktop add ./
dsh --profile desktop --dump-config | grep -A4 hello-host
dsh --profile desktop
```

## 接口

```text
GET  /api/dsh-hello-host/status            → { ok, greeting, hits }（只读）
POST /api/dsh-hello-host/greeting          → { ok, greeting, hits }
     header: x-dsh-hello-host: 1           （与 Config.trustHeader 一致）
     body:   { "greeting": "你好" }
```

两条都先过 `ctx.connection.requestRejection(request)`；写操作再过 `localWriteRejection`
（自定义头 + loopback + `sec-fetch-site` 同源 + Origin==Host）。

## 改成你的插件

| 要做的事 | 改哪里 |
|---|---|
| 加配置项 | `Config`（`index.js`）→ 自动出现在插件详情页 |
| 换存储结构 | `defineDomain` 的 `name/version/global.schema` |
| 换成 typert 通道 | 见 `reference/typert.md`；本骨架故意只用路由，保持零依赖 |
| 读会话/工作区 | 见 `reference/session-data.md` |
| 加客户端 | 用 `dsh-ui-extension` 的 skeleton |

## 自检

- [ ] `npm test` 全绿
- [ ] `--dump-config` 能看到 `hello-host` 行
- [ ] `curl` 状态接口返回 JSON（同源 + cookie）
- [ ] 无 `x-dsh-hello-host` 头的 POST 返回 403
- [ ] 停用插件后路由消失（再请求 404）

## 注意

- `index.js` 依赖 `@deepseek-ai/schemastery`、`@deepseek-ai/dsh-storage-domain`，它们由宿主提供（peer）；本骨架不打包它们。
- 纯函数与设置文件测试**不需要**这些依赖，所以 `npm test` 在任何机器上都能跑。

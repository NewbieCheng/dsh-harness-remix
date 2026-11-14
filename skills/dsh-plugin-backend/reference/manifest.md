# 清单、Profile 与安装

> 一个插件能不能被装进 DSH，不取决于代码写得多好，取决于两份清单：
> **bundle manifest**（这个包贡献什么）和 **profile manifest**（这套配置由哪些包组成）。

## 1. 两种包，一个问题各答一半

| 概念 | 位置 | `package.json` 里的键 | 回答 |
|---|---|---|---|
| **组合包（bundle）** | 你发布的 npm 包 | `dsh.bundle` | “我贡献哪一层配置？” |
| **profile** | `$DSH_HOME/profiles/<name>/` | `dsh.profile` | “启动时按什么顺序叠这些层？” |

**没有东西同时是两者。**

## 2. bundle manifest

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "files": ["lib", "cordis.patch.yml", "locale", "README.md"],
  "engines": { "dsh": ">=0.2.0-rc.1 <0.3.0-0" },
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-conversation"] }
  }
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `dsh.bundle.patch` | 是 | 一个路径或**有序数组**；相对包根解析 |
| `dsh.client` | 有浏览器半时 | `platform:'web'`；`inject` 是包名依赖；`external` 是共享表外的请求 |
| `engines.dsh` | 强烈建议 | SemVer 范围；不满足会被安装/启动拒绝 |
| `icon` / `description` | 建议 | 插件管理展示；icon ≤256 KiB 且在包内 |
| `files` | 发布时 | 漏了 `cordis.patch.yml` 就装不成 |

## 3. patch 写法

```yaml
# 最小：插一行
- insert:
    - id: my-plugin
      name: my-plugin

# 带配置
- insert:
    - id: my-plugin
      name: my-plugin
      config:
        port: 0
        mode: !!js ctx.profileContext?.mode ?? 'default'

# 覆盖别人的行（整块替换 config，不是深合并）
- id: llm-pi-ai
  config:
    providers: { … }      # 必须重述所有需要的键

# 停用某行
- id: ui-workspace
  disabled: false
```

`!!js` 表达式在对应行注入完成后求值，可以读已提供的服务（如 `ctx.myAppStartup.port`）。

## 4. 层序（后层胜）

```text
1. profile.dsh.profile.bundles 里各 bundle 的 patch（按顺序）
2. profile 自己的 cordis.patch.yml
3. $DSH_HOME/cordis.patch.yml（机器级偏好）
4. --patch <file>（命令行，按 argv 顺序）
```

推论：
- 你的 patch 可以覆盖前面层的行，但**必须重述该行所有需要的键**；
- 用户可以在自己 profile 里覆盖你的行，所以默认值要给“用户大概率会保留的”；
- 不要在 patch 里写密钥，写 `apiKeyEnv` 之类的引用。

## 5. 安装

```sh
dsh plugin --profile desktop add ./my-plugin        # 本地 checkout
dsh plugin --profile desktop add my-plugin@1.0.0    # npm
dsh plugin --profile desktop add ./my-plugin.tgz    # tarball
dsh plugin --profile desktop add github:you/repo#<sha>   # 源码（需要构建授权）
dsh plugin --profile desktop remove my-plugin
```

验证：

```sh
dsh --profile desktop --dump-config | grep -A3 "my-plugin"
```

出现 `# == my-plugin` 这一层才算加上。

## 6. 从 git 安装的坑

- 拉的是**源码**，不会跑你的 `build`；没有 `lib/` 就加载失败；
- 作者要给 `prepare` 脚本（自包含，不依赖 monorepo）；
- 用户要在 profile 的 `pnpm-workspace.yaml` 里授权 `allowBuilds: { my-plugin: true }`——**等于允许安装时执行任意代码**；
- 不想让用户授权就发 npm 或 tarball。

## 7. 发布前检查

```text
[ ] files 覆盖 lib/、cordis.patch.yml、locale、icon
[ ] engines.dsh 写了
[ ] main/exports 指向真实产物
[ ] dsh.bundle.patch 路径存在
[ ] 本机 dsh plugin add 过一遍，--dump-config 能看到层
[ ] 停用/卸载后 profile 里没有残留行
```

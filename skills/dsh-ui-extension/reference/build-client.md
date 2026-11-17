# 构建静态 client 半（`__ModuleLoader__` 契约）

> 静态插件 = npm 包 + 构建好的 `lib/client.js` + `dsh.client` 声明。
> 宿主不认识你的 TSX，只认一个东西：**执行时调用 `window.__ModuleLoader__.load({ id, factory })`**。

## 1. package.json 声明

```json
{
  "name": "my-plugin",
  "type": "module",
  "main": "lib/index.js",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "engines": { "dsh": ">=0.2.0-rc.1 <0.3.0-0" },
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"],
      "external": []
    }
  }
}
```

| 字段 | 作用 |
|---|---|
| `exports["./client"]` | 浏览器半入口；宿主按包名到 `/plugins/<pkg>/client.js` 提供 |
| `dsh.client.platform` | `web`（Web 客户端消费） |
| `dsh.client.inject` | **包名依赖**（不是 Cordis 服务注入），保证被依赖的 client 包先就绪 |
| `dsh.client.external` | 需要共享模块表之外的精确模块请求；纯类型 import 不留请求 |
| `dsh.bundle.patch` | 这个包贡献的配置层（可给数组，按序应用） |

## 2. 产物形状（照抄，不要自创）

源码构建时必须包成：

```js
window.__ModuleLoader__.load({
  id: "my-plugin",
  factory: (require) => {
    var module = { exports: {} }; var exports = module.exports;
    /* 你的打包结果，对外部模块用 require("react") 取 */
    return module.exports;
  }
});
```

- `id` = 包名；
- `factory` 内**不能有顶层副作用**（只有注册，首次物化才执行）；
- 外部依赖只能 `require` 共享模块表里的名字。

## 3. 共享模块表（可直接 import/require）

```
react, react/jsx-runtime, react-dom, react-dom/client,
@deepseek-ai/cordis, zod, @tanstack/react-virtual,
@deepseek-ai/dsh-client-store,
@deepseek-ai/dsh-client-ui-slots,
@deepseek-ai/dsh-client-ui-primitives,
@deepseek-ai/dsh-client-ui-dockkit
```

表外的模块：要么打进 bundle，要么登记到 `dsh.client.external`（由别的包提供）。

## 4. esbuild 最小构建脚本

```js
// scripts/build-client.mjs
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const banner =
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {\n` +
  `var module = { exports: {} }; var exports = module.exports;`
const footer = `\nreturn module.exports; } });`

await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  external: ['react', 'react-dom', 'react/jsx-runtime', '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives'],
  banner: { js: banner },
  footer: { js: footer },
  sourcemap: true,
  jsx: 'automatic',
})
```

产物自检：

```sh
node -e "const s=require('fs').readFileSync('lib/client.js','utf8'); if(!s.startsWith('window.__ModuleLoader__.load')) throw new Error('bad wrapper')"
```

⚠️ 官方第一方包用的是 tsdown + 内部 `clientBundle()`（`packages/client/tsdown.client.ts`），产出同样的 banner/intro/footer；esbuild 只是**等价替代**，用于不引入 DSH 构建链的第三方插件。

## 5. 样式

- 组件样式随包：`import './panel.css'` 会被 esbuild 抽成独立文件，但**宿主不会自动加载它**；
- 可靠做法：在 client 入口用 `document.head.append(<style>)` 注入一份带 `data-<plugin>` 标记的 CSS，并在 disposer 里移除；
- 动态包没有构建，用 `styles.insert(css)`（见 `Builtin` provider）。

## 6. Host 半与安装

```yaml
# cordis.patch.yml
- insert:
    - id: my-plugin
      name: my-plugin
```

```sh
pnpm build            # 产出 lib/index.js + lib/client.js
dsh plugin --profile desktop add ./      # 或 npm 发布后 add <pkg>
dsh --profile desktop --dump-config      # 应看到 "# == my-plugin" 一层
```

## 7. 生效路径

| 改了 | 要做什么 |
|---|---|
| client 源码 | 构建 → 刷新；只有同一 checkout 的对应 watcher 已确认运行且重建时才可依赖 HMR |
| host 源码（ESM，无 build） | Host 重载 → 刷新；被 import 的模块先 `touch` |
| `cordis.patch.yml` | 重新 `dsh plugin add` 或重启 Host |
| 只改 CSS 文件 | 若走运行时注入，保存+刷新；若打进 bundle，重新 build |

## 8. 常见失败

| 现象 | 原因 |
|---|---|
| 页面里完全没有你的代码 | `exports["./client"]` 没指到产物，或 `dsh.client` 没声明 |
| `Cannot read properties of undefined (reading '__ModuleLoader__')` | 打包时把 wrapper 打丢了（banner/footer 没加） |
| `require is not defined` | 产物用了 ESM 输出，没走 CJS + factory 形态 |
| React 两份、hooks 报错 | 把 react 打进 bundle 了（应在 external） |
| 插件装了但界面没变 | 没有 `insert` 行，或 id 与 patch 不一致 |

# 插件设置：自动表单与自定义页

> **默认什么都不用做**：导出 `Config`，DSH 就会在插件详情里生成表单。
> 只有“自动表单表达不了”时才写自定义 UI。

## 1. 自动表单（首选）

```js
import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  enabled: Schema.boolean().default(true),
  endpoint: Schema.string().default('https://example.com'),
  apiKeyEnv: Schema.string().default('MY_PLUGIN_KEY'),   // 存“环境变量名”，不存密钥
  mode: Schema.union(['fast', 'accurate']).default('fast'),
})

export function apply(ctx, config) { /* config 已校验并填好默认值 */ }
```

- 表单出现在**插件详情页**，字段来自 schema，标题/描述来自 schema 的 `.description()`；
- 写入落到 profile 的 `cordis.patch.yml`（对应行 `config:`），所以**层序覆盖规则照旧**；
- 用户改了配置 → `settings/document-updated`，运行中的实例会拿到新值（是否需要重启取决于你怎么读 `config`）。

## 2. 服务接口

```js
ctx.settings.describe()                       // 当前 profile 各行的表单描述符
ctx.settings.update(ns, patch, revision)      // 合并字段
ctx.settings.replace(ns, section, revision)   // 重置后再写
ctx.settings.mutate(ns, ops, revision)        // 按路径增删，保留未提交的秘密字段
ctx.settings.configure({ auto: false })       // 关掉本实例的自动页（要自己提供 UI 时）
```

- `ns` = profile 里的 entry id；
- `revision` 不匹配 → 冲突拒绝（乐观锁）；
- 标了 `role('secret')` 的字段**不会**出现在远程响应里。

## 3. 自定义设置页

自动表单不够（要图表、要列表、要按钮）时：

```js
// 1) Host：关掉自动页
export function apply(ctx) {
  ctx.effect(() => ctx.settings.configure({ auto: false }), 'my-plugin: settings policy')
}

// 2) Client：注册设置节（见 dsh-ui-extension 的 settings.section）
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: 'my-plugin', order: 50, label: () => '我的插件',
}, MySettingsSection))
```

自定义页的数据通道：**typert 或路由**，不要直接读写 `cordis.patch.yml`。

## 4. 什么时候用哪个

| 需求 | 方案 |
|---|---|
| 几个开关/字符串/枚举 | `Config` 自动表单 |
| 要预览、要分组、要按钮 | 自定义 `settings.section` + 自建通道 |
| 每会话/每工作区的独立设置 | 不要放 Config（它是全局的）；用 storageDomain 或会话级存储 |
| 密钥 | `apiKeyEnv` / `credentials`，永远不进表单明文 |

## 5. 反模式

- 把 `Config` 当“运行时数据库”频繁写（每次写都会改 profile 文件）；
- 在 `settings.section` 里再开一个全屏弹窗；
- 自定义页绕过 Host 直接读文件；
- 用 `default: ''` 表示“未设置”却不做空值处理。

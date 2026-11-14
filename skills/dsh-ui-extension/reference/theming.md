# 主题与样式

> 目标：让插件在亮/暗、桌面/浏览器、任何宿主语言下“看起来是原生的”。
> 做法只有一句话：**只用语义 token，不写颜色字面量，不做全局选择器。**

## 1. 主题 token（实测 14 个语义别名）

| token | 用途 | 必须亮暗两套 |
|---|---|---|
| `--dsw-alias-bg-base` | 应用底色 | 是 |
| `--dsw-alias-bg-layer-1` | 抬升面（卡片） | 是 |
| `--dsw-alias-bg-layer-2` | 嵌套面 | 是 |
| `--dsw-alias-bg-overlay` | 浮层/弹层底 | 是 |
| `--dsw-alias-border-l1` / `-l2` | 细/稍强描边 | 是 |
| `--dsw-alias-brand-primary` | 品牌强调 | 是 |
| `--dsw-alias-label-primary` / `-secondary` | 主/次文字 | 是 |
| `--dsw-alias-state-error-primary` / `-success-primary` / `-warn-primary` / `-idle-primary` | 状态色 | 是 |
| `--dsw-specific-sidebar-fill` | 侧栏/标题栏底 | 是 |

另有 `--dsw-elevation-panel` / `-prominent` / `-soft`（投影）与排版变量。**权威清单用实时查询**：

```text
cordis_inspect_query { platform:"client", provider:"Theme", method:"listTokens" }
```

## 2. 五条样式规则

1. **不写字面量**：`#fff`、`rgb(20 20 20)`、`hsl(...)` 一律换成 token；必须固定色时按 `[data-theme="dark"]` 各给一份。
2. **不做全局选择器**：所有规则挂在容器上，如 `[data-my-plugin] .row`；禁止裸 `button`、`div > *`。
3. **不重定义 token**：主题归 `ui-theme`；功能包只消费。
4. **高层表面**：`border: 0` + 投影（`--dsw-elevation-panel`）；中性描边一律 `0.5px`，不要和投影叠用。
5. **菜单/弹层用官方原语**：能用 `ui-primitives` 的 `Menu`/`Modal`/`Tooltip` 就不要自己搭；自定义内容用 `MenuSurface` 包裹，材质由主题决定。

## 3. 圆角与尺寸

- 圆角继承全局超椭圆平滑；正圆/胶囊（`50%`、`100%`）必须配对 `corner-shape: round`。
- 侧栏行高 42px（展开）/ 36px（rail）；输入工具行控件约 24–28px；设置卡片内边距与官方一致。
- 字号与行高成对使用；优先用主题排版变量，不手写 `font: 13px/18px`。

## 4. 层级

| 层 | z-index | 说明 |
|---|---|---|
| 壳内浮层（`shell.overlay`） | 30–100 | 不盖弹窗 |
| 自己的全屏覆盖 | ≤ 1100 | portal 到 body |
| 官方弹窗/通知 | ~1200 | 永远在你的上面 |

祖先常带 `overflow: hidden`（输入区、会话头、标题区），**`position: fixed` 的弹层必须 portal 到 `document.body`**。

## 5. 主题开关

如果插件提供换肤：
- 用 `data-my-plugin-theme="glass|solid"` 这类属性切换，而不是替换 token 值；
- 提供“恢复原生”开关，默认关闭覆盖；
- 交付说明里写清楚“覆盖了哪些 token/规则”。

## 6. 自检

- [ ] 亮/暗各一张截图；
- [ ] 切语言后文字不溢出（长德语/俄语）；
- [ ] 第三方插件带 tab 的卡片没有被拉伸；
- [ ] 弹层不被裁切、不盖官方弹窗；
- [ ] 关闭插件后页面与原生视觉一致。

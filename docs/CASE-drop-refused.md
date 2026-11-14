# 案例：文件拖不进窗口（光标是“禁止”）

> 场景：DSH 桌面端 + 自绘面板（跨源 iframe），把视频从资源管理器/微信拖进对话区无效；
> **同一个页面在 Chrome 里拖放正常**，还能看到高亮提示。
> 结论先行：页面代码没写错，是 **Windows 的 UIPI 在窗口层就把拖放拦掉了**；另一类常见原因是
> **iframe 的 `sandbox`**。这份记录的重点不是结论，而是“怎么在动手改代码前先证明事件到了哪一层”。

## 1. 拦截点只有五处，按顺序查

| # | 位置 | 典型症状 | 能否由插件修 |
|---|---|---|---|
| 1 | 窗口 → 渲染进程（OS/OLE） | 整窗“禁止”，DSH 自带输入框也不行 | ❌ 不能 |
| 2 | 页面 → 子框架（iframe `sandbox` / 跨源） | 只有那个 frame 没反应 | ✅ 能（自己创建的 frame） |
| 3 | 文档级处理（谁 `preventDefault`、谁设 `dropEffect='none'`） | 光标是“复制”但松手没反应 | ✅ 能 |
| 4 | 业务处理（附件/上传逻辑） | 有胶囊但发不出去 | ✅ 能 |
| 5 | 交付（复制字节 vs 引用路径） | 能发，但 Agent 报的路径不对 | ✅ 能 |

**关键**：第 1 层坏掉时，第 2–5 层的所有代码都是死的。先分层，再改代码。

## 2. 诊断：三层探针，先证明“事件到哪一层”

在**宿主页面**和**子 frame** 各自挂捕获阶段监听器，把第一次看到的拖拽写进 Host 日志
（每形状计数、限流、不记文件名与路径）：

```js
// 宿主页面（DSH 的文档）
for (const type of ['dragenter', 'dragover', 'drop']) {
  window.addEventListener(type, (event) => {
    const data = event.dataTransfer;
    const types = data ? [...data.types].join(',') : '';
    report({ layer: 'host', type, types, files: data?.files?.length ?? 0 });
  }, true);
}
// 子 frame 注入的脚本里同样挂一份，layer: 'shell'
```

判读表：

| 日志 | 结论 |
|---|---|
| 两层都只有 `boot`，拖拽时零记录 | 窗口没把事件交给渲染进程 → 查第 1 层 |
| `host` 有 `dragenter`、`shell` 没有 | 卡在 frame 边界 → 查第 2 层 |
| 两边都有、没有业务反应 | 第 3–4 层 |

三条必须遵守的探针纪律（我们各踩过一次）：

1. **不要按 `dataTransfer.types` 过滤**。外部拖拽在 hover 阶段 `types` 可能是空的，
   带过滤的探针会把要查的那类事件静默丢掉，日志“没有记录”于是变成假证据；
2. **上报端点必须落在页面自己的 origin 上**。宿主页面的 fetch 打到编辑器代理的通道只会 404，
   日志里连 `boot` 都没有——这不叫“没事件”，叫“探针没装上”；
3. **上报失败必须吞掉**。旧 Host 对未知通道回 403，未处理的 Promise 会被页面的错误遮罩抓成红框，
   用户看到的是“插件坏了”。

## 3. 真凶一：进程完整性级别（UIPI）—— 本案例的答案

Windows 的 **UIPI** 默认禁止较低完整性进程向较高完整性窗口投递拖放通知。实测同一台机器：

| 进程 | 令牌 |
|---|---|
| 桌面宿主（DSH 主窗口） | `integrity=high(elevated)`、`elevationType=full` |
| `explorer.exe` | `medium`、`elevated=False` |
| `chrome.exe` | `medium` |

于是：从资源管理器/微信（medium）拖到宿主窗口（high），**窗口连一条事件都收不到**；
而 Chrome（medium）里同一个页面拖放正常；`Ctrl+V` 也正常（剪贴板不走 UIPI）。

### 判定（可脚本化）

```powershell
# 需要 P/Invoke：OpenProcessToken + GetTokenInformation(TokenIntegrityLevel=25)
# integrity SID 的最后一节：0x1000 low / 0x2000 medium / 0x3000 high / 0x4000 system
```

跨语言、最省事的一行判据是 `net session`：**成功 = 当前令牌已提权**。把它写进 Host 启动日志
（`host-start.elevated`），以后“拖不进去”一行日志就能定性。

### 能不能在插件里修：不能

- `ChangeWindowMessageFilterEx` 只放行旧的 `WM_DROPFILES`，对 Chromium 使用的 **OLE 拖放**无效；
- Electron 没有“给 `webContents` 装原生 drop 处理器”的 API（**拖出**有：`webContents.startDrag`）。

修法只有一条：**让宿主 UI 以普通权限运行**（不要“以管理员身份运行”；经 Explorer 启动即是 medium）。

## 4. 真凶二：iframe 的 `sandbox`

自己创建的 iframe 若写了 `sandbox`（哪怕含 `allow-same-origin`），Chromium 会**拒绝桌面文件拖入**：
不是拒绝 drop，而是连 `dragover` 都不派发。页内拖拽不受影响，所以“看起来一切都好”。
去掉 `sandbox` 属性即可（保留 URL 校验与 `allow` 列表）。

## 5. 三个假线索（都被证据否掉了）

| 假线索 | 否掉它的证据 |
|---|---|
| Electron 原生层吞掉 drop | DSH 前端本身就在 `document` 上挂 `drop` 并读 `dataTransfer.files` |
| “只有输入框挂了 handler，整页没接” | 补上整页 handler 后仍然无效——事件根本没到 |
| 光标是“禁止”就说明没人接 | 也可能是页面自己设了 `dropEffect='none'`（DSH 的写法是 `canAcceptDrop ? 'copy' : 'none'`），两者外观一样 |

## 6. 第 1 层坏掉时的兜底（按可靠性排序）

1. **粘贴**：资源管理器 `Ctrl+C` → 输入框 `Ctrl+V`。跨 UIPI 仍然有效，实测可用；
2. **文件选择器**：点选即可，永远可用；
3. **父页面接住**：面板可见时由宿主页面显示覆盖层，`drop` 后把 `File[]` 用 `postMessage`
   交给子 frame（`window.__xxxAttachFiles`）。**不依赖子 frame 能否收到拖拽**；
4. **OS 级投递**：Windows「发送到」菜单项、或一个“素材收件箱”目录（资源管理器自己的 drop 目标）；
5. **换宿主**：同样的页面在浏览器里能拖——给出“用浏览器打开”的入口。

## 7. 交付前检查

- [ ] 拖不动时，先给结论还是先改代码？**先分层**（第 2 节的探针，10 分钟）；
- [ ] 探针无类型过滤、端点在本页 origin、失败不抛出；
- [ ] 宿主是否以管理员运行？`host-start.elevated` 是否记录；
- [ ] 自己创建的 iframe 是否带 `sandbox`；
- [ ] 兜底入口（粘贴/选择器/父页面接住）是否都可用；
- [ ] 文档写明“这是 OS/宿主限制，插件修不了”，而不是让用户反复重试。

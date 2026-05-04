## 目标

让游戏在任意手机宽高下完全自适应，去掉左右白边，操作区按比例缩放并可水平拖动。

## 一、启动页（消除左右白边）

`Tetris.tsx` 当前根容器 `maxWidth: "min(100vw, calc(100dvh * 430 / 844))"` 在宽屏手机上会被宽高比限死，导致两侧露出 body 背景。

修改：
- 把 `maxWidth` 限制只作用于"游戏运行容器"，启动页背景图改为渲染到 `position: fixed; inset: 0; width: 100vw; height: 100dvh` 的独立层（脱离父容器约束），`object-cover` 铺满整屏。
- `body` 背景色改为沙色（已是），并在 `index.html` 加 `<meta name="viewport" content="..., viewport-fit=cover">`，避免 iOS 安全区露白。

## 二、游戏页面整体布局（动态适配宽高）

去掉写死的 `430/844` 宽高比，改为纯响应式：
- 根容器：`width: 100vw; height: 100dvh; padding: env(safe-area-inset-*)`，不再设 `maxWidth`。
- 左右内边距由 `px-1.5` 改为 `px-[2px]`（一丝丝间距，让边框可见即可）。
- 中间主区改用 `flex` 三段式纵向布局，所有高度用 `flex-1 / min-h-0` 占满，不写死像素：

```text
┌─────────────────────────────── 100dvh ──┐
│ 顶部安全区 padding                       │
│ ┌─────────play row (flex-1) ──────────┐ │
│ │ Board (flex-1)        │ Sidebar(28%)│ │
│ │ 贴左 2px              │ 贴右 2px     │ │
│ └─────────────────────────────────────┘ │
│ Controller host (高度 = clamp(180,38vh,260)) │
│ 底部安全区 padding                       │
└─────────────────────────────────────────┘
```

- Sidebar 宽度由固定 `92px` 改为 `clamp(78px, 22vw, 110px)`，保证和右边贴边后边框可见。
- Board 容器 `min-w-0 flex-1`，Board 自身保留 `aspectRatio: COLS/ROWS`，会按可用高度等比缩放，自然撑满。

## 三、操作按钮区（核心修复）

重写 `Controller.tsx`：

1. **按钮排布修正**
   - 上排只放"旋转"，居中。
   - 下排为 `[左移][下落][右移]` + 同高的"瞬降"块，使用 `display:grid` `grid-template-columns: 1fr 1fr 1fr 1.1fr` 保证下排所有按钮**底边对齐**（瞬降高度 = 旋转 + gap + 普通按钮高度）。
   - 旋转按钮水平位置 = 下落按钮中心（用一个 grid 容器把旋转放到第二列正上方）。

2. **按钮尺寸/间距动态化**
   - 按钮：`width/height = clamp(44px, 11vw, 64px)`。
   - 左移/下落/右移之间 `gap = clamp(2px, 0.8vw, 4px)`（约现在的 1/3）。
   - 旋转 ↔ 下落的纵向 `gap` 与上面的横向 gap 相等。

3. **整体宽度 = 屏幕宽 60%**
   - 控制器 wrapper `width: 60vw; minWidth: 240px; maxWidth: 420px`。

4. **可水平拖动（修复不能动）**
   - 拖动手柄占整个顶部条 + 控制器空白区域；按钮自身用 `onPointerDown` + `stopPropagation` 不触发拖动。
   - 边界：父 host 宽度 = 100vw - 2*4px；`minX = 0`，`maxX = hostWidth - controllerWidth`。
   - 用 `pointer events` + `setPointerCapture`，并在 host 上用 `ResizeObserver` 监听宽度变化，重新 clamp 位置。
   - 父 host `position: relative; width: 100%`，控制器 `position: absolute; left: x`。

5. **不超出屏幕底部（自适应高度）**
   - Controller host 的高度 = 控制器实际高度（用 ref 测量后 setState），父 flex 布局保证 play row 占剩余空间。
   - 也即：先算出按钮高度 → 控制器总高 = 旋转高 + gap + 按钮高 + 顶部拖动条高 + padding；host 用这个高度，play row 自动收缩。
   - 配合根容器 `height: 100dvh + overflow: hidden`，杜绝溢出。

## 四、右侧侧栏微调

- 速度滑块容器和"暂停"按钮宽度跟随 sidebar `100%`。
- Sidebar 右边距改为 `2px`，让圆角边框紧贴右屏。
- 字号统一用 `clamp()`，避免在小屏溢出。

## 涉及文件

- `src/components/tetris/Tetris.tsx` — 根容器去掉宽高比锁定、启动页背景独立全屏层、布局改为纯 flex+clamp、host 高度由控制器实测决定。
- `src/components/tetris/Controller.tsx` — 重写：grid 排布让下排底边对齐、旋转居中对齐下落、按钮和间距 clamp、拖动手柄扩大、ResizeObserver 重新 clamp。
- `index.html` — viewport 加 `viewport-fit=cover`。

## 验证（实施后我会做）

用 `browser--set_viewport_size` 在 360x800 / 390x844 / 414x896 三种尺寸下截图，确认：
- 启动页四边无白边
- 游戏区/侧栏紧贴左右屏，边框可见
- 控制器：旋转在下落正上方、下排底边对齐、间距小、可左右拖动到屏幕两端、不超出底部
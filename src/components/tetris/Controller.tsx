/**
 * 游戏页面底部操作区：可左右拖动的半透明按钮容器，背景显示提示文案。
 */
import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCw } from "lucide-react";

/** 组件属性：五个操作回调、宿主宽度、高度上报、桌面键盘提示 */
interface Props {
  /** 左移一格 */
  onLeft: () => void;
  /** 右移一格 */
  onRight: () => void;
  /** 顺时针旋转 */
  onRotate: () => void;
  /** 软降一格 */
  onSoftDrop: () => void;
  /** 硬降到触底 */
  onHardDrop: () => void;
  /** 父容器像素宽度，用于限制拖动范围；宽度比例相对宿主而非 vw */
  hostWidth: number;
  /** 桌面宽屏时在按钮角标对应按键 */
  desktopUi?: boolean;
  /** 将实测高度回传给父组件以预留布局空间 */
  onHeight?: (h: number) => void;
}

/** 可拖动的俄罗斯方块操作控制器 */
export const Controller = ({
  onLeft,
  onRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  hostWidth,
  desktopUi = false,
  onHeight,
}: Props) => {
  /** 外层包裹元素引用，用于测量宽高 */
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  /** 水平偏移（像素），null 表示尚未初始化居中 */
  const [x, setX] = React.useState<number | null>(null);
  /** 控制器自身像素宽度 */
  const [width, setWidth] = React.useState(0);
  /** 拖动过程指针状态 */
  const dragState = React.useRef<{ startPointerX: number; startX: number; dragging: boolean } | null>(
    null
  );

  /** 监听尺寸变化并上报高度 */
  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setWidth(w);
      onHeight?.(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  /** 宿主或控制器宽度变化时重新居中或钳制位置 */
  React.useEffect(() => {
    if (hostWidth <= 0 || width <= 0) return;
    setX((prev) => {
      const max = Math.max(0, hostWidth - width);
      if (prev == null) return max / 2;
      return Math.min(Math.max(prev, 0), max);
    });
  }, [hostWidth, width]);

  /** 开始拖动：记录起点并捕获指针 */
  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = {
      startPointerX: e.clientX,
      startX: x ?? 0,
      dragging: true,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  /** 拖动中：按位移更新水平位置并钳制在合法区间 */
  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current;
    if (!s || !s.dragging) return;
    const max = Math.max(0, hostWidth - width);
    const next = s.startX + (e.clientX - s.startPointerX);
    setX(Math.min(Math.max(next, 0), max));
  };

  /** 结束拖动：释放指针捕获 */
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) dragState.current.dragging = false;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  /** 当前左边距（像素） */
  const left = x ?? 0;

  /** 控制器总宽相对宿主（避免误用整屏 vw）；格子尺寸用 cqw 相对操作条宽度，等价于手机全宽时的 vw，PC 手机框内比例正确 */
  const safeHost = Math.max(120, hostWidth);
  const ctrlWidth = Math.min(safeHost * 0.7, 460, safeHost - 8);
  /** 原先用 14.5vw / 1.12vw；改为 cqw 使缩放参照操作区宽度而非浏览器视口 */
  const rowH = "clamp(54px, 14.5cqw, 84px)";
  const gap = "clamp(4px, 1.12cqw, 8px)";

  return (
    <div
      ref={wrapperRef}
      className="absolute top-0 select-none rounded-2xl"
      style={{
        left,
        width: ctrlWidth,
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        background: "hsl(var(--sand) / 0.88)",
        border: "1px solid hsl(var(--stone) / 0.7)",
        boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.25)",
        padding: gap,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative w-full min-w-0 [container-type:inline-size]">
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-2 text-center leading-snug"
          style={{
            fontSize: "clamp(14px, 4.2cqw, 19px)",
            letterSpacing: "0.1em",
            color: "hsl(var(--foreground) / 0.13)",
          }}
          aria-hidden
        >
          ← 左右拖动调整位置 →
        </div>

        <div
          className="relative z-[1] grid min-h-0 w-full min-w-0"
          style={{
            gridTemplateColumns: `${rowH} ${rowH} ${rowH} minmax(48px, 1fr)`,
            gridTemplateRows: `${rowH} ${rowH}`,
            columnGap: gap,
            rowGap: gap,
            alignContent: "stretch",
          }}
        >
          <div className="min-h-0 min-w-0" />
          <CtrlBtn onPress={onRotate} label="旋转" hint={desktopUi ? "W" : undefined}>
            <RotateCw style={{ width: "56%", height: "56%" }} />
          </CtrlBtn>
          <div className="min-h-0 min-w-0" />
          <CtrlBtn
            onPress={onHardDrop}
            label="瞬降"
            hint={desktopUi ? "␣" : undefined}
            style={{ gridRow: "1 / span 2", gridColumn: "4", height: "100%" }}
          >
            <ChevronsDown style={{ width: "56%", height: "32%" }} />
          </CtrlBtn>

          <CtrlBtn onPress={onLeft} label="左移" hint={desktopUi ? "A" : undefined}>
            <ArrowLeft style={{ width: "56%", height: "56%" }} />
          </CtrlBtn>
          <CtrlBtn onPress={onSoftDrop} label="下落" hint={desktopUi ? "S" : undefined}>
            <ArrowDown style={{ width: "56%", height: "56%" }} />
          </CtrlBtn>
          <CtrlBtn onPress={onRight} label="右移" hint={desktopUi ? "D" : undefined}>
            <ArrowRight style={{ width: "56%", height: "56%" }} />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
};

/** 铺满栅格单元的半透明按钮；hint 为桌面键盘角标 */
const CtrlBtn = ({
  children,
  onPress,
  label,
  hint,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  hint?: string;
  style?: React.CSSProperties;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
      onPress();
    }}
    aria-label={label}
    className="relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-foreground transition-transform active:scale-95"
    style={{
      width: "100%",
      height: "100%",
      background: "hsl(var(--stone) / 0.38)",
      border: "1px solid hsl(var(--dust) / 0.35)",
      touchAction: "manipulation",
      ...style,
    }}
  >
    {hint ? (
      <span
        className="pointer-events-none absolute right-1 top-0.5 font-mono text-[9px] font-semibold leading-none text-foreground/55"
        aria-hidden
      >
        {hint}
      </span>
    ) : null}
    {children}
    <span style={{ fontSize: "clamp(10px, 2.6cqw, 13px)", lineHeight: 1 }} className="opacity-92">
      {label}
    </span>
  </button>
);

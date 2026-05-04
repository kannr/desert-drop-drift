import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCw } from "lucide-react";

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  /** Pixel bounds within the parent host that the controller can be dragged between */
  hostWidth: number;
  /** Reports the controller's measured height back to the parent so it can size the host */
  onHeight?: (h: number) => void;
}

export const Controller = ({
  onLeft,
  onRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  hostWidth,
  onHeight,
}: Props) => {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [x, setX] = React.useState<number | null>(null);
  const [width, setWidth] = React.useState(0);
  const dragState = React.useRef<{ startPointerX: number; startX: number; dragging: boolean } | null>(
    null
  );

  // Measure controller width + height
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

  // Center initially / re-clamp on host or controller resize
  React.useEffect(() => {
    if (hostWidth <= 0 || width <= 0) return;
    setX((prev) => {
      const max = Math.max(0, hostWidth - width);
      if (prev == null) return max / 2;
      return Math.min(Math.max(prev, 0), max);
    });
  }, [hostWidth, width]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = {
      startPointerX: e.clientX,
      startX: x ?? 0,
      dragging: true,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current;
    if (!s || !s.dragging) return;
    const max = Math.max(0, hostWidth - width);
    const next = s.startX + (e.clientX - s.startPointerX);
    setX(Math.min(Math.max(next, 0), max));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) dragState.current.dragging = false;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  const left = x ?? 0;

  // Sizes – clamp by viewport
  const btn = "clamp(44px, 11vw, 64px)";
  const gap = "clamp(2px, 0.9vw, 5px)";

  return (
    <div
      ref={wrapperRef}
      className="absolute top-0 select-none"
      style={{
        left,
        width: "min(60vw, 420px)",
        minWidth: 240,
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Drag handle (visual) */}
      <div
        className="cursor-grab rounded-t-2xl px-3 pb-1 pt-2 text-center active:cursor-grabbing"
        style={{
          background: "hsl(var(--sand) / 0.92)",
          border: "1px solid hsl(var(--stone) / 0.7)",
          borderBottom: "none",
        }}
      >
        <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "hsl(var(--dust) / 0.6)" }} />
        <div className="mt-1 text-[11px] tracking-[0.18em] text-foreground/55">← 拖动调整位置 →</div>
      </div>

      {/* Body */}
      <div
        className="rounded-b-2xl"
        style={{
          background: "hsl(var(--sand) / 0.92)",
          border: "1px solid hsl(var(--stone) / 0.7)",
          borderTop: "none",
          boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.25)",
          padding: gap,
        }}
      >
        {/* 4-column grid: cols 1-3 = left/down/right; col 4 = hard drop (tall) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${btn} ${btn} ${btn} 1fr`,
            gridTemplateRows: `${btn} ${btn}`,
            columnGap: gap,
            rowGap: gap,
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          {/* Row 1: empty, rotate (above down), empty, hard-drop spans both rows */}
          <div />
          <CtrlBtn onPress={onRotate} label="旋转" size={btn}>
            <RotateCw style={{ width: "55%", height: "55%" }} />
          </CtrlBtn>
          <div />
          <CtrlBtn
            onPress={onHardDrop}
            label="瞬降"
            size={btn}
            style={{ gridRow: "1 / span 2", height: "auto", width: "100%" }}
          >
            <ChevronsDown style={{ width: "55%", height: "30%" }} />
          </CtrlBtn>

          {/* Row 2 */}
          <CtrlBtn onPress={onLeft} label="左移" size={btn}>
            <ArrowLeft style={{ width: "55%", height: "55%" }} />
          </CtrlBtn>
          <CtrlBtn onPress={onSoftDrop} label="下落" size={btn}>
            <ArrowDown style={{ width: "55%", height: "55%" }} />
          </CtrlBtn>
          <CtrlBtn onPress={onRight} label="右移" size={btn}>
            <ArrowRight style={{ width: "55%", height: "55%" }} />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
};

const CtrlBtn = ({
  children,
  onPress,
  label,
  size,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  size: string;
  style?: React.CSSProperties;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
      onPress();
    }}
    aria-label={label}
    className="flex flex-col items-center justify-center gap-0.5 rounded-xl text-foreground transition-transform active:scale-95"
    style={{
      width: size,
      height: size,
      background: "hsl(var(--stone) / 0.72)",
      border: "1px solid hsl(var(--dust) / 0.42)",
      touchAction: "manipulation",
      ...style,
    }}
  >
    {children}
    <span style={{ fontSize: "clamp(10px, 2.4vw, 12px)", lineHeight: 1 }}>{label}</span>
  </button>
);

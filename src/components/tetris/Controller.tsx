import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCw } from "lucide-react";

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  /** Pixel bounds within the parent container that the controller can be dragged between */
  minX: number;
  maxX: number;
}

export const Controller = ({
  onLeft,
  onRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  minX,
  maxX,
}: Props) => {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const dragHandleRef = React.useRef<HTMLDivElement | null>(null);
  // Start centered between bounds
  const [x, setX] = React.useState<number | null>(null);
  const dragState = React.useRef<{ startPointerX: number; startX: number; dragging: boolean } | null>(
    null
  );

  // Initialise / clamp position whenever bounds change
  React.useEffect(() => {
    setX((prev) => {
      const center = (minX + maxX) / 2 - (wrapperRef.current?.offsetWidth ?? 0) / 2;
      if (prev == null) return center;
      const w = wrapperRef.current?.offsetWidth ?? 0;
      return Math.min(Math.max(prev, minX), maxX - w);
    });
  }, [minX, maxX]);

  const onPointerDown = (e: React.PointerEvent) => {
    const w = wrapperRef.current?.offsetWidth ?? 0;
    dragState.current = {
      startPointerX: e.clientX,
      startX: x ?? (minX + maxX) / 2 - w / 2,
      dragging: true,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current;
    if (!s || !s.dragging) return;
    const w = wrapperRef.current?.offsetWidth ?? 0;
    const next = s.startX + (e.clientX - s.startPointerX);
    const clamped = Math.min(Math.max(next, minX), maxX - w);
    setX(clamped);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) dragState.current.dragging = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const left = x ?? 0;

  return (
    <div
      ref={wrapperRef}
      className="absolute top-0 select-none"
      style={{
        left,
        width: "min(360px, calc(100% - 8px))",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div
        ref={dragHandleRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="cursor-grab rounded-t-2xl px-3 pb-1 pt-2 text-center active:cursor-grabbing"
        style={{
          background: "hsl(var(--sand) / 0.9)",
          border: "1px solid hsl(var(--stone) / 0.7)",
          borderBottom: "none",
          touchAction: "none",
        }}
      >
        <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "hsl(var(--dust) / 0.6)" }} />
        <div className="mt-1 text-[11px] tracking-[0.18em] text-foreground/55">← 拖动调整位置 →</div>
      </div>

      <div
        className="rounded-b-2xl px-3 pb-3 pt-2"
        style={{
          background: "hsl(var(--sand) / 0.9)",
          border: "1px solid hsl(var(--stone) / 0.7)",
          borderTop: "none",
          boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.25)",
        }}
      >
        {/* Rotate row */}
        <div className="mb-2 flex justify-center">
          <CtrlBtn onPress={onRotate} label="旋转">
            <RotateCw className="h-6 w-6" />
          </CtrlBtn>
        </div>

        {/* Action row: left / down / right + hard drop */}
        <div className="flex items-stretch justify-between gap-2">
          <div className="flex flex-1 items-center justify-between gap-2">
            <CtrlBtn onPress={onLeft} label="左移">
              <ArrowLeft className="h-6 w-6" />
            </CtrlBtn>
            <CtrlBtn onPress={onSoftDrop} label="下落">
              <ArrowDown className="h-6 w-6" />
            </CtrlBtn>
            <CtrlBtn onPress={onRight} label="右移">
              <ArrowRight className="h-6 w-6" />
            </CtrlBtn>
          </div>
          <CtrlBtn onPress={onHardDrop} label="瞬降" tall>
            <ChevronsDown className="h-7 w-7" />
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
  tall,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  tall?: boolean;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
      onPress();
    }}
    aria-label={label}
    className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl text-foreground transition-transform active:scale-95"
    style={{
      width: 60,
      height: tall ? 132 : 60,
      background: "hsl(var(--stone) / 0.72)",
      border: "1px solid hsl(var(--dust) / 0.42)",
      touchAction: "manipulation",
    }}
  >
    {children}
    <span className="text-[12px] leading-none">{label}</span>
  </button>
);

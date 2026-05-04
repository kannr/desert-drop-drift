import React from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCw } from "lucide-react";

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
}

export const Controller = ({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop }: Props) => {
  const constraintRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-3">
      <div ref={constraintRef} className="relative flex justify-center">
        <motion.div
          drag="x"
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={constraintRef}
          className="pointer-events-auto select-none rounded-[28px] px-3 pb-3 pt-2 cursor-grab active:cursor-grabbing"
          style={{
            width: "min(100%, 420px)",
            background: "hsl(var(--sand) / 0.82)",
            border: "1px solid hsl(var(--stone) / 0.7)",
            boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.22)",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          <div className="mb-2 text-center text-[clamp(10px,2.8vw,12px)] tracking-[0.18em] text-foreground/60">
            ← 拖动调整位置 →
          </div>

          <div
            className="mx-auto flex items-end justify-center"
            style={{
              gap: "clamp(8px, 2vw, 12px)",
            }}
          >
            <div
              className="grid grid-cols-3 justify-items-center"
              style={{
                gap: "clamp(8px, 2vw, 12px)",
              }}
            >
              <div />
              <CtrlBtn onPress={onRotate} label="旋转">
                <RotateCw style={{ width: "clamp(22px, 5.5vw, 30px)", height: "clamp(22px, 5.5vw, 30px)" }} />
              </CtrlBtn>
              <div />
              <CtrlBtn onPress={onLeft} label="左移">
                <ArrowLeft style={{ width: "clamp(22px, 5.5vw, 30px)", height: "clamp(22px, 5.5vw, 30px)" }} />
              </CtrlBtn>
              <CtrlBtn onPress={onSoftDrop} label="下落">
                <ArrowDown style={{ width: "clamp(22px, 5.5vw, 30px)", height: "clamp(22px, 5.5vw, 30px)" }} />
              </CtrlBtn>
              <CtrlBtn onPress={onRight} label="右移">
                <ArrowRight style={{ width: "clamp(22px, 5.5vw, 30px)", height: "clamp(22px, 5.5vw, 30px)" }} />
              </CtrlBtn>
            </div>

            <CtrlBtn onPress={onHardDrop} label="瞬降" wide>
              <ChevronsDown style={{ width: "clamp(24px, 6vw, 32px)", height: "clamp(24px, 6vw, 32px)" }} />
            </CtrlBtn>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const CtrlBtn = ({
  children,
  onPress,
  label,
  wide,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  wide?: boolean;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
      onPress();
    }}
    aria-label={label}
    className="flex shrink-0 flex-col items-center justify-center rounded-2xl text-foreground transition-transform active:scale-95"
    style={{
      width: wide ? "clamp(68px, 16vw, 84px)" : "clamp(56px, 14vw, 76px)",
      height: wide ? "clamp(112px, 27vw, 144px)" : "clamp(56px, 14vw, 76px)",
      minWidth: 0,
      background: "hsl(var(--stone) / 0.72)",
      border: "1px solid hsl(var(--dust) / 0.42)",
      touchAction: "manipulation",
      gap: "clamp(2px, 0.8vw, 6px)",
      paddingInline: "clamp(6px, 1.6vw, 12px)",
    }}
  >
    {children}
    <span className="text-[clamp(10px,2.7vw,14px)] leading-none">{label}</span>
  </button>
);

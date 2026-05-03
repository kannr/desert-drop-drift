import { motion, useDragControls } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Lock, RotateCw, Unlock } from "lucide-react";
import { useRef } from "react";

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  locked: boolean;
  onToggleLock: () => void;
}

export const Controller = ({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop, locked, onToggleLock }: Props) => {
  const constraintsRef = useRef<HTMLDivElement | null>(null);
  const controls = useDragControls();

  return (
    <div ref={(el) => (constraintsRef.current = el?.parentElement as HTMLDivElement)} className="pointer-events-none fixed inset-0 z-40">
      <motion.div
        drag={!locked}
        dragControls={controls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{ left: 8, right: 8, top: 8, bottom: 8 }}
        initial={{ x: 0, y: 0 }}
        className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 select-none rounded-2xl p-3 backdrop-blur-md"
        style={{
          background: "hsl(var(--sand) / 0.7)",
          border: "1px solid hsl(var(--stone) / 0.6)",
          boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.35)",
          touchAction: "none",
        }}
      >
        <div
          onPointerDown={(e) => !locked && controls.start(e)}
          className="mb-2 flex items-center justify-between gap-3 px-1"
          style={{ cursor: locked ? "default" : "grab" }}
        >
          <span className="text-xs font-medium text-[hsl(var(--deep-sand))]">
            {locked ? "已锁定" : "拖动调整位置"}
          </span>
          <button
            onClick={onToggleLock}
            className="rounded-md p-1 text-[hsl(var(--deep-sand))] hover:bg-[hsl(var(--stone)/0.4)]"
            aria-label="lock"
          >
            {locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div />
            <CtrlBtn onPress={onRotate} label="旋转"><RotateCw size={22} /></CtrlBtn>
            <div />
            <CtrlBtn onPress={onLeft} label="左移"><ArrowLeft size={22} /></CtrlBtn>
            <CtrlBtn onPress={onSoftDrop} label="下落"><ArrowDown size={22} /></CtrlBtn>
            <CtrlBtn onPress={onRight} label="右移"><ArrowRight size={22} /></CtrlBtn>
          </div>
          <CtrlBtn onPress={onHardDrop} label="瞬降" wide>
            <ChevronsDown size={26} />
          </CtrlBtn>
        </div>
      </motion.div>
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
    onPointerDown={(e) => {
      e.stopPropagation();
      onPress();
    }}
    aria-label={label}
    className="flex flex-col items-center justify-center rounded-xl text-[hsl(var(--deep-sand))] transition-transform active:scale-95"
    style={{
      width: wide ? 72 : 56,
      height: wide ? 96 : 56,
      background: "hsl(var(--stone) / 0.55)",
      border: "1px solid hsl(var(--dust) / 0.4)",
      touchAction: "none",
    }}
  >
    {children}
    <span className="mt-0.5 text-[10px]">{label}</span>
  </button>
);

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
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-30">
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{ left: -120, right: 120, top: 0, bottom: 0 }}
        className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 select-none rounded-2xl p-3 backdrop-blur-md cursor-grab active:cursor-grabbing"
        style={{
          background: "hsl(var(--sand) / 0.75)",
          border: "1px solid hsl(var(--stone) / 0.6)",
          boxShadow: "0 10px 30px -10px hsl(var(--deep-sand) / 0.35)",
          touchAction: "none",
        }}
      >
        <div className="mb-1 text-center text-[10px] tracking-widest text-[hsl(var(--dust))]">
          ← 拖动调整位置 →
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div />
            <CtrlBtn onPress={onRotate} label="旋转"><RotateCw size={20} /></CtrlBtn>
            <div />
            <CtrlBtn onPress={onLeft} label="左移"><ArrowLeft size={20} /></CtrlBtn>
            <CtrlBtn onPress={onSoftDrop} label="下落"><ArrowDown size={20} /></CtrlBtn>
            <CtrlBtn onPress={onRight} label="右移"><ArrowRight size={20} /></CtrlBtn>
          </div>
          <CtrlBtn onPress={onHardDrop} label="瞬降" wide>
            <ChevronsDown size={24} />
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
      width: wide ? 64 : 48,
      height: wide ? 84 : 48,
      background: "hsl(var(--stone) / 0.7)",
      border: "1px solid hsl(var(--dust) / 0.4)",
      touchAction: "none",
    }}
  >
    {children}
    <span className="mt-0.5 text-[10px]">{label}</span>
  </button>
);

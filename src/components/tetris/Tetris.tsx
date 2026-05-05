/**
 * 俄罗斯方块游戏根组件：启动页、主玩法区、侧边信息与底部操作区。
 */
import tetrisBg from "@/assets/tetris-bg.jpg";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { TetrisBoard } from "./Board";
import { Controller } from "./Controller";
import {
  Board,
  COLS,
  Piece,
  ROWS,
  clearLines,
  collides,
  dropInterval,
  emptyBoard,
  merge,
  randomPiece,
  rotate,
} from "./engine";

/** 三边留白的最小像素，低于此则压缩棋盘或侧栏 */
const PLAY_GAP_MIN = 4;
/** 信息栏目标宽度占玩法内容宽的比例（用于初值，最终以公式收紧） */
const SIDEBAR_FRAC = 0.246;
/** 信息栏宽度像素上下限 */
const SIDEBAR_W_MIN = 84;
const SIDEBAR_W_MAX = 132;

/**
 * 根据玩法区「内容宽度」与「行高」精确计算三等分留白与棋盘列宽、侧栏列宽。
 * 满足：G + boardW + G + sidebarW + G = W，且 boardW ≤ H×(COLS/ROWS)。
 */
function computePlayLayout(contentWidth: number, rowHeight: number) {
  const W = contentWidth;
  const H = rowHeight;
  const boardWCap = H * (COLS / ROWS);
  const fallback = { G: 6, boardW: Math.min(120, Math.floor(boardWCap)), sidebarW: 96 };
  if (W < 48 || H < 48) return fallback;

  let sidebarW = Math.min(SIDEBAR_W_MAX, Math.max(SIDEBAR_W_MIN, Math.round(W * SIDEBAR_FRAC)));
  /** 在不超过高度上限前提下，尽量留出三倍最小留白 */
  let boardW = Math.min(boardWCap, W - sidebarW - 3 * PLAY_GAP_MIN);
  if (boardW < 32) return fallback;

  let G = (W - boardW - sidebarW) / 3;

  /** 留白不足时：收缩侧栏与棋盘，使三等分仍成立 */
  if (G < PLAY_GAP_MIN) {
    sidebarW = Math.max(72, W - Math.floor(boardWCap) - 3 * PLAY_GAP_MIN);
    boardW = Math.min(boardWCap, W - sidebarW - 3 * PLAY_GAP_MIN);
    G = (W - boardW - sidebarW) / 3;
    if (G < PLAY_GAP_MIN) {
      G = PLAY_GAP_MIN;
      boardW = Math.min(boardWCap, W - sidebarW - 3 * G);
      sidebarW = Math.max(72, W - boardW - 3 * G);
      boardW = Math.min(boardWCap, W - sidebarW - 3 * G);
      G = (W - boardW - sidebarW) / 3;
    }
  }

  /** 高度上限约束 */
  if (boardW > boardWCap) boardW = boardWCap;

  /** 整数列宽后重算严格三等分留白（允许亚像素 G） */
  let bw = Math.floor(boardW);
  let sw = Math.floor(sidebarW);
  G = (W - bw - sw) / 3;
  while (G < PLAY_GAP_MIN && bw > 36) {
    bw -= 1;
    G = (W - bw - sw) / 3;
  }
  while (G < PLAY_GAP_MIN && sw > 72) {
    sw -= 1;
    G = (W - bw - sw) / 3;
  }

  return {
    G: Math.max(PLAY_GAP_MIN, G),
    boardW: bw,
    sidebarW: Math.max(72, sw),
  };
}

/** 导出游戏主界面组件 */
export const Tetris = () => {
  /** 固定棋盘格子状态 */
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  /** 当前下落的方块 */
  const [piece, setPiece] = useState<Piece | null>(null);
  /** 下一个将出场的方块 */
  const [next, setNext] = useState<Piece>(() => randomPiece());
  /** 累计得分 */
  const [score, setScore] = useState(0);
  /** 消除的总行数 */
  const [lines, setLines] = useState(0);
  /** 下落速度档位（1–10） */
  const [level, setLevel] = useState(3);
  /** 是否暂停 */
  const [paused, setPaused] = useState(false);
  /** 是否已开始过游戏 */
  const [started, setStarted] = useState(false);
  /** 是否游戏结束 */
  const [gameOver, setGameOver] = useState(false);
  /** 正在播放消除动画的行索引 */
  const [clearing, setClearing] = useState<number[]>([]);

  /** 即时读取最新棋盘，避免闭包陈旧 */
  const boardRef = useRef(board);
  /** 即时读取当前方块 */
  const pieceRef = useRef(piece);
  boardRef.current = board;
  pieceRef.current = piece;

  /** 从预览队列取出下一个方块并尝试生成 */
  const spawn = useCallback(() => {
    const p = next; // 使用队列头的方块作为当前块
    setNext(randomPiece()); // 立即补充下一个随机块
    if (collides(boardRef.current, p)) {
      setGameOver(true); // 出生即碰撞则判负
      setPiece(null);
    } else {
      setPiece(p); // 正常入场
    }
  }, [next]);

  /** 当前方块落地：合并棋盘、消行、计分并准备下一块 */
  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const merged = merge(boardRef.current, p); // 方块写入棋盘
    const { board: nb, cleared } = clearLines(merged); // 尝试消行
    if (cleared.length) {
      setClearing(cleared); // 标记动画行
      setTimeout(() => setClearing([]), 600); // 动画结束后清除标记
      const pts = [0, 100, 300, 500, 800][cleared.length] || 0; // 经典计分表
      setScore((s) => s + pts * level);
      setLines((l) => l + cleared.length);
    }
    setBoard(nb);
    setPiece(null);
    setTimeout(() => spawn(), 30); // 短暂间隔再生成下一块
  }, [level, spawn]);

  /** 尝试平移当前方块，成功返回 true */
  const move = useCallback((dx: number, dy: number) => {
    const p = pieceRef.current;
    if (!p) return false;
    if (!collides(boardRef.current, p, p.x + dx, p.y + dy)) {
      setPiece({ ...p, x: p.x + dx, y: p.y + dy }); // 无碰撞则更新坐标
      return true;
    }
    return false; // 受阻
  }, []);

  /** 软降：能下移则下移，否则锁定 */
  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    if (!move(0, 1)) lockPiece();
  }, [move, lockPiece]);

  /** 瞬降到最低并加分后锁定 */
  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    let ny = p.y;
    while (!collides(boardRef.current, p, p.x, ny + 1)) ny++; // 逐格下探到底
    setPiece({ ...p, y: ny });
    setScore((s) => s + (ny - p.y) * 2); // 硬降奖励分
    setTimeout(() => lockPiece(), 0);
  }, [lockPiece]);

  /** 顺时针旋转并做墙踢尝试 */
  const doRotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const rs = rotate(p.shape); // 旋转后的形状矩阵
    for (const off of [0, -1, 1, -2, 2]) {
      if (!collides(boardRef.current, p, p.x + off, p.y, rs)) {
        setPiece({ ...p, x: p.x + off, shape: rs }); // 墙踢偏移成功
        return;
      }
    }
  }, []);

  /** 自动下落定时器 */
  useEffect(() => {
    if (!started || paused || gameOver) return;
    const id = setInterval(() => softDrop(), dropInterval(level));
    return () => clearInterval(id);
  }, [level, paused, gameOver, started, softDrop]);

  /** 桌面端键盘备用操作 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || gameOver) return;
      if (e.key === "ArrowLeft") move(-1, 0); // 左
      else if (e.key === "ArrowRight") move(1, 0); // 右
      else if (e.key === "ArrowDown") softDrop(); // 软降
      else if (e.key === "ArrowUp") doRotate(); // 转
      else if (e.key === " ") {
        e.preventDefault(); // 防止页面滚动
        hardDrop(); // 空格硬降
      } else if (e.key === "p" || e.key === "P") setPaused((p) => !p); // 暂停切换
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, softDrop, doRotate, hardDrop, gameOver, started]);

  /** 重置状态并开始新一局 */
  const start = () => {
    setBoard(emptyBoard());
    setScore(0);
    setLines(0);
    setGameOver(false);
    setPaused(false);
    setNext(randomPiece());
    setPiece(randomPiece());
    setStarted(true);
  };

  /** 底部操作区宿主 DOM，用于测量可用宽度以限制拖动 */
  const controllerHostRef = useRef<HTMLDivElement | null>(null);
  /** 玩法区栅格容器，用于根据实际宽度计算三等分水平留白 */
  const playSectionRef = useRef<HTMLElement | null>(null);
  /** 宿主像素宽度 */
  const [hostWidth, setHostWidth] = useState(0);
  /** 控制器实测高度，避免裁切或留白 */
  const [controllerHeight, setControllerHeight] = useState(220);
  /** 玩法区精确布局：三等分留白 G、棋盘列宽、侧栏列宽（像素） */
  const [playLayout, setPlayLayout] = useState({ G: 6, boardW: 120, sidebarW: 96 });

  /** 用玩法区实测宽高重算布局；宽度取自容器 clientWidth（已反映屏幕与安全区内可用宽度） */
  useLayoutEffect(() => {
    const el = playSectionRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      setPlayLayout(computePlayLayout(w, h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("orientationchange", update);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", update);
      vv?.removeEventListener("resize", update);
    };
  }, []);

  /** 监听宿主宽度变化（含横竖屏） */
  useLayoutEffect(() => {
    const el = controllerHostRef.current;
    if (!el) return;
    const measure = () => setHostWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [started]);

  /** 根节点：整屏视口，沙漠背景色 */
  return (
    <main
      className="relative overflow-hidden"
      style={{
        width: "100vw",
        height: "100dvh",
        background: "hsl(var(--background))",
      }}
    >
      {/* 内层：安全区内 flex 列，上玩法下操作 */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          paddingTop: "max(6px, env(safe-area-inset-top))",
          paddingBottom: "max(6px, env(safe-area-inset-bottom))",
          // 左右取较大安全区，避免一侧凹槽导致「侧栏—屏边」视觉上偏窄
          paddingLeft: "max(2px, env(safe-area-inset-left), env(safe-area-inset-right))",
          paddingRight: "max(2px, env(safe-area-inset-left), env(safe-area-inset-right))",
          gap: 6,
        }}
      >
        {/* 五列栅格：左 gutter | 棋盘 | 中 gutter | 侧栏 | 右 gutter（像素三等分） */}
        <section
          ref={playSectionRef}
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: `${playLayout.G}px ${playLayout.boardW}px ${playLayout.G}px ${playLayout.sidebarW}px ${playLayout.G}px`,
          }}
        >
          {/* 左侧留白：与中线、右侧留白同为 G */}
          <div aria-hidden className="min-h-0" />
          {/* 游戏视觉区：与侧栏同高（栅格拉伸），棋盘按比例居中 */}
          <div className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden self-stretch">
            <div
              style={{
                width: playLayout.boardW,
                height: (playLayout.boardW * ROWS) / COLS,
              }}
            >
              <TetrisBoard board={board} piece={piece} clearingRows={clearing} />
            </div>
          </div>
          {/* 棋盘与信息栏之间留白：亦为 G */}
          <div aria-hidden className="min-h-0" />
          {/* 信息展示区：与棋盘列等高 */}
          <aside className="flex min-h-0 min-w-0 flex-col self-stretch overflow-hidden" style={{ gap: 6 }}>
            {/* 标题单行不换行 */}
            <h1
              className="whitespace-nowrap text-center font-medium leading-none text-foreground"
              style={{ fontSize: "clamp(12px, 3.4vw, 16px)", letterSpacing: "0.02em" }}
            >
              俄罗斯方块
            </h1>

            <Stat label="分数" value={score} />
            <Stat label="行数" value={lines} />
            <Stat label="等级" value={level} />

            {/* 垂直速度滑轨：占据侧栏剩余高度 */}
            <div
              className="flex min-h-0 flex-1 flex-col items-center rounded-lg"
              style={{
                background: "hsl(var(--stone) / 0.36)",
                border: "1px solid hsl(var(--stone) / 0.55)",
                padding: "6px 4px",
                gap: 4,
              }}
            >
              <div style={{ fontSize: "clamp(9px, 2.4vw, 11px)" }} className="text-foreground/65">速度</div>
              <div className="flex min-h-0 flex-1 items-stretch">
                <Slider
                  orientation="vertical"
                  min={1}
                  max={10}
                  step={1}
                  value={[level]}
                  onValueChange={(value) => setLevel(value[0] ?? 1)}
                  className="h-full"
                />
              </div>
              {/* 当前档位数字 */}
              <div style={{ fontSize: "clamp(10px, 2.6vw, 12px)" }} className="text-foreground/80">{level}</div>
            </div>

            {/* 暂停键靠下便于拇指点击 */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              disabled={!started || gameOver}
              className="flex items-center justify-center gap-1 rounded-lg text-foreground disabled:opacity-40"
              style={{
                background: "hsl(var(--stone) / 0.6)",
                border: "1px solid hsl(var(--stone) / 0.75)",
                height: "clamp(36px, 8vw, 44px)",
                fontSize: "clamp(11px, 2.8vw, 13px)",
              }}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused ? "继续" : "暂停"}</span>
            </button>
          </aside>
          {/* 右侧与屏幕边缘的等宽留白 */}
          <div aria-hidden className="min-h-0" />
        </section>

        {/* 操作区宿主：全宽，高度随控制器实测 */}
        <div
          ref={controllerHostRef}
          className="relative shrink-0"
          style={{ height: controllerHeight }}
        >
          {started && !gameOver && hostWidth > 0 && (
            <Controller
              onLeft={() => move(-1, 0)}
              onRight={() => move(1, 0)}
              onRotate={doRotate}
              onSoftDrop={softDrop}
              onHardDrop={hardDrop}
              hostWidth={hostWidth}
              onHeight={(h) => setControllerHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev))}
            />
          )}
        </div>
      </div>

      {/* 启动页：全屏背景与开始按钮 */}
      {!started && (
        <div className="fixed inset-0 z-50" style={{ width: "100vw", height: "100dvh" }}>
          {/* 启动页全屏背景图 */}
          <img
            src={tetrisBg}
            alt="俄罗斯方块"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 底部约五分之一区域放置开始按钮 */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ paddingBottom: "14vh" }}>
            <button
              type="button"
              onClick={start}
              className="rounded-full text-lg font-medium shadow-2xl transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--sand) / 0.95), hsl(var(--stone) / 0.95))",
                color: "hsl(var(--deep-sand))",
                border: "1px solid hsl(var(--sand))",
                boxShadow: "0 18px 40px -12px hsl(var(--deep-sand) / 0.5)",
                letterSpacing: "0.6em",
                padding: "14px 48px 14px 60px",
              }}
            >
              开始
            </button>
          </div>
        </div>
      )}

      {/* 结束遮罩与重新开始 */}
      {gameOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "hsl(var(--deep-sand) / 0.4)" }}
        >
          <div
            className="rounded-2xl px-8 py-6 text-center shadow-xl"
            style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--stone))" }}
          >
            <p className="mb-1 text-xl tracking-[0.3em] text-foreground">游戏结束</p>
            <p className="mb-4 text-xs text-foreground/60">最终得分 {score}</p>
            <button
              type="button"
              onClick={start}
              className="rounded-full px-6 py-2 text-sm tracking-widest"
              style={{ background: "hsl(var(--deep-sand))", color: "hsl(var(--background))" }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

/** 侧边单行统计卡片：分数项略增水平内边距以便微调侧栏视觉宽度 */
const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-lg text-center"
    style={{
      background: "hsl(var(--stone) / 0.4)",
      border: "1px solid hsl(var(--stone) / 0.55)",
      padding: label === "分数" ? "3px 5px" : "3px 4px",
    }}
  >
    {/* 指标名称 */}
    <div style={{ fontSize: "clamp(9px, 2.2vw, 11px)" }} className="text-foreground/55">{label}</div>
    {/* 指标数值 */}
    <div style={{ fontSize: "clamp(15px, 4.4vw, 20px)" }} className="font-light leading-tight text-foreground">{value}</div>
  </div>
);

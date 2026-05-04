import tetrisBg from "@/assets/tetris-bg.jpg";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { TetrisBoard } from "./Board";
import { Controller } from "./Controller";
import {
  Board,
  Piece,
  clearLines,
  collides,
  dropInterval,
  emptyBoard,
  merge,
  randomPiece,
  rotate,
} from "./engine";

export const Tetris = () => {
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [piece, setPiece] = useState<Piece | null>(null);
  const [next, setNext] = useState<Piece>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(3);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [clearing, setClearing] = useState<number[]>([]);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  boardRef.current = board;
  pieceRef.current = piece;

  const spawn = useCallback(() => {
    const p = next;
    setNext(randomPiece());
    if (collides(boardRef.current, p)) {
      setGameOver(true);
      setPiece(null);
    } else {
      setPiece(p);
    }
  }, [next]);

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const merged = merge(boardRef.current, p);
    const { board: nb, cleared } = clearLines(merged);
    if (cleared.length) {
      setClearing(cleared);
      setTimeout(() => setClearing([]), 600);
      const pts = [0, 100, 300, 500, 800][cleared.length] || 0;
      setScore((s) => s + pts * level);
      setLines((l) => l + cleared.length);
    }
    setBoard(nb);
    setPiece(null);
    setTimeout(() => spawn(), 30);
  }, [level, spawn]);

  const move = useCallback((dx: number, dy: number) => {
    const p = pieceRef.current;
    if (!p) return false;
    if (!collides(boardRef.current, p, p.x + dx, p.y + dy)) {
      setPiece({ ...p, x: p.x + dx, y: p.y + dy });
      return true;
    }
    return false;
  }, []);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    if (!move(0, 1)) lockPiece();
  }, [move, lockPiece]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    let ny = p.y;
    while (!collides(boardRef.current, p, p.x, ny + 1)) ny++;
    setPiece({ ...p, y: ny });
    setScore((s) => s + (ny - p.y) * 2);
    setTimeout(() => lockPiece(), 0);
  }, [lockPiece]);

  const doRotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const rs = rotate(p.shape);
    for (const off of [0, -1, 1, -2, 2]) {
      if (!collides(boardRef.current, p, p.x + off, p.y, rs)) {
        setPiece({ ...p, x: p.x + off, shape: rs });
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!started || paused || gameOver) return;
    const id = setInterval(() => softDrop(), dropInterval(level));
    return () => clearInterval(id);
  }, [level, paused, gameOver, started, softDrop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || gameOver) return;
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === "ArrowUp") doRotate();
      else if (e.key === " ") {
        e.preventDefault();
        hardDrop();
      } else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, softDrop, doRotate, hardDrop, gameOver, started]);

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

  return (
    <main
      className="relative mx-auto w-full overflow-hidden"
      style={{
        height: "100dvh",
        maxWidth: "min(100vw, calc(100dvh * 390 / 844))",
        background: "hsl(var(--background))",
      }}
    >
      <div className="absolute inset-0 flex flex-col px-3 pb-3 pt-3">
        <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(94px,24vw,116px)] gap-2.5">
          <div className="flex min-w-0 items-center justify-center overflow-hidden rounded-lg">
            <div className="h-full max-h-full w-full max-w-full">
              <TetrisBoard board={board} piece={piece} clearingRows={clearing} />
            </div>
          </div>

          <aside className="flex min-h-0 flex-col">
            <div className="pr-1">
              <h1
                className="whitespace-nowrap font-medium leading-none text-foreground"
                style={{ fontSize: "clamp(20px, 4.8vw, 30px)" }}
              >
                俄罗斯方块
              </h1>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Stat label="分数" value={score} />
              <Stat label="行数" value={lines} />
              <Stat label="等级" value={level} />
            </div>

            <div className="mt-auto flex flex-col gap-2 pb-1">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                disabled={!started || gameOver}
                className="flex h-12 items-center justify-center gap-2 rounded-lg text-sm text-foreground disabled:opacity-40"
                style={{ background: "hsl(var(--stone) / 0.58)", border: "1px solid hsl(var(--stone) / 0.75)" }}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
                <span>{paused ? "继续" : "暂停"}</span>
              </button>

              <div
                className="rounded-lg px-3 py-3"
                style={{ background: "hsl(var(--stone) / 0.36)", border: "1px solid hsl(var(--stone) / 0.55)" }}
              >
                <div className="mb-3 text-[clamp(11px,2.6vw,13px)] text-foreground/65">速度</div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[level]}
                  onValueChange={(value) => setLevel(value[0] ?? 1)}
                />
                <div className="mt-2 text-right text-[clamp(12px,2.8vw,14px)] text-foreground/80">{level}</div>
              </div>
            </div>
          </aside>
        </section>

        <div className="relative mt-2 h-[clamp(176px,27vh,230px)] shrink-0">
          {started && !gameOver && (
            <Controller
              onLeft={() => move(-1, 0)}
              onRight={() => move(1, 0)}
              onRotate={doRotate}
              onSoftDrop={softDrop}
              onHardDrop={hardDrop}
            />
          )}
        </div>
      </div>

      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <img
            src={tetrisBg}
            alt="经典俄罗斯方块背景"
            width={768}
            height={1280}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(var(--deep-sand) / 0.18), hsl(var(--deep-sand) / 0.45))" }} />
          <div className="relative flex flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-[clamp(26px,8vw,40px)] font-medium tracking-[0.08em] text-primary-foreground">
              俄罗斯方块
            </h2>
            <button
              type="button"
              onClick={start}
              className="rounded-full px-10 py-4 text-lg tracking-[0.3em] shadow-lg"
              style={{ background: "hsl(var(--background) / 0.92)", color: "hsl(var(--deep-sand))" }}
            >
              开始
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(var(--deep-sand) / 0.4)" }}>
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

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-lg px-2 py-2 text-center"
    style={{ background: "hsl(var(--stone) / 0.4)", border: "1px solid hsl(var(--stone) / 0.55)" }}
  >
    <div className="text-[clamp(11px,2.7vw,13px)] text-foreground/55">{label}</div>
    <div className="text-[clamp(22px,5vw,34px)] font-light leading-tight text-foreground">{value}</div>
  </div>
);

import tetrisBg from "@/assets/tetris-bg.jpg";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  // ===== Layout: measure play area to constrain controller drag =====
  const playRowRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<{ minX: number; maxX: number }>({ minX: 0, maxX: 0 });
  const controllerHostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const host = controllerHostRef.current;
      const row = playRowRef.current;
      if (!host || !row) return;
      const hostRect = host.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      setBounds({
        minX: rowRect.left - hostRect.left,
        maxX: rowRect.right - hostRect.left,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [started]);

  return (
    <main
      className="relative mx-auto w-full overflow-hidden"
      style={{
        height: "100dvh",
        maxWidth: "min(100vw, calc(100dvh * 430 / 844))",
        background: "hsl(var(--background))",
      }}
    >
      <div className="absolute inset-0 flex flex-col px-1.5 pb-2 pt-2">
        <section
          ref={playRowRef}
          className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_92px] gap-2"
        >
          {/* Game board */}
          <div className="flex min-w-0 items-stretch justify-center overflow-hidden">
            <div className="flex h-full w-full items-center justify-center">
              <TetrisBoard board={board} piece={piece} clearingRows={clearing} />
            </div>
          </div>

          {/* Sidebar — same height as play area */}
          <aside className="flex min-h-0 flex-col gap-2">
            <h1
              className="whitespace-nowrap text-center font-medium leading-none text-foreground"
              style={{ fontSize: 15, letterSpacing: "0.02em" }}
            >
              俄罗斯方块
            </h1>

            <Stat label="分数" value={score} />
            <Stat label="行数" value={lines} />
            <Stat label="等级" value={level} />

            {/* Vertical speed slider — fills remaining vertical space */}
            <div
              className="flex min-h-0 flex-1 flex-col items-center gap-2 rounded-lg px-2 py-2"
              style={{ background: "hsl(var(--stone) / 0.36)", border: "1px solid hsl(var(--stone) / 0.55)" }}
            >
              <div className="text-[11px] text-foreground/65">速度</div>
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
              <div className="text-[12px] text-foreground/80">{level}</div>
            </div>

            {/* Pause at bottom for thumb reach */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              disabled={!started || gameOver}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg text-[13px] text-foreground disabled:opacity-40"
              style={{ background: "hsl(var(--stone) / 0.6)", border: "1px solid hsl(var(--stone) / 0.75)" }}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              <span>{paused ? "继续" : "暂停"}</span>
            </button>
          </aside>
        </section>

        {/* Controller host — width matches the play row exactly */}
        <div ref={controllerHostRef} className="relative mt-2 h-[228px] shrink-0">
          {started && !gameOver && bounds.maxX > bounds.minX && (
            <Controller
              onLeft={() => move(-1, 0)}
              onRight={() => move(1, 0)}
              onRotate={doRotate}
              onSoftDrop={softDrop}
              onHardDrop={hardDrop}
              minX={bounds.minX}
              maxX={bounds.maxX}
            />
          )}
        </div>
      </div>

      {/* Start screen — full bleed background */}
      {!started && (
        <div className="absolute inset-0 z-50">
          <img
            src={tetrisBg}
            alt="俄罗斯方块"
            width={1024}
            height={1536}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[14vh]">
            <button
              type="button"
              onClick={start}
              className="rounded-full px-12 py-4 text-lg font-medium tracking-[0.5em] shadow-2xl transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--sand) / 0.95), hsl(var(--stone) / 0.95))",
                color: "hsl(var(--deep-sand))",
                border: "1px solid hsl(var(--sand))",
                boxShadow: "0 18px 40px -12px hsl(var(--deep-sand) / 0.5)",
                letterSpacing: "0.6em",
                paddingLeft: "3.2rem",
              }}
            >
              开始
            </button>
          </div>
        </div>
      )}

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

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-lg px-1 py-1 text-center"
    style={{ background: "hsl(var(--stone) / 0.4)", border: "1px solid hsl(var(--stone) / 0.55)" }}
  >
    <div className="text-[10px] text-foreground/55">{label}</div>
    <div className="text-[20px] font-light leading-tight text-foreground">{value}</div>
  </div>
);

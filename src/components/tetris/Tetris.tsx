import { useCallback, useEffect, useRef, useState } from "react";
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

  // gravity
  useEffect(() => {
    if (!started || paused || gameOver) return;
    const id = setInterval(() => softDrop(), dropInterval(level));
    return () => clearInterval(id);
  }, [level, paused, gameOver, started, softDrop]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || gameOver) return;
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === "ArrowUp") doRotate();
      else if (e.key === " ") { e.preventDefault(); hardDrop(); }
      else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
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
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh", background: "hsl(var(--sand))" }}
    >
      {/* Top: board + sidebar */}
      <div className="absolute inset-x-0 top-0 bottom-40 flex gap-3 px-3 pt-3">
        {/* Board area */}
        <div className="flex flex-1 items-center justify-center min-w-0">
          <TetrisBoard board={board} piece={piece} clearingRows={clearing} />
        </div>

        {/* Sidebar */}
        <aside className="flex w-24 flex-col gap-2">
          <div>
            <h1 className="text-sm font-medium tracking-widest text-[hsl(var(--deep-sand))] leading-tight">
              俄罗斯<br />方块
            </h1>
          </div>
          <Stat label="分数" value={score} />
          <Stat label="行数" value={lines} />
          <Stat label="等级" value={level} />
          <button
            onClick={() => setPaused((p) => !p)}
            disabled={!started || gameOver}
            className="rounded-md py-1 text-xs text-[hsl(var(--deep-sand))] disabled:opacity-40"
            style={{ background: "hsl(var(--stone) / 0.6)" }}
          >
            {paused ? "继续" : "暂停"}
          </button>
          <div className="rounded-md p-2" style={{ background: "hsl(var(--stone) / 0.4)" }}>
            <div className="mb-1 text-[10px] tracking-widest text-[hsl(var(--dust))]">速度</div>
            <input
              type="range"
              min={1}
              max={10}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full accent-[hsl(var(--deep-sand))]"
            />
            <div className="text-right text-[10px] text-[hsl(var(--deep-sand))]">{level}</div>
          </div>
        </aside>
      </div>

      {/* Controller area (bottom 160px) */}
      {started && !gameOver && (
        <Controller
          onLeft={() => move(-1, 0)}
          onRight={() => move(1, 0)}
          onRotate={doRotate}
          onSoftDrop={softDrop}
          onHardDrop={hardDrop}
        />
      )}

      {/* Start overlay */}
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: "hsl(var(--sand) / 0.6)" }}>
          <button
            onClick={start}
            className="rounded-full px-10 py-4 text-lg tracking-[0.3em] shadow-lg"
            style={{ background: "hsl(var(--deep-sand))", color: "hsl(var(--sand))" }}
          >
            开始
          </button>
        </div>
      )}

      {/* Game over modal */}
      {gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(var(--deep-sand) / 0.4)" }}>
          <div
            className="rounded-2xl px-8 py-6 text-center shadow-xl"
            style={{ background: "hsl(var(--sand))", border: "1px solid hsl(var(--stone))" }}
          >
            <p className="mb-1 text-xl tracking-[0.3em] text-[hsl(var(--deep-sand))]">游戏结束</p>
            <p className="mb-4 text-xs text-[hsl(var(--dust))]">最终得分 {score}</p>
            <button
              onClick={start}
              className="rounded-full px-6 py-2 text-sm tracking-widest"
              style={{ background: "hsl(var(--deep-sand))", color: "hsl(var(--sand))" }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-md px-2 py-1 text-center"
    style={{ background: "hsl(var(--stone) / 0.4)", border: "1px solid hsl(var(--stone) / 0.5)" }}
  >
    <div className="text-[10px] tracking-widest text-[hsl(var(--dust))]">{label}</div>
    <div className="text-base font-light text-[hsl(var(--deep-sand))]">{value}</div>
  </div>
);

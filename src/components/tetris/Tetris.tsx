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
  const [piece, setPiece] = useState<Piece | null>(() => randomPiece());
  const [next, setNext] = useState<Piece>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(3);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [locked, setLocked] = useState(false);
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
    if (paused || gameOver) return;
    const id = setInterval(() => softDrop(), dropInterval(level));
    return () => clearInterval(id);
  }, [level, paused, gameOver, softDrop]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === "ArrowUp") doRotate();
      else if (e.key === " ") { e.preventDefault(); hardDrop(); }
      else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, softDrop, doRotate, hardDrop, gameOver]);

  const reset = () => {
    setBoard(emptyBoard());
    setScore(0);
    setLines(0);
    setGameOver(false);
    setPiece(randomPiece());
    setNext(randomPiece());
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "hsl(var(--sand))" }}>
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-6 pb-48">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.2em] text-[hsl(var(--deep-sand))]">沙 漠 · TETRIS</h1>
            <p className="text-xs tracking-widest text-[hsl(var(--dust))]">DESERT MINIMAL</p>
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-md px-3 py-1 text-xs text-[hsl(var(--deep-sand))]"
            style={{ background: "hsl(var(--stone) / 0.5)" }}
          >
            {paused ? "继续" : "暂停"}
          </button>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="分数" value={score} />
          <Stat label="行数" value={lines} />
          <Stat label="等级" value={level} />
        </div>

        <TetrisBoard board={board} piece={piece} clearingRows={clearing} />

        <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "hsl(var(--stone) / 0.35)" }}>
          <span className="text-xs text-[hsl(var(--deep-sand))]">速度</span>
          <input
            type="range"
            min={1}
            max={10}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--deep-sand))]"
          />
          <span className="w-6 text-right text-xs font-medium text-[hsl(var(--deep-sand))]">{level}</span>
        </div>

        {gameOver && (
          <div className="rounded-lg p-4 text-center" style={{ background: "hsl(var(--deep-sand))", color: "hsl(var(--sand))" }}>
            <p className="mb-2 text-lg tracking-widest">游戏结束</p>
            <button onClick={reset} className="rounded-md px-4 py-1 text-sm" style={{ background: "hsl(var(--stone))", color: "hsl(var(--deep-sand))" }}>
              重新开始
            </button>
          </div>
        )}
      </div>

      <Controller
        onLeft={() => move(-1, 0)}
        onRight={() => move(1, 0)}
        onRotate={doRotate}
        onSoftDrop={softDrop}
        onHardDrop={hardDrop}
        locked={locked}
        onToggleLock={() => setLocked((l) => !l)}
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-lg px-3 py-2 text-center"
    style={{ background: "hsl(var(--stone) / 0.4)", border: "1px solid hsl(var(--stone) / 0.6)" }}
  >
    <div className="text-[10px] tracking-widest text-[hsl(var(--dust))]">{label}</div>
    <div className="text-xl font-light text-[hsl(var(--deep-sand))]">{value}</div>
  </div>
);

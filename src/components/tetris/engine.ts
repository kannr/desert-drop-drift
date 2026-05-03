export const COLS = 10;
export const ROWS = 20;

export type Cell = string | 0;
export type Board = Cell[][];

export const PIECES: Record<string, { shape: number[][]; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: "var(--stone)" },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: "var(--deep-sand)" },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: "var(--dust)" },
  O: { shape: [[1, 1], [1, 1]], color: "var(--stone)" },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: "var(--deep-sand)" },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: "var(--dust)" },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: "var(--deep-sand)" },
};

export const PIECE_KEYS = Object.keys(PIECES);

export type Piece = {
  key: string;
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

export function randomPiece(): Piece {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const def = PIECES[key];
  return {
    key,
    shape: def.shape.map((r) => [...r]),
    color: def.color,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0,
  };
}

export function rotate(shape: number[][]): number[][] {
  const N = shape.length;
  const M = shape[0].length;
  const out: number[][] = Array.from({ length: M }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++)
    for (let c = 0; c < M; c++) out[c][N - 1 - r] = shape[r][c];
  return out;
}

export function collides(board: Board, piece: Piece, nx = piece.x, ny = piece.y, shape = piece.shape): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = nx + c;
      const y = ny + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}

export function merge(board: Board, piece: Piece): Board {
  const nb = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) {
        const y = piece.y + r;
        const x = piece.x + c;
        if (y >= 0) nb[y][x] = piece.color;
      }
  return nb;
}

export function clearLines(board: Board): { board: Board; cleared: number[] } {
  const cleared: number[] = [];
  const kept = board.filter((row, idx) => {
    const full = row.every((c) => c !== 0);
    if (full) cleared.push(idx);
    return !full;
  });
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0) as Cell[]);
  return { board: kept, cleared };
}

export function dropInterval(level: number): number {
  // level 1..10 → 800ms..80ms
  const l = Math.max(1, Math.min(10, level));
  return Math.round(800 - (l - 1) * 80);
}

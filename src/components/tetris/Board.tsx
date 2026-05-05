import { Board as BoardT, COLS, Piece, ROWS } from "./engine";

interface Props {
  board: BoardT;
  piece: Piece | null;
  clearingRows: number[];
}

export const TetrisBoard = ({ board, piece, clearingRows }: Props) => {
  const display = board.map((row) => [...row]);
  if (piece) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const y = piece.y + r;
          const x = piece.x + c;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) display[y][x] = piece.color;
        }
  }

  /** 外框与边框由 Tetris 棋盘列宿主统一提供，此处仅占满父级像素尺寸 */
  return (
    <div className="relative h-full w-full min-h-0">
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {display.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className="desert-grid-cell relative"
              style={{
                background: cell ? `hsl(${cell})` : "transparent",
                borderRadius: cell ? 3 : 0,
              }}
            >
              {clearingRows.includes(ri) && (
                <span
                  className="animate-dustpuff pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: "hsl(var(--dust) / 0.6)" }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

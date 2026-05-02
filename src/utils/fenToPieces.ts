import { getPieceImage, Piece, PieceRole, TeamType } from "@/Constants";

const FEN_TO_ROLE: Record<string, PieceRole> = {
  P: PieceRole.Pawn,
  N: PieceRole.Knight,
  B: PieceRole.Bishop,
  R: PieceRole.Rook,
  Q: PieceRole.Queen,
  K: PieceRole.King,
};

export function fenToPieces(fen: string): Piece[] {
  const [position, , castling = "KQkq"] = fen.split(" ");
  const rows = position.split("/");
  const pieces: Piece[] = [];

  const wKingMoved = !castling.includes("K") && !castling.includes("Q");
  const bKingMoved = !castling.includes("k") && !castling.includes("q");
  const wRookKMoved = !castling.includes("K");
  const wRookQMoved = !castling.includes("Q");
  const bRookKMoved = !castling.includes("k");
  const bRookQMoved = !castling.includes("q");

  rows.forEach((row, rowIndex) => {
    const y = 7 - rowIndex; // rank8=y7, rank1=y0
    let x = 0;

    for (const ch of row) {
      const n = parseInt(ch);
      if (!isNaN(n)) {
        x += n;
        continue;
      }

      const isWhite = ch === ch.toUpperCase();
      const team = isWhite ? TeamType.OUR : TeamType.OPPONENT;
      const role = FEN_TO_ROLE[ch.toUpperCase()];
      const type = isWhite ? "White" : "Black";

      let hasMoved = true;
      if (role === PieceRole.King) {
        hasMoved = isWhite ? wKingMoved : bKingMoved;
      } else if (role === PieceRole.Rook) {
        if (isWhite) {
          if (x === 7 && y === 0) hasMoved = wRookKMoved;
          else if (x === 0 && y === 0) hasMoved = wRookQMoved;
        } else {
          if (x === 7 && y === 7) hasMoved = bRookKMoved;
          else if (x === 0 && y === 7) hasMoved = bRookQMoved;
        }
      }

      pieces.push({
        id: `${ch}-${x}-${y}`,
        image: getPieceImage(PieceRole[role], type),
        x,
        y,
        role,
        team,
        hasMoved,
      });
      x++;
    }
  });

  return pieces;
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
export const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const PIECE_ICONS: Record<string, string> = {
  "pawn-white": "♙",
  "pawn-black": "♟",
  "rook-white": "♖",
  "rook-black": "♜",
  "knight-white": "♘",
  "knight-black": "♞",
  "bishop-white": "♗",
  "bishop-black": "♝",
  "queen-white": "♕",
  "queen-black": "♛",
  "king-white": "♔",
  "king-black": "♚",
};

export enum TeamType {
  OPPONENT,
  OUR,
}

export enum PieceRole {
  Bishop,
  King,
  Knight,
  Pawn,
  Queen,
  Rook,
}

export type Piece = {
  id: string;
  image: string;
  x: number;
  y: number;
  role: PieceRole;
  team: TeamType;
};

export function getPieceImage(name: string, type: string) {
  return `/pieces/Light/${name}, ${type}.png`;
}

export default function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let p = 0; p < 2; p++) {
    const teamType = p === 0 ? TeamType.OPPONENT : TeamType.OUR;
    const type = teamType === TeamType.OPPONENT ? "Black" : "White";

    const y = teamType === TeamType.OPPONENT ? 7 : 0;

    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 0,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 1,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 2,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Queen", type),
      role: PieceRole.Queen,
      team: teamType,
      x: 3,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("King", type),
      role: PieceRole.King,
      team: teamType,
      x: 4,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 5,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 6,
      y: y,
    });
    pieces.push({
     id: crypto.randomUUID(),
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 7,
      y: y,
    });
  }

  for (let i = 0; i < 8; i++) {
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Pawn", "Black"),
      role: PieceRole.Pawn,
      team: TeamType.OPPONENT,
      x: i,
      y: 6,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Pawn", "White"),
      role: PieceRole.Pawn,
      team: TeamType.OUR,
      x: i,
      y: 1,
    });
  }

  return pieces;
}
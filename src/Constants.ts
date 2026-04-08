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

function getPieceImage(name: string, type: string) {
  return `/pieces/Light/${name}, ${type}.png`;
}

export default function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let p = 0; p < 2; p++) {
    const teamType = p === 0 ? TeamType.OPPONENT : TeamType.OUR;
    const type = teamType === TeamType.OPPONENT ? "Black" : "White";

    const y = teamType === TeamType.OPPONENT ? 7 : 0;

    pieces.push({
      id: `rook-${type}-0`,
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 0,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-1`,
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 1,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-2`,
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 2,
      y: y,
    });
    pieces.push({
      id: `queen-${type}-3`,
      image: getPieceImage("Queen", type),
      role: PieceRole.Queen,
      team: teamType,
      x: 3,
      y: y,
    });
    pieces.push({
      id: `king-${type}-4`,
      image: getPieceImage("King", type),
      role: PieceRole.King,
      team: teamType,
      x: 4,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-5`,
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 5,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-6`,
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 6,
      y: y,
    });
    pieces.push({
      id: `rook-${type}-7`,
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 7,
      y: y,
    });
  }

  for (let i = 0; i < 8; i++) {
    pieces.push({
      id: `pawn-black-${i}`,
      image: getPieceImage("Pawn", "Black"),
      role: PieceRole.Pawn,
      team: TeamType.OPPONENT,
      x: i,
      y: 6,
    });
    pieces.push({
      id: `pawn-white-${i}`,
      image: getPieceImage("Pawn", "White"),
      role: PieceRole.Pawn,
      team: TeamType.OUR,
      x: i,
      y: 1,
    });
  }

  return pieces;
}
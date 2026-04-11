import { Piece, PieceRole, TeamType } from "@/Constants";

export default class Referee {
  private isOccupied(x: number, y: number, boardState: Piece[]): boolean {
    return boardState.some((p) => p.x === x && p.y === y);
  }

  private getPieceAt(
    x: number,
    y: number,
    boardState: Piece[],
  ): Piece | undefined {
    return boardState.find((p) => p.x === x && p.y === y);
  }

  private isPathCleanStraight(
    px: number,
    py: number,
    x: number,
    y: number,
    boardState: Piece[],
  ): boolean {
    const dx = px === x ? 0 : x > px ? 1 : -1;
    const dy = py === y ? 0 : y > py ? 1 : -1;

    let tempX = px + dx;
    let tempY = py + dy;

    while (tempX !== x || tempY !== y) {
      if (this.isOccupied(tempX, tempY, boardState)) {
        return false;
      }

      tempX += dx;
      tempY += dy;
    }
    return true;
  }

  private isPathCleanDiagonal(
    px: number,
    py: number,
    x: number,
    y: number,
    boardState: Piece[],
  ): boolean {
    const dx = x > px ? 1 : -1;
    const dy = y > py ? 1 : -1;

    let tempX = px + dx;
    let tempY = py + dy;

    while (tempX !== x || tempY !== y) {
      if (this.isOccupied(tempX, tempY, boardState)) {
        return false;
      }

      tempX += dx;
      tempY += dy;
    }
    return true;
  }

  private pawnMove(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
  ): boolean {
    const specialRow = team === TeamType.OUR ? 1 : 6;
    const pawnDirection = team === TeamType.OUR ? 1 : -1;

    if (px === x) {
      if (y - py === pawnDirection) {
        return !this.isOccupied(x, y, boardState);
      }
      if (py === specialRow && y - py === pawnDirection * 2) {
        return (
          !this.isOccupied(x, y, boardState) &&
          !this.isOccupied(x, y - pawnDirection, boardState)
        );
      }
    }

    if (Math.abs(x - px) === 1 && y - py === pawnDirection) {
      const target = this.getPieceAt(x, y, boardState);
      if (target && target.team !== team) {
        return true;
      }

      // TODO: Add logic En Passant here
      // if (this.canEnPassant(px, py, x, y, team, boardState)) return true;
    }

    return false;
  }

  private knightMove(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
  ): boolean {
    if (Math.abs(x - px) * Math.abs(y - py) === 2) {
      const target = this.getPieceAt(x, y, boardState);
      return !target || target.team !== team;
    }

    return false;
  }

  private rookMove(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
  ): boolean {
    if (px === x || py === y) {
      if (this.isPathCleanStraight(px, py, x, y, boardState)) {
        const target = this.getPieceAt(x, y, boardState);
        return !target || target.team !== team;
      }
    }
    return false;
  }

  private bishopMove(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
  ): boolean {
    if (Math.abs(x - px) === Math.abs(y - py)) {
      if (this.isPathCleanDiagonal(px, py, x, y, boardState)) {
        const target = this.getPieceAt(x, y, boardState);
        return !target || target.team !== team;
      }
    }
    return false;
  }

  private kingMove(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
  ): boolean {
    if (Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1) {
      const target = this.getPieceAt(x, y, boardState);
      return !target || target.team !== team;
    }
    return false;
  }

  isValidMove(
    px: number,
    py: number,
    x: number,
    y: number,
    role: PieceRole,
    team: TeamType,
    boardState: Piece[],
  ) {
    if (px === x && py === y) return false;

    switch (role) {
      case PieceRole.Pawn:
        return this.pawnMove(px, py, x, y, team, boardState);

      case PieceRole.Knight:
        return this.knightMove(px, py, x, y, team, boardState);

      case PieceRole.Rook:
        return this.rookMove(px, py, x, y, team, boardState);

      case PieceRole.Bishop:
        return this.bishopMove(px, py, x, y, team, boardState);

      case PieceRole.King:
        return this.kingMove(px, py, x, y, team, boardState);

      case PieceRole.Queen:
        return (
          this.rookMove(px, py, x, y, team, boardState) ||
          this.bishopMove(px, py, x, y, team, boardState)
        );

      default:
        return false;
    }
  }

  isKingInCheck(team: TeamType, boardState: Piece[]): boolean {
    // search our king for check if wasn't checked
    const king = boardState.find(
      (p) => p.role === PieceRole.King && p.team === team,
    );
    if (!king) return false;

    // get enemy pieces
    const enemyPieces = boardState.filter((p) => p.team !== team);

    return enemyPieces.some((p) =>
      this.isValidMove(p.x, p.y, king.x, king.y, p.role, p.team, boardState),
    );
  }

  isMoveLegal(
    px: number,
    py: number,
    x: number,
    y: number,
    role: PieceRole,
    team: TeamType,
    boardState: Piece[],
  ) {
    if (!this.isValidMove(px, py, x, y, role, team, boardState)) return false;

    const clonedBoard = boardState
      .filter((p) => !(p.x === x && p.y === y))
      .map((p) => {
        if (p.x === px && p.y === py) {
          return { ...p, x, y };
        }
        return p;
      });

    return !this.isKingInCheck(team, clonedBoard);
  }
  getValidMoveCounts(team: TeamType, boardState: Piece[]): number {
    const myPieces = boardState.filter(p => p.team === team);
    let moveCounts = 0;

    myPieces.forEach(p => {
      for (let i = 7; i >= 0; i--) {
        for (let j = 0; j < 8; j++) {
          if (this.isMoveLegal(p.x, p.y, j, i, p.role, p.team, boardState)) {
            moveCounts++
          }
        }
      }
    })

    return moveCounts;
  }
}

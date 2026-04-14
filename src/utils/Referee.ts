import {
  horizonAxis,
  Piece,
  PieceRole,
  TeamType,
  verticalAxis,
} from "@/Constants";

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
    moveHistory: string[],
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

    if (this.canEnPassant(px, py, x, y, team, boardState, moveHistory)) {
      return true;
    }

    if (Math.abs(x - px) === 1 && y - py === pawnDirection) {
      const target = this.getPieceAt(x, y, boardState);
      if (target && target.team !== team) {
        return true;
      }
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
    id: string,
    team: TeamType,
    boardState: Piece[],
    hasMoved: boolean,
    moveHistory: string[],
  ): boolean {
    if (
      this.canCastling(
        px,
        py,
        x,
        y,
        id,
        team,
        boardState,
        hasMoved,
        moveHistory,
      )
    ) {
      return true;
    }

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
    piece: Piece,
    boardState: Piece[],
    moveHistory: string[],
  ) {
    if (px === x && py === y) return false;

    switch (piece.role) {
      case PieceRole.Pawn:
        return this.pawnMove(px, py, x, y, piece.team, boardState, moveHistory);

      case PieceRole.Knight:
        return this.knightMove(px, py, x, y, piece.team, boardState);

      case PieceRole.Rook:
        return this.rookMove(px, py, x, y, piece.team, boardState);

      case PieceRole.Bishop:
        return this.bishopMove(px, py, x, y, piece.team, boardState);

      case PieceRole.King:
        return this.kingMove(
          px,
          py,
          x,
          y,
          piece.id,
          piece.team,
          boardState,
          piece.hasMoved ?? false,
          moveHistory,
        );

      case PieceRole.Queen:
        return (
          this.rookMove(px, py, x, y, piece.team, boardState) ||
          this.bishopMove(px, py, x, y, piece.team, boardState)
        );

      default:
        return false;
    }
  }

  private canCapture(
    px: number,
    py: number,
    x: number,
    y: number,
    piece: Piece,
    boardState: Piece[],
    moveHistory: string[],
  ): boolean {
    switch (piece.role) {
      case PieceRole.Pawn:
        const pawnDirection = piece.team === TeamType.OUR ? 1 : -1;
        return Math.abs(x - px) === 1 && y - py === pawnDirection;

      case PieceRole.King:
        return Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1;

      case PieceRole.Knight:
        return this.knightMove(px, py, x, y, piece.team, boardState);

      case PieceRole.Rook:
      case PieceRole.Bishop:
      case PieceRole.Queen:
        return this.isValidMove(px, py, x, y, piece, boardState, moveHistory);

      default:
        return false;
    }
  }

  isKingInCheck(
    team: TeamType,
    boardState: Piece[],
    moveHistory: string[],
  ): boolean {
    // search our king for check if wasn't checked
    const king = boardState.find(
      (p) => p.role === PieceRole.King && p.team === team,
    );
    if (!king) return false;

    // get enemy pieces
    const enemyPieces = boardState.filter((p) => p.team !== team);

    return enemyPieces.some((p) =>
      this.canCapture(p.x, p.y, king.x, king.y, p, boardState, moveHistory),
    );
  }

  isMoveLegal(
    px: number,
    py: number,
    x: number,
    y: number,
    piece: Piece,
    boardState: Piece[],
    moveHistory: string[],
  ): boolean {
    if (!this.isValidMove(px, py, x, y, piece, boardState, moveHistory))
      return false;

    const isEnPassantMove =
      piece.role === PieceRole.Pawn &&
      px !== x &&
      !this.isOccupied(x, y, boardState);

    const clonedBoard = boardState
      .filter((p) => {
        if (isEnPassantMove) {
          return !(p.x === x && p.y === py);
        }
        return !(p.x === x && p.y === y);
      })
      .map((p) => {
        if (p.x === px && p.y === py) {
          return { ...p, x, y };
        }
        return p;
      });

    return !this.isKingInCheck(piece.team, clonedBoard, moveHistory);
  }

  getValidMovesCount(
    team: TeamType,
    boardState: Piece[],
    moveHistory: string[],
  ): number {
    const myPieces = boardState.filter((p) => p.team === team);
    let moveCounts = 0;

    myPieces.forEach((p) => {
      for (let i = 7; i >= 0; i--) {
        for (let j = 0; j < 8; j++) {
          if (this.isMoveLegal(p.x, p.y, j, i, p, boardState, moveHistory)) {
            moveCounts++;
          }
        }
      }
    });

    return moveCounts;
  }

  // pawn promotion
  isPromotionMove(toY: number, piece: Piece): boolean {
    if (piece.role !== PieceRole.Pawn) return false;

    return (
      (piece.team === TeamType.OUR && toY === 7) ||
      (piece.team === TeamType.OPPONENT && toY === 0)
    );
  }

  // en passant
  canEnPassant(
    px: number,
    py: number,
    x: number,
    y: number,
    team: TeamType,
    boardState: Piece[],
    moveHistory: string[],
  ): boolean {
    const pawnDirection = team === TeamType.OUR ? 1 : -1;

    if (
      Math.abs(x - px) === 1 &&
      y - py === pawnDirection &&
      !this.isOccupied(x, y, boardState)
    ) {
      const targetPawn = this.getPieceAt(x, py, boardState);

      if (
        targetPawn &&
        targetPawn.role === PieceRole.Pawn &&
        targetPawn.team !== team
      ) {
        const lastMove = moveHistory[moveHistory.length - 1];
        if (!lastMove) return false;

        const targetColumn = horizonAxis[x];
        const targetRow = verticalAxis[py];
        const expectedEndPos = `${targetColumn}${targetRow}`;

        const isPawnMove = lastMove.includes("♙") || lastMove.includes("♟");

        const isDoubleJump =
          lastMove.includes(`${targetColumn}2${targetColumn}4`) ||
          lastMove.includes(`${targetColumn}7${targetColumn}5`);

        return lastMove.includes(expectedEndPos) && isPawnMove && isDoubleJump;
      }
    }
    return false;
  }

  canCastling(
    px: number,
    py: number,
    x: number,
    y: number,
    id: string,
    team: TeamType,
    boardState: Piece[],
    hasMoved: boolean,
    moveHistory: string[],
  ): boolean {
    if (hasMoved) return false;

    const isKingSide = x > px;
    const rookX = isKingSide ? 7 : 0;

    const targetRook = boardState.find(
      (p) =>
        p.role === PieceRole.Rook &&
        p.team === team &&
        p.x === rookX &&
        p.y === py &&
        !(p.hasMoved ?? false),
    );

    if (!targetRook) return false;

    const start = Math.min(px, rookX);
    const end = Math.max(px, rookX);
    for (let i = start + 1; i < end; i++) {
      if (this.isOccupied(i, py, boardState)) return false;
    }

    if (this.isKingInCheck(team, boardState, moveHistory)) return false;

    const step = isKingSide ? 1 : -1;
    const tempPieces = boardState.map((p) => {
      if (p.id === id) {
        return { ...p, x: px + step };
      }
      return p;
    });
    if (this.isKingInCheck(team, tempPieces, moveHistory)) return false;

    return Math.abs(x - px) === 2 && y === py;
  }
}

import createInitialPieces, {
  getPieceImage,
  horizonAxis,
  Piece,
  PieceRole,
  TeamType,
  verticalAxis,
} from "@/Constants";
import { getPieceIcon } from "@/utils/getPieceIcon";
import Referee from "@/utils/Referee";
import { create } from "zustand";

export interface GameState {
  pieces: Piece[];
  currentTurn: TeamType;
  ourEatenHistory: string[];
  opnEatenHistory: string[];
  moveHistory: string[];
  isCheck: boolean;
  isGameOver: boolean;
  winner: TeamType | null;
  makeMove: (pieceId: string, toX: number, toY: number) => void;
  promotePawn: (pieceId: string, role: PieceRole) => void;
  resetGame: () => void;
}

const referee = new Referee();

export const useGameStore = create<GameState>((set) => ({
  pieces: createInitialPieces(),
  currentTurn: TeamType.OUR,
  ourEatenHistory: [],
  opnEatenHistory: [],
  moveHistory: [],
  isCheck: false,
  isGameOver: false,
  winner: null,

  makeMove: (pieceId, toX, toY) =>
    set((state) => {
      const piece = state.pieces.find((p) => p.id === pieceId);
      if (!piece) return state;

      const targetPiece = state.pieces.find((p) => p.x === toX && p.y === toY);

      const newPieces = state.pieces.reduce((acc, p) => {
        if (p.x === toX && p.y === toY && p.id !== pieceId) return acc;
        if (p.id === pieceId) {
          acc.push({ ...p, x: toX, y: toY });
        } else {
          acc.push(p);
        }
        return acc;
      }, [] as Piece[]);

      let { ourEatenHistory, opnEatenHistory } = state;
      if (targetPiece) {
        const icon = getPieceIcon(targetPiece);
        if (targetPiece.team === TeamType.OPPONENT) {
          ourEatenHistory = [...ourEatenHistory, icon];
        } else {
          opnEatenHistory = [...opnEatenHistory, icon];
        }
      }

      const nextTurn =
        state.currentTurn === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;

      const isKingInCheck = referee.isKingInCheck(nextTurn, newPieces);
      const movesCount = referee.getValidMovesCount(nextTurn, newPieces);
      const isGameOver = movesCount === 0;

      const fromCoord = `${verticalAxis[piece.y]}${horizonAxis[piece.x]}`;
      const toCoord = `${verticalAxis[toY]}${horizonAxis[toX]}`;
      const actionChar = targetPiece ? "x" : "";
      const moveNote = `${getPieceIcon(piece)}: ${fromCoord}${actionChar}${toCoord}${isKingInCheck && !isGameOver ? "+" : ""}${isKingInCheck && isGameOver ? "#" : ""}`;

      return {
        pieces: newPieces,
        currentTurn: nextTurn,
        moveHistory: [...state.moveHistory, moveNote],
        ourEatenHistory,
        opnEatenHistory,
        isCheck: isKingInCheck,
        isGameOver,
        winner: isGameOver && isKingInCheck ? state.currentTurn : null,
      };
    }),

  promotePawn: (pieceId: string, role: PieceRole) =>
    set((state) => {
      const type = state.currentTurn === TeamType.OUR ? "White" : "Black";

      const newPieces = state.pieces.map((p) => {
        if (p.id === pieceId) {
          return {
            ...p,
            role: role,
            image: getPieceImage(PieceRole[role], type),
          };
        }
        return p;
      });

      return { pieces: newPieces };
    }),

  resetGame: () =>
    set({
      pieces: createInitialPieces(),
      currentTurn: TeamType.OUR,
      ourEatenHistory: [],
      opnEatenHistory: [],
      moveHistory: [],
    }),
}));

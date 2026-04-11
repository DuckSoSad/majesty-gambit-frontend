import createInitialPieces, {
  horizonAxis,
  Piece,
  PIECE_ICONS,
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
  isGameOver: boolean;
  winner: TeamType | null;
  makeMove: (pieceId: string, toX: number, toY: number) => void;
  resetGame: () => void;
}

const referee = new Referee();

export const useGameStore = create<GameState>((set) => ({
  pieces: createInitialPieces(),
  currentTurn: TeamType.OUR,
  ourEatenHistory: [],
  opnEatenHistory: [],
  moveHistory: [],
  isGameOver: false,
  winner: null,

  makeMove: (pieceId, toX, toY) =>
    set((state) => {
      const piece = state.pieces.find((p) => p.id === pieceId);
      if (!piece) return state;

      const newPieces = state.pieces
        .filter((p) => !(p.x === toX && p.y === toY && p.id !== pieceId))
        .map((p) => (p.id === pieceId ? { ...p, x: toX, y: toY } : p));

      const eatenPiece = state.pieces.find((p) => p.x === toX && p.y === toY);

      let newOurEaten = state.ourEatenHistory;
      let newOpnEaten = state.opnEatenHistory;

      if (eatenPiece) {
        const icon = getPieceIcon(eatenPiece);
        if (eatenPiece.team === TeamType.OUR) {
          newOurEaten = [...state.ourEatenHistory, icon];
        } else {
          newOpnEaten = [...state.opnEatenHistory, icon];
        }
      }

      const nextTurn =
        state.currentTurn === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;

      const moveNote = `${getPieceIcon(piece)}: ${verticalAxis[piece.x]}${horizonAxis[piece.y]} -> ${verticalAxis[toX]}${horizonAxis[toY]}`;

      const movesCount = referee.getValidMovesCount(nextTurn, newPieces);
      const isKingInCheck = referee.isKingInCheck(nextTurn, state.pieces);

      return {
        pieces: newPieces,
        currentTurn: nextTurn,
        moveHistory: [...state.moveHistory, moveNote],
        ourEatenHistory: newOurEaten,
        opnEatenHistory: newOpnEaten,
        isGameOver: movesCount === 0,
        winner: movesCount === 0 && isKingInCheck ? nextTurn : null,
      };
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

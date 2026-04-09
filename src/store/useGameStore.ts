import createInitialPieces, { horizonAxis, Piece, PIECE_ICONS, TeamType, verticalAxis } from "@/Constants";
import { getPieceIcon } from "@/utils/getPieceIcon";
import { create } from "zustand";

export interface GameState {
  pieces: Piece[];
  currentTurn: TeamType;
  ourEatenHistory: string[],
  opnEatenHistory: string[],
  moveHistory: string[];
  makeMove: (pieceId: string, toX: number, toY: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  pieces: createInitialPieces(),
  currentTurn: TeamType.OUR,
  ourEatenHistory: [],
  opnEatenHistory: [],
  moveHistory: [],

  makeMove: (pieceId, toX, toY) =>
    set((state) => {
      const piece = state.pieces.find((p) => p.id === pieceId);
      if (!piece) return state;

      const eatenPiece = state.pieces.find((p) => p.x === toX && p.y === toY);
      if (eatenPiece) {
        if (eatenPiece.team === 0) {
          state.ourEatenHistory.push(getPieceIcon(eatenPiece));
        } else {
          state.opnEatenHistory.push(getPieceIcon(eatenPiece));
        }
      }

      const newPieces = state.pieces
        .filter((p) => !(p.x === toX && p.y === toY && p.id !== pieceId))
        .map((p) => (p.id === pieceId ? { ...p, x: toX, y: toY } : p));

      const nextTurn = state.currentTurn === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;

      const moveNote = `${getPieceIcon(piece)}: ${verticalAxis[piece.x]}${horizonAxis[piece.y]} -> ${verticalAxis[toX]}${horizonAxis[toY]}`;

      return {
        pieces: newPieces,
        currentTurn: nextTurn,
        moveHistory: [...state.moveHistory, moveNote],
      };
    }),

  resetGame: () =>
    set({
      pieces: createInitialPieces(),
      currentTurn: TeamType.OUR,
      moveHistory: [],
    }),
}));
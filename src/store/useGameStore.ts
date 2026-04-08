import createInitialPieces, { Piece, TeamType } from "@/Constants";
import { create } from "zustand";

interface GameState {
  pieces: Piece[];
  currentTurn: TeamType;
  moveHistory: string[];
  makeMove: (pieceId: string, toX: number, toY: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  pieces: createInitialPieces(),
  currentTurn: TeamType.OUR,
  moveHistory: [],

  makeMove: (pieceId, toX, toY) =>
    set((state) => {
      const piece = state.pieces.find((p) => p.id === pieceId);
      if (!piece) return state;

      const newPieces = state.pieces
        .filter((p) => !(p.x === toX && p.y === toY && p.id !== pieceId))
        .map((p) => (p.id === pieceId ? { ...p, x: toX, y: toY } : p));

      const nextTurn = state.currentTurn === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;

      const moveNote = `${piece.role} ${pieceId}: (${piece.x},${piece.y}) -> (${toX},${toY})`;

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
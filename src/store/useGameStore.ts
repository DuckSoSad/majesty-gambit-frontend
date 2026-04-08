import { create } from 'zustand';

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
  makeMove: (pieceId, toX, toY) => set((state) => {
    // Logic cập nhật pieces và đổi currentTurn ở đây
    return { ... };
  }),
  resetGame: () => set({ pieces: createInitialPieces(), currentTurn: TeamType.OUR, moveHistory: [] }),
}));
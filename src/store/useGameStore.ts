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

  // for Guide
  isOpenGuide: boolean;
  guideStep: number;
  openGuide: () => void;
  closeGuide: () => void;
  backStep: () => void;
  nextStep: () => void;
  setStep: (step: number) => void;
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

  // for Guide Popup
  isOpenGuide: false,
  guideStep: 0,
  openGuide: () => set({ isOpenGuide: true, guideStep: 0 }),
  closeGuide: () => set({ isOpenGuide: false }),
  backStep: () => set((state) => ({ guideStep: state.guideStep - 1 })),
  nextStep: () => set((state) => ({ guideStep: state.guideStep + 1 })),
  setStep: (step) => set({ guideStep: step }),

  makeMove: (pieceId, toX, toY) =>
    set((state) => {
      const piece = state.pieces.find((p) => p.id === pieceId);
      if (!piece) return state;

      let isCastling = false;
      let isEnPassant = false;

      switch (piece.role) {
        case PieceRole.King:
          isCastling = referee.canCastling(
            piece.x,
            piece.y,
            toX,
            toY,
            pieceId,
            piece.team,
            state.pieces,
            piece.hasMoved ?? false,
            state.moveHistory,
          );
          break;

        case PieceRole.Pawn:
          isEnPassant = referee.canEnPassant(
            piece.x,
            piece.y,
            toX,
            toY,
            piece.team,
            state.pieces,
            state.moveHistory,
          );
          break;
      }

      const targetPiece = isEnPassant
        ? state.pieces.find((p) => p.x === toX && p.y === piece.y)
        : state.pieces.find((p) => p.x === toX && p.y === toY);

      const isKingSide = toX > piece.x;
      const rookX = isKingSide ? 7 : 0;
      const targetRookX = isKingSide ? 5 : 3;

      const newPieces = state.pieces.reduce((acc, p) => {
        if (targetPiece && p.id === targetPiece.id) {
          return acc;
        }

        if (p.id === pieceId) {
          acc.push({ ...p, x: toX, y: toY, hasMoved: true });
        } else if (
          isCastling &&
          p.role === PieceRole.Rook &&
          p.x === rookX &&
          p.y === piece.y &&
          p.team === piece.team
        ) {
          acc.push({ ...p, x: targetRookX, hasMoved: true });
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

      const isKingInCheck = referee.isKingInCheck(
        nextTurn,
        newPieces,
        state.moveHistory,
      );
      const movesCount = referee.getValidMovesCount(
        nextTurn,
        newPieces,
        state.moveHistory,
      );
      const isGameOver = movesCount === 0;

      const fromCoord = `${horizonAxis[piece.x]}${verticalAxis[piece.y]}`;
      const toCoord = `${horizonAxis[toX]}${verticalAxis[toY]}`;
      const actionChar = targetPiece ? "x" : "";
      const moveNote = isCastling
        ? isKingSide
          ? `${getPieceIcon(piece)}: O-O`
          : `${getPieceIcon(piece)}: O-O-O`
        : `${getPieceIcon(piece)}: ${fromCoord}${actionChar}${toCoord}${isKingInCheck && !isGameOver ? "+" : ""}${isKingInCheck && isGameOver ? "#" : ""}`;

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
      isCheck: false,
      isGameOver: false,
      winner: null,
    }),
}));

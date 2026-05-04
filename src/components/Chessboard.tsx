"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cell from "./Cell";
import CellColor from "./CellColor";
import {
  DragEndEvent, DragStartEvent, DragOverEvent, DndContext, DragOverlay,
  useSensors, TouchSensor, useSensor, MouseSensor, Modifier,
} from "@dnd-kit/core";
import DraggablePiece from "./DraggablePiece";
import Image from "next/image";
import Referee from "@/utils/Referee";
import { Piece, PieceRole, TeamType } from "@/Constants";
import { useGameStore } from "@/store/useGameStore";
import { useChessSounds } from "@/hooks/useChessSound";
import IsCheckmatePopup from "./IsCheckmatePopup";
import PromotionPopup from "./PromotionPopup";

const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];
const EMPTY_PIECES: Piece[] = [];
const EMPTY_MOVE_HISTORY: string[] = [];

// PieceRole → promotion char gửi lên server
const ROLE_TO_PROMO: Record<number, string> = {
  [PieceRole.Bishop]: "B",
  [PieceRole.Knight]: "N",
  [PieceRole.Queen]: "Q",
  [PieceRole.Rook]: "R",
};

interface ChessboardProps {
  // Online mode props
  onlineMode?: boolean;
  myColor?: "white" | "black";
  externalPieces?: Piece[];
  externalMoveHistory?: string[];
  onlineTurn?: "white" | "black";
  onMove?: (from: string, to: string, promotion?: string) => void;
  gameOver?: boolean;
}

export default function Chessboard({
  onlineMode = false,
  myColor = "white",
  externalPieces,
  externalMoveHistory,
  onlineTurn,
  onMove,
  gameOver = false,
}: ChessboardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const referee = useMemo(() => new Referee(), []);

  const restrictToBoard: Modifier = useCallback(({ transform, draggingNodeRect }) => {
    if (!boardRef.current || !draggingNodeRect) return transform;
    const r = boardRef.current.getBoundingClientRect();
    return {
      ...transform,
      x: Math.min(Math.max(transform.x, r.left - draggingNodeRect.left), r.right - draggingNodeRect.right),
      y: Math.min(Math.max(transform.y, r.top - draggingNodeRect.top), r.bottom - draggingNodeRect.bottom),
    };
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const { playGameStart, playMove, playMoveCheck, playCapture } = useChessSounds();

  // Store state (local mode)
  const storePieces   = useGameStore((s) => s.pieces);
  const currentTurn   = useGameStore((s) => s.currentTurn);
  const makeMove      = useGameStore((s) => s.makeMove);
  const promotePawn   = useGameStore((s) => s.promotePawn);
  const isGameOver    = useGameStore((s) => s.isGameOver);
  const isCheck       = useGameStore((s) => s.isCheck);
  const moveHistory   = useGameStore((s) => s.moveHistory);

  // Use external pieces in online mode
  const pieces = useMemo(
    () => (onlineMode ? (externalPieces ?? EMPTY_PIECES) : storePieces),
    [externalPieces, onlineMode, storePieces],
  );
  const ruleMoveHistory = useMemo(
    () => (onlineMode ? (externalMoveHistory ?? EMPTY_MOVE_HISTORY) : moveHistory),
    [externalMoveHistory, onlineMode, moveHistory],
  );

  const myTeam = myColor === "white" ? TeamType.OUR : TeamType.OPPONENT;
  const isMyTurn = onlineTurn === myColor;
  const boardLocked = onlineMode ? gameOver : isGameOver;

  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    id: string; x: number; y: number; fromAlg?: string; toAlg?: string;
  } | null>(null);
  useEffect(() => {
    if (moveHistory.length !== 0) return;
    if (!onlineMode) playGameStart();
  }, [moveHistory.length, onlineMode, playGameStart]);

  useEffect(() => {
    if (onlineMode || moveHistory.length === 0) return;
    const last = moveHistory[moveHistory.length - 1];
    if (isCheck) playMoveCheck();
    else if (last.includes("x")) playCapture();
    else playMove();
  }, [moveHistory, isCheck, onlineMode, playCapture, playMove, playMoveCheck]);

  const pieceMap = useMemo(() => {
    const m = new Map<string, Piece>();
    pieces.forEach((p) => m.set(`${p.x},${p.y}`, p));
    return m;
  }, [pieces]);

  const activePiece = useMemo(() => pieces.find((p) => p.id === activeId) ?? null, [pieces, activeId]);

  const validMoves = useMemo(() => {
    if (boardLocked) return [];
    if (!selectedPiece && !activeId) return [];
    const chosen = pieces.find((p) => selectedPiece ? p.id === selectedPiece.id : p.id === activeId);
    if (!chosen) return [];

    if (onlineMode) {
      if (chosen.team !== myTeam || !isMyTurn) return [];
    } else {
      if (chosen.team !== currentTurn) return [];
    }

    const moves: string[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (referee.isMoveLegal(chosen.x, chosen.y, col, row, chosen, pieces, ruleMoveHistory)) {
          moves.push(`${col},${row}`);
        }
      }
    }
    return moves;
  }, [pieces, selectedPiece, activeId, onlineMode, isMyTurn, currentTurn, ruleMoveHistory, boardLocked, myTeam, referee]);

  function toAlg(x: number, y: number) {
    return `${horizonAxis[x]}${verticalAxis[y]}`;
  }

  function checkBeforeMove(x: number, y: number, sel: Piece | null) {
    if (boardLocked) return;
    if (!sel) return;
    if (!referee.isMoveLegal(sel.x, sel.y, x, y, sel, pieces, ruleMoveHistory)) return;

    if (onlineMode) {
      const from = toAlg(sel.x, sel.y);
      const to   = toAlg(x, y);
      if (referee.isPromotionMove(y, sel)) {
        setPendingPromotion({ id: sel.id, x, y, fromAlg: from, toAlg: to });
        return;
      }
      onMove?.(from, to);
    } else {
      if (referee.isPromotionMove(y, sel)) {
        setPendingPromotion({ id: sel.id, x, y });
        return;
      }
      makeMove(sel.id, x, y);
    }
  }

  const handlePromotionSelect = (role: PieceRole) => {
    if (!pendingPromotion) return;
    if (onlineMode && pendingPromotion.fromAlg) {
      onMove?.(pendingPromotion.fromAlg, pendingPromotion.toAlg!, ROLE_TO_PROMO[role]);
    } else {
      promotePawn(pendingPromotion.id, role);
      makeMove(pendingPromotion.id, pendingPromotion.x, pendingPromotion.y);
      playMove();
    }
    setPendingPromotion(null);
  };

  function pickPiece(x: number, y: number) {
    if (activeId) return;
    const piece = pieces.find((p) => p.x === x && p.y === y);

    if (onlineMode) {
      if (!selectedPiece && piece) {
        if (piece.team === myTeam && isMyTurn) setSelectedPiece(piece);
        return;
      }
      checkBeforeMove(x, y, selectedPiece);
      setSelectedPiece(null);
    } else {
      if (!selectedPiece && piece) {
        if (piece.team === currentTurn) setSelectedPiece(piece);
        return;
      }
      checkBeforeMove(x, y, selectedPiece);
      setSelectedPiece(null);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
    setSelectedPiece(null);
  }

  function handleDragOver(e: DragOverEvent) {
    setHoveredCellId(e.over ? (e.over.id as string) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setHoveredCellId(null);
    if (!over?.data?.current) return;

    const piece = pieces.find((p) => p.id === active.id);
    if (!piece) return;
    if (boardLocked) return;
    if (onlineMode && (piece.team !== myTeam || !isMyTurn)) return;
    if (!onlineMode && piece.team !== currentTurn) return;

    const { x, y } = over.data.current as { x: number; y: number };
    checkBeforeMove(x, y, piece);
  }

  function handleDragCancel() {
    setActiveId(null);
    setHoveredCellId(null);
  }

  // Board is flipped for black player in online mode
  const flip = onlineMode && myColor === "black";

  const board = [];
  for (let i = 7; i >= 0; i--) {
    for (let j = 0; j < 8; j++) {
      const row = flip ? 7 - i : i;
      const col = flip ? 7 - j : j;
      const isBlack    = (row + col) % 2 === 0;
      const piece      = pieceMap.get(`${col},${row}`);
      const isSelected = selectedPiece?.x === col && selectedPiece?.y === row;
      const isHovered  = hoveredCellId === `${col},${row}`;

      board.push(
        <Cell key={`${row},${col}`} x={col} y={row} pick={pickPiece}>
          <div className="w-full h-full">
            <CellColor isBlack={isBlack} />
            {col === 0 && (
              <span className={`absolute top-0.5 left-0.5 text-[10px] font-bold md:text-xs ${isBlack ? "text-[#E8EDF9]" : "text-[#B7C0D8]"}`}>
                {row + 1}
              </span>
            )}
            {row === 0 && (
              <span className={`absolute bottom-0.5 right-0.5 text-[10px] uppercase font-bold md:text-xs ${isBlack ? "text-[#E8EDF9]" : "text-[#B7C0D8]"}`}>
                {horizonAxis[col]}
              </span>
            )}
            {validMoves.includes(`${col},${row}`) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {pieceMap.has(`${col},${row}`) ? (
                  <div className="w-full h-full border-5 border-[#9990EC] opacity-90 rounded-full" />
                ) : (
                  <div className="w-5 h-5 md:w-7 md:h-7 bg-[#9990EC] opacity-90 rounded-full" />
                )}
              </div>
            )}
            {isSelected && <div className="absolute inset-0 border-4 bg-[#B1A7FC] opacity-70 pointer-events-none" />}
            {isHovered && !isSelected && <div className="absolute inset-0 border-4 bg-[#B1A7FC] opacity-70 pointer-events-none" />}
            {piece && <DraggablePiece id={piece.id} image={piece.image} />}
          </div>
        </Cell>
      );
    }
  }

  return (
    <div
      ref={boardRef}
      className="w-[95vw] h-[95vw] md:w-190 md:h-190 bg-white grid grid-cols-8 grid-rows-8 shadow-2xl border-3 border-white"
    >
      <DndContext
        sensors={sensors}
        modifiers={[restrictToBoard]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {board}
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activePiece ? (
            <div className="relative w-full h-full opacity-95 drop-shadow-2xl">
              <Image src={activePiece.image} alt="dragging" fill sizes="80px" className="object-contain pointer-events-none select-none" priority />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!onlineMode && isGameOver && <IsCheckmatePopup restart={() => undefined} />}
      {pendingPromotion && (
        <PromotionPopup
          team={onlineMode ? (myColor === "white" ? TeamType.OUR : TeamType.OPPONENT) : currentTurn}
          onSelect={handlePromotionSelect}
        />
      )}
    </div>
  );
}

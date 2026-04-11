"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Cell from "./Cell";
import CellColor from "./CellColor";

import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DndContext,
  DragOverlay,
  useSensors,
  TouchSensor,
  useSensor,
  MouseSensor,
  Modifier,
} from "@dnd-kit/core";
import DraggablePiece from "./DraggablePiece";
import Image from "next/image";
import Referee from "@/utils/Referee";
import createInitialPieces, { Piece, TeamType } from "@/Constants";
import { useGameStore } from "@/store/useGameStore";
import { toast } from "react-toastify";
import { useChessSounds } from "@/hooks/useChessSound";
import IsCheckmatePopup from "./IsCheckmatePopup";

const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Chessboard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const referee = useMemo(() => new Referee(), []);

  const restrictToBoard: Modifier = useCallback(
    ({ transform, draggingNodeRect }) => {
      if (!boardRef.current || !draggingNodeRect) return transform;

      const boardRect = boardRef.current.getBoundingClientRect();

      const minX = boardRect.left - draggingNodeRect.left;
      const maxX = boardRect.right - draggingNodeRect.right;
      const minY = boardRect.top - draggingNodeRect.top;
      const maxY = boardRect.bottom - draggingNodeRect.bottom;

      return {
        ...transform,
        x: Math.min(Math.max(transform.x, minX), maxX),
        y: Math.min(Math.max(transform.y, minY), maxY),
      };
    },
    [],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
  );

  const { playMove, playCapture } = useChessSounds();

  const pieces = useGameStore((state) => state.pieces);
  const currentTurn = useGameStore((state) => state.currentTurn);
  const makeMove = useGameStore((state) => state.makeMove);

  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);

  const [isCheckmate, setIsCheckmate] = useState<boolean>(false);
  const [isStalemate, setIsStalemate] = useState<boolean>(false);

  useEffect(() => {
    const movesCount = referee.getValidMoveCounts(currentTurn, pieces);

    if (movesCount === 0) {
      if (referee.isKingInCheck(currentTurn, pieces)) {
        toast.error(
          `CHECKMATE! ${currentTurn === TeamType.OUR ? "Đen" : "Trắng"} thắng!`,
        );
        setIsCheckmate(true);
      } else {
        toast.info("Hòa cờ (Stalemate)!");
        setIsStalemate(true);
      }
    }
  }, [currentTurn, pieces, referee]);

  const pieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    pieces.forEach((p) => map.set(`${p.x},${p.y}`, p));

    return map;
  }, [pieces]);

  const activePiece = useMemo(
    () => pieces.find((p) => p.id === activeId) ?? null,
    [pieces, activeId],
  );

  const validMoves = useMemo(() => {
    if (!selectedPiece && !activeId) return [];
    const moves: string[] = [];

    const chosenPiece = pieces.find((p) =>
      selectedPiece ? p.id === selectedPiece.id : p.id === activeId,
    );
    if (!chosenPiece || chosenPiece.team !== currentTurn) return [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (
          referee.isMoveLegal(
            chosenPiece.x,
            chosenPiece.y,
            col,
            row,
            chosenPiece.role,
            chosenPiece.team,
            pieces,
          )
        ) {
          moves.push(`${col},${row}`);
        }
      }
    }

    return moves;
  }, [pieces, selectedPiece, activeId, referee]);

  const pickPiece = useCallback(
    (x: number, y: number) => {
      if (activeId) return;
      const piece = pieces.find((p) => p.x === x && p.y === y);

      if (!selectedPiece && piece) {
        if (piece.team === currentTurn) {
          setSelectedPiece(piece);
        }
        return;
      }

      if (selectedPiece) {
        if (
          referee.isMoveLegal(
            selectedPiece.x,
            selectedPiece.y,
            x,
            y,
            selectedPiece.role,
            selectedPiece.team,
            pieces,
          )
        ) {
          playMove();
          makeMove(selectedPiece.id, x, y);
          // toast.info(`It's ${currentTurn === 0 ? "your" : "opponent's"} turn`);
        }
        setSelectedPiece(null);
      }
    },
    [pieces, selectedPiece, activeId],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setSelectedPiece(null);
  }

  function handleDragOver(event: DragOverEvent) {
    setHoveredCellId(event.over ? (event.over.id as string) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);
    setHoveredCellId(null);

    if (!over?.data?.current) return;

    const pieceId = active.id as string;
    const selectedPiece = pieces.find((p) => p.id === pieceId);

    if (!selectedPiece || selectedPiece.team !== currentTurn) return;

    const { x, y } = over.data.current as { x: number; y: number };

    if (selectedPiece) {
      if (
        referee.isMoveLegal(
          selectedPiece.x,
          selectedPiece.y,
          x,
          y,
          selectedPiece.role,
          selectedPiece.team,
          pieces,
        )
      ) {
        playMove();
        makeMove(pieceId, x, y);
        // toast.info(`It's ${currentTurn === 0 ? "your" : "opponent's"} turn`);
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setHoveredCellId(null);
  }

  let board = [];

  for (let i = 7; i >= 0; i--) {
    for (let j = 0; j < 8; j++) {
      const isBlack = (i + j) % 2 === 0;

      const piece = pieceMap.get(`${j},${i}`);
      const isSelected = selectedPiece?.x === j && selectedPiece?.y === i;
      const isHovered = hoveredCellId === `${j},${i}`;

      board.push(
        <Cell key={`${i},${j}`} x={j} y={i} pick={pickPiece}>
          <div className="w-full h-full">
            <CellColor isBlack={isBlack} />

            {j === 0 && (
              <span
                className={`absolute top-0.5 left-0.5 text-[10px] font-bold md:text-xs 
          ${isBlack ? "text-[#E8EDF9]" : "text-[#B7C0D8]"}`}
              >
                {i + 1}
              </span>
            )}

            {i === 0 && (
              <span
                className={`absolute bottom-0.5 right-0.5 text-[10px] uppercase font-bold md:text-xs 
          ${isBlack ? "text-[#E8EDF9]" : "text-[#B7C0D8]"}`}
              >
                {horizonAxis[j]}
              </span>
            )}

            {validMoves.includes(`${j},${i}`) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {pieceMap.has(`${j},${i}`) ? (
                  <div className="w-full h-full border-5 border-[#9990EC] opacity-90 rounded-full" />
                ) : (
                  <div className="w-5 h-5 md:w-7 md:h-7 bg-[#9990EC] opacity-90 rounded-full" />
                )}
              </div>
            )}

            {isSelected && (
              <div className="absolute inset-0 border-4 bg-[#B1A7FC] opacity-70 pointer-events-none" />
            )}
            {isHovered && !isSelected && (
              <div className="absolute inset-0 border-4 bg-[#B1A7FC] opacity-70 pointer-events-none" />
            )}
            {piece && <DraggablePiece id={piece.id} image={piece.image} />}
          </div>
        </Cell>,
      );
    }
  }

  return (
    <div
      ref={boardRef}
      className="w-[95vw] h-[95vw] md:w-200 md:h-200 bg-white grid grid-cols-8 grid-rows-8 shadow-2xl border-3 border-white"
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
        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          {activePiece ? (
            <div className="relative w-full h-full opacity-95 drop-shadow-2xl">
              <Image
                src={activePiece.image}
                alt="dragging piece"
                fill
                sizes="80px"
                className="object-contain pointer-events-none select-none"
                priority
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isCheckmate && (
        <IsCheckmatePopup restart={() => setIsCheckmate(false)}/>
      )}
    </div>
  );
}

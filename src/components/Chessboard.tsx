"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
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

type Piece = {
  id: string;
  image: string;
  x: number;
  y: number;
};

function getPieceImage(name: string, type: string) {
  return `/pieces/Light/${name}, ${type}.png`;
}

function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let p = 0; p < 2; p++) {
    const type = p === 0 ? "Black" : "White";

    const y = p === 0 ? 7 : 0;

    pieces.push({
      id: `rook-${type}-0`,
      image: getPieceImage("Rook", type),
      x: 0,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-1`,
      image: getPieceImage("Knight", type),
      x: 1,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-2`,
      image: getPieceImage("Bishop", type),
      x: 2,
      y: y,
    });
    pieces.push({
      id: `queen-${type}-3`,
      image: getPieceImage("Queen", type),
      x: 3,
      y: y,
    });
    pieces.push({
      id: `king-${type}-4`,
      image: getPieceImage("King", type),
      x: 4,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-5`,
      image: getPieceImage("Bishop", type),
      x: 5,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-6`,
      image: getPieceImage("Knight", type),
      x: 6,
      y: y,
    });
    pieces.push({
      id: `rook-${type}-7`,
      image: getPieceImage("Rook", type),
      x: 7,
      y: y,
    });
  }

  for (let i = 0; i < 8; i++) {
    pieces.push({
      id: `pawn-black-${i}`,
      image: getPieceImage("Pawn", "Black"),
      x: i,
      y: 6,
    });
    pieces.push({
      id: `pawn-white-${i}`,
      image: getPieceImage("Pawn", "White"),
      x: i,
      y: 1,
    });
  }

  return pieces;
}

const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Chessboard() {
  const boardRef = useRef<HTMLDivElement>(null);

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

  const [pieces, setPieces] = useState<Piece[]>(createInitialPieces());
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);

  const pieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    pieces.forEach((p) => map.set(`${p.x},${p.y}`, p));

    return map;
  }, [pieces]);

  const activePiece = useMemo(
    () => pieces.find((p) => p.id === activeId) ?? null,
    [pieces, activeId],
  );

  const pickPiece = useCallback(
    (x: number, y: number) => {
      if (activeId) return;

      const piece = pieces.find((p) => p.x === x && p.y === y);

      if (!selectedPiece && piece) {
        setSelectedPiece(piece);
        return;
      }

      if (selectedPiece) {
        setPieces((prev) => {
          return prev
            .filter(
              (p) => !(p.x === x && p.y === y && p.id !== selectedPiece.id),
            )
            .map((p) => (p.id === selectedPiece.id ? { ...p, x, y } : p));
        });

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
    const { x, y } = over.data.current as { x: number; y: number };

    setPieces((prev) => {
      return prev
        .filter((p) => !(p.x === x && p.y === y && p.id !== pieceId))
        .map((p) => (p.id === pieceId ? { ...p, x, y } : p));
    });
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
    <div ref={boardRef} className="w-160 h-160 bg-white grid grid-cols-8 grid-rows-8">
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
    </div>
  );
}

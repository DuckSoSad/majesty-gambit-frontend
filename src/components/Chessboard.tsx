"use client";

import React, { use, useState } from "react";
import Cell from "./Cell";
import Piece from "./Piece";

import { DragEndEvent, DndContext, useSensors, TouchSensor, useSensor, MouseSensor } from "@dnd-kit/core";
import DraggablePiece from "./DraggablePiece";

type Piece = {
  id: string;
  image: string;
  x: number;
  y: number;
};

function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let p = 0; p < 2; p++) {
    const type = p === 0 ? "Black" : "White";

    const y = p === 0 ? 7 : 0;

    pieces.push({
      id: `rook-${type}-0`,
      image: `/pieces/Light/Rook, ${type}.png`,
      x: 0,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-1`,
      image: `/pieces/Light/Knight, ${type}.png`,
      x: 1,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-2`,
      image: `/pieces/Light/Bishop, ${type}.png`,
      x: 2,
      y: y,
    });
    pieces.push({
      id: `queen-${type}-3`,
      image: `/pieces/Light/Queen, ${type}.png`,
      x: 3,
      y: y,
    });
    pieces.push({
      id: `king-${type}-4`,
      image: `/pieces/Light/King, ${type}.png`,
      x: 4,
      y: y,
    });
    pieces.push({
      id: `bishop-${type}-5`,
      image: `/pieces/Light/Bishop, ${type}.png`,
      x: 5,
      y: y,
    });
    pieces.push({
      id: `knight-${type}-6`,
      image: `/pieces/Light/Knight, ${type}.png`,
      x: 6,
      y: y,
    });
    pieces.push({
      id: `rook-${type}-7`,
      image: `/pieces/Light/Rook, ${type}.png`,
      x: 7,
      y: y,
    });
  }

  for (let i = 0; i < 8; i++) {
    pieces.push({
      id: `pawn-black-${i}`,
      image: "/pieces/Light/Pawn, Black.png",
      x: i,
      y: 6,
    });
    pieces.push({
      id: `pawn-white-${i}`,
      image: "/pieces/Light/Pawn, White.png",
      x: i,
      y: 1,
    });
  }

  return pieces;
}

const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Chessboard() {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const [pieces, setPieces] = useState<Piece[]>(createInitialPieces());
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);

  let board = [];

  const pieceMap = new Map<string, Piece>();
  pieces.forEach((p) => pieceMap.set(`${p.x},${p.y}`, p));

  function pickPiece(x: number, y: number) {
    const piece = pieces.find((p) => p.x === x && p.y === y);
    console.log(piece);

    if (!selectedPiece && piece) {
      setSelectedPiece(piece);
      return;
    }

    if (selectedPiece) {
      setPieces((prev) => {
        return prev
          .filter((p) => !(p.x === x && p.y === y && p.id !== selectedPiece.id))
          .map((p) => (p.id === selectedPiece.id ? { ...p, x, y } : p));
      });

      setSelectedPiece(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const pieceId = active.id as string;
    
    if (!over?.data?.current) return;
    const { x, y } = over.data.current as { x: number; y: number };

    setPieces((prev) => {
      return prev
        .filter((p) => !(p.x === x && p.y === y && p.id !== pieceId))
        .map((p) => (p.id === pieceId ? { ...p, x, y } : p));
    });
  }

  for (let i = verticalAxis.length - 1; i >= 0; i--) {
    for (let j = 0; j < horizonAxis.length; j++) {
      const isBlack = (i + j) % 2 === 0;

      const piece = pieceMap.get(`${j},${i}`);

      board.push(
        <Cell key={`${i},${j}`} x={j} y={i} pick={() => pickPiece(j, i)} >
          <div className="w-full h-full">
            <Piece isBlack={isBlack} />
            {piece && (
              <DraggablePiece
                id={piece.id}
                image={piece.image}
              />
            )}
          </div>
        </Cell>,
      );
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="w-160 h-160 bg-white grid grid-cols-8 grid-rows-8">
        {board}
      </div>
    </DndContext>
  );
}

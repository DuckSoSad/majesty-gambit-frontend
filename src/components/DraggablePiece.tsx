"use client";

import React from "react";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";

type DraggablePiece = {
  id: string;
  image: string;
};

function DraggablePiece({ id, image }: DraggablePiece) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute inset-0 flex items-center justify-center cursor-grab touch-none transition-opacity duration-100
        ${isDragging ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative w-[90%] h-[90%]">
        <Image
          src={image}
          alt="piece"
          fill
          sizes="(max-width: 768px) 13vw, 80px"
          className="object-contain pointer-events-none select-none"
          priority
        />
      </div>
    </div>
  );
}

export default React.memo(DraggablePiece);

"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

function Cell({ x, y, pick, children }: any) {
  const { setNodeRef } = useDroppable({
    id: `${x},${y}`,
    data: { x, y },
  });

  return <div className="relative w-full h-full" ref={setNodeRef} onClick={() => pick(x, y)}>{children}</div>;
}

export default React.memo(Cell);
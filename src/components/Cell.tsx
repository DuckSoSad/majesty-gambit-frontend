"use client";

import { useDroppable } from "@dnd-kit/core";

export default function Cell({ x, y, pick, children }: any) {
  const { setNodeRef } = useDroppable({
    id: `${x},${y}`,
    data: { x, y },
  });

  return <div className="w-full h-full relative" ref={setNodeRef} onClick={pick}>{children}</div>;
}

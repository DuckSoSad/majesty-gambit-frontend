import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";

type DraggablePiece = {
  id: string;
  image: string;
};

export default function DraggablePiece({ id, image }: DraggablePiece) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute inset-0 flex items-center justify-center cursor-grab
        ${isDragging ? "z-50" : "z-10"}`}
    >
      <div className="relative w-full h-full">
        <Image src={image} alt="piece" fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}

"use client"

import Button from "@/components/Button";
import Chessboard from "@/components/Chessboard";
import MoveHistory from "@/components/MoveHistory";
import { useGameStore } from "@/store/useGameStore";
import Link from "next/link";

export default function Page() {
    const resetGame = useGameStore((state) => state.resetGame);
  return (
    <div className="relative flex flex-col md:flex-row gap-5 min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-[#302E2B]">
      <div className="absolute top-15 left-0">
        <Link href={`/`}><Button text="Quay lại" onClick={resetGame}/></Link>
      </div>
      <div className="flex w-fit items-center justify-center bg-white dark:bg-[#302E2B]">
        <Chessboard />
      </div>
      <div className="w-[95vw] h-[95vw] md:w-150 md:h-200 text-center">
        <MoveHistory />
      </div>
    </div>
  );
}

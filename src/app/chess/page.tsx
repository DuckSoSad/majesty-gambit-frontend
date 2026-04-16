"use client";

import Button from "@/components/Button";
import Chessboard from "@/components/Chessboard";
import GuidePopup from "@/components/GuidePopup";
import MoveHistory from "@/components/MoveHistory";
import { useGuide } from "@/hooks/useGuide";
import { useGameStore } from "@/store/useGameStore";
import { ChevronLeft, HelpCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Page() {
  const resetGame = useGameStore((state) => state.resetGame);
  const { open } = useGuide();

  useEffect(() => {
    open();
  }, []);

  return (
    <div className="relative flex flex-col md:flex-row gap-5 min-h-screen items-center justify-center font-sans bg-[#F4F7FA] dark:bg-[#34364C]">
      <div className="fixed top-4 left-2 md:left-4 z-40">
        <Link href="/">
          <button
            onClick={resetGame}
            className="group flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-[#2A2D45]/90 backdrop-blur-sm text-[#4A4A4A] dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-95 transition-all"
          >
            <ChevronLeft size={18} />
            <span className="font-bold text-sm">Quay lại</span>
          </button>
        </Link>
      </div>

      <div className="fixed top-4 right-2 md:right-4 z-40">
        <button
          onClick={() => open(true)}
          className="p-2.5 bg-[#B1A7FC] text-white rounded-full shadow-lg shadow-[#B1A7FC]/30 active:scale-90 transition-all cursor-pointer"
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div className="mt-16 lg:mt-0 flex flex-col items-center gap-4 w-full max-w-fit">
        {" "}
        <div className="flex flex-col items-center gap-4">
          <Chessboard />

          <button
            onClick={resetGame}
            className="flex md:hidden items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-tighter"
          >
            <RotateCcw size={16} /> Làm mới ván đấu
          </button>
        </div>
      </div>
      <div className="w-[95vw] h-[95vw] md:w-150 md:h-200 text-center">
        <MoveHistory />
      </div>

      <GuidePopup />
    </div>
  );
}

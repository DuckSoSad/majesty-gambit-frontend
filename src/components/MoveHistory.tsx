"use client";

import { useGameStore } from "@/store/useGameStore";

export default function MoveHistory() {
  const moveHistory = useGameStore((state) => state.moveHistory);

  const pairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#262522] text-[#bababa]">
      <div className="bg-[#21201D] p-5">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Majesty Gambit
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[40px_1fr_1fr] text-sm font-semibold">
          {pairs.map((pair, index) => (
            <div key={index} className="contents">
              <div className="flex items-center justify-center bg-[#2b2a27] py-2 text-[#757575]">
                {index + 1}
              </div>
              
              <div className="cursor-pointer px-3 py-2 hover:bg-[#32312e] hover:text-white transition-colors">
                {pair[0]}
              </div>

              <div className="cursor-pointer px-3 py-2 hover:bg-[#32312e] hover:text-white transition-colors">
                {pair[1] || ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
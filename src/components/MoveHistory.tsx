"use client";

import { useGameStore } from "@/store/useGameStore";

export default function MoveHistory() {
  const moveHistory = useGameStore((state) => state.moveHistory);

  const ourEatenHistory = useGameStore((state) => state.ourEatenHistory);
  const opnEatenHistory = useGameStore((state) => state.opnEatenHistory);

  const pairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-3 border-[#B7C0D8] rounded-xl bg-[#DEE2E6] text-[#bababa]">
      <div className="bg-[#B7C0D8] p-5">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Majesty Gambit
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[40px_1fr_1fr] text-sm font-semibold">
          {pairs.map((pair, index) => (
            <div key={index} className="contents">
              <div className="flex items-center justify-center bg-[#33364B] py-2 text-white">
                {index + 1}
              </div>

              <div className="text-start cursor-pointer px-3 py-2 border border-[#33364B] text-[#34384B] transition-colors">
                {pair[0]}
              </div>

              <div className="text-start cursor-pointer px-3 py-2 border border-[#33364B] text-[#34384B] transition-colors">
                {pair[1] || ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#B7C0D8] border-t-3 border-[#B7C0D8] rounded-b-xl h-36 p-3 text-start overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-[#34384D] uppercase">Trắng</p>
            <div className="flex flex-wrap gap-1 max-w-full">
              {ourEatenHistory.map((icon, index) => (
                <span
                  key={index}
                  className="text-[#34384D] border-white text-2xl md:text-3xl opacity-80 hover:opacity-100 transition-opacity"
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-[#34384D] uppercase">Đen</p>
            <div className="flex flex-wrap gap-1 max-w-full">
              {opnEatenHistory.map((icon, index) => (
                <span
                  key={index}
                  className="text-[#34384D] text-2xl md:text-3xl opacity-80 hover:opacity-100 transition-opacity"
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

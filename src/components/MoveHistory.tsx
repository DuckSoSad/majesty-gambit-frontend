"use client";

import { useGameStore } from "@/store/useGameStore";

type MoveHistoryProps = {
  moveHistory?: string[];
  ourEatenHistory?: string[];
  opnEatenHistory?: string[];
  title?: string;
  leftLabel?: string;
  rightLabel?: string;
};

export default function MoveHistory({
  moveHistory: externalMoveHistory,
  ourEatenHistory: externalOurEatenHistory,
  opnEatenHistory: externalOpnEatenHistory,
  title = "Majesty Gambit",
  leftLabel = "Trắng",
  rightLabel = "Đen",
}: MoveHistoryProps) {
  const storeMoveHistory = useGameStore((state) => state.moveHistory);
  const storeOurEatenHistory = useGameStore((state) => state.ourEatenHistory);
  const storeOpnEatenHistory = useGameStore((state) => state.opnEatenHistory);

  const moveHistory = externalMoveHistory ?? storeMoveHistory;
  const ourEatenHistory = externalOurEatenHistory ?? storeOurEatenHistory;
  const opnEatenHistory = externalOpnEatenHistory ?? storeOpnEatenHistory;

  const pairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-3 border-[#B7C0D8] rounded-xl bg-[#DEE2E6] text-[#bababa]">
      <div className="bg-[#B7C0D8] p-5">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          {title}
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
          {pairs.length === 0 && (
            <div className="col-span-3 px-4 py-8 text-center text-sm font-medium text-[#34384B]/60">
              Chưa có nước đi
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#B7C0D8] border-t-3 border-[#B7C0D8] rounded-b-xl h-36 p-3 text-start overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-[#34384D] uppercase">{leftLabel}</p>
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
            <p className="text-[#34384D] uppercase">{rightLabel}</p>
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

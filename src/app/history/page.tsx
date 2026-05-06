"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type GameHistoryItem = {
  gameId: number;
  opponentUsername: string;
  myColor: "white" | "black";
  result: "win" | "loss" | "draw";
  eloChange: number | null;
  timeControl: string;
  timeLimitSeconds: number;
  endReason: string | null;
  isMatchmaking: boolean;
  playedAt: string | null;
};

const END_REASON_LABEL: Record<string, string> = {
  checkmate: "Chiếu hết",
  resign: "Đầu hàng",
  timeout: "Hết giờ",
  stalemate: "Hòa - Pat",
  agreement: "Hòa thỏa thuận",
  insufficient_material: "Hòa - Thiếu quân",
  threefold_repetition: "Hòa - Lặp 3 lần",
};

const TIME_LABEL: Record<string, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)} phút`;
}

export default function HistoryPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    api.get<GameHistoryItem[]>(`/api/games/history?page=${page}`)
      .then((res) => {
        if (page === 0) setGames(res.data);
        else setGames((prev) => [...prev, ...res.data]);
        setHasMore(res.data.length === 20);
      })
      .finally(() => setLoading(false));
  }, [auth, page]);

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-[#1E2035] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#2A2D45] border-b border-gray-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/lobby">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#1E2035] text-gray-300 hover:text-white rounded-xl border border-gray-700 cursor-pointer transition-all active:scale-95">
              <ChevronLeft size={16} />
              <span className="text-sm font-bold">Lobby</span>
            </button>
          </Link>
          <h1 className="text-xl font-bold text-white">Lịch sử trận đấu</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300 font-semibold">{user?.username}</span>
          <span className="bg-[#B1A7FC]/20 text-[#B1A7FC] font-bold px-2.5 py-0.5 rounded-full text-xs">
            {user?.eloRating} điểm
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto">
        {loading && page === 0 ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 rounded-full border-4 border-[#B1A7FC]/30 border-t-[#B1A7FC] animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-5xl mb-4">♟</p>
            <p className="text-lg font-semibold text-white">Chưa có trận đấu nào</p>
            <p className="text-sm mt-1">Hãy bắt đầu tìm trận để xây dựng lịch sử!</p>
            <button
              onClick={() => router.push("/lobby")}
              className="mt-6 px-6 py-2.5 bg-[#B1A7FC] text-white font-bold rounded-xl cursor-pointer hover:bg-[#9990EC] transition-all"
            >
              Tìm trận ngay
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {games.map((g) => {
              const isWin = g.result === "win";
              const isLoss = g.result === "loss";

              const leftBorder = isWin ? "border-l-green-500" : isLoss ? "border-l-red-500" : "border-l-gray-500";
              const resultBadge = isWin
                ? "bg-green-500/20 text-green-400"
                : isLoss
                ? "bg-red-500/20 text-red-400"
                : "bg-gray-600/30 text-gray-300";
              const resultLabel = isWin ? "Thắng" : isLoss ? "Thua" : "Hòa";

              // eloChange null + isMatchmaking = old game before delta tracking
              const showElo = g.isMatchmaking && g.eloChange != null;
              const eloText = showElo
                ? (g.eloChange! >= 0 ? `+${g.eloChange}` : `${g.eloChange}`)
                : null;
              const eloColor = (g.eloChange ?? 0) >= 0 ? "text-green-400" : "text-red-400";

              return (
                <div
                  key={g.gameId}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl bg-[#2A2D45] border border-gray-700/50 border-l-4 ${leftBorder}`}
                >
                  {/* Result */}
                  <div className={`w-12 text-center py-1 rounded-lg text-xs font-bold shrink-0 ${resultBadge}`}>
                    {resultLabel}
                  </div>

                  {/* Opponent + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-6 h-6 rounded-full bg-[#3A3E5A] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {g.opponentUsername[0]?.toUpperCase()}
                      </div>
                      <span className="text-white font-semibold text-sm">{g.opponentUsername}</span>
                      <span className="text-gray-500 text-xs">
                        {g.myColor === "white" ? "♔" : "♚"}
                      </span>
                      {g.isMatchmaking ? (
                        <span className="text-[10px] bg-[#B1A7FC]/15 text-[#B1A7FC] border border-[#B1A7FC]/30 px-1.5 py-0.5 rounded-full font-bold">
                          RANKED
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-700/50 text-gray-500 border border-gray-600/30 px-1.5 py-0.5 rounded-full">
                          Phòng riêng
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{TIME_LABEL[g.timeControl]} · {formatMinutes(g.timeLimitSeconds)}</span>
                      {g.endReason && <span>· {END_REASON_LABEL[g.endReason] ?? g.endReason}</span>}
                      <span>· {formatDate(g.playedAt)}</span>
                    </div>
                  </div>

                  {/* Elo */}
                  <div className="shrink-0 w-12 text-right">
                    {eloText != null ? (
                      <span className={`text-base font-bold ${eloColor}`}>{eloText}</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Đang tải..." : "Xem thêm"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

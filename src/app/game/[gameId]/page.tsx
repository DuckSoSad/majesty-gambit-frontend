"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Chessboard from "@/components/Chessboard";
import { fenToPieces, formatTime } from "@/utils/fenToPieces";
import api from "@/lib/api";
import { ChessGameState } from "@/types/chess";
import { Piece } from "@/Constants";

export default function GamePage() {
  const auth = useRequireAuth();
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white");
  const [myColor, setMyColor] = useState<"white" | "black">("white");
  const [whiteUsername, setWhiteUsername] = useState("");
  const [blackUsername, setBlackUsername] = useState("");
  const [whiteTimeMs, setWhiteTimeMs] = useState(0);
  const [blackTimeMs, setBlackTimeMs] = useState(0);
  const [isCheck, setIsCheck] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { connected, subscribe, send } = useWebSocket(accessToken);

  const applyState = useCallback((state: ChessGameState) => {
    if (state.fen) setPieces(fenToPieces(state.fen));
    if (state.currentTurn) setCurrentTurn(state.currentTurn);
    if (state.whiteTimeMs !== undefined) setWhiteTimeMs(state.whiteTimeMs);
    if (state.blackTimeMs !== undefined) setBlackTimeMs(state.blackTimeMs);
    if (state.isCheck !== undefined) setIsCheck(state.isCheck);
    if (state.whiteUsername) setWhiteUsername(state.whiteUsername);
    if (state.blackUsername) setBlackUsername(state.blackUsername);
    if (state.result) {
      setGameResult(state.result);
      setEndReason(state.endReason ?? null);
    }
  }, []);

  // Load initial state
  useEffect(() => {
    api.get<ChessGameState>(`/api/games/${gameId}`).then((res) => {
      applyState(res.data);
      const myC = res.data.whiteUsername === user?.username ? "white" : "black";
      setMyColor(myC);
    });
  }, [gameId, user]);

  // WS subscriptions
  useEffect(() => {
    if (!connected) return;

    const gameSub = subscribe(`/topic/game/${gameId}`, applyState);
    const errSub = subscribe("/user/queue/errors", (body: { error: string }) => {
      setError(body.error);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      gameSub?.unsubscribe();
      errSub?.unsubscribe();
    };
  }, [connected]);

  // Local clock countdown
  useEffect(() => {
    if (gameResult) return;
    const id = setInterval(() => {
      if (currentTurn === "white") setWhiteTimeMs((t) => Math.max(0, t - 100));
      else setBlackTimeMs((t) => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(id);
  }, [currentTurn, gameResult]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    send(`/app/game/${gameId}/move`, {
      gameId: Number(gameId),
      fromSquare: from,
      toSquare: to,
      promotion: promotion ?? null,
      timeSpentMs: 0,
    });
  }, [gameId, send]);

  const handleResign = () => {
    if (!confirm("Bạn có chắc muốn đầu hàng?")) return;
    send(`/app/game/${gameId}/resign`, {});
  };

  if (!auth) return null;

  const isMyTurn = currentTurn === myColor;
  const opponentName = myColor === "white" ? blackUsername : whiteUsername;
  const myTime = myColor === "white" ? whiteTimeMs : blackTimeMs;
  const oppTime = myColor === "white" ? blackTimeMs : whiteTimeMs;
  const myTimeStr = formatTime(myTime);
  const oppTimeStr = formatTime(oppTime);

  const resultText = () => {
    if (!gameResult) return null;
    if (gameResult === "draw") return "Hòa!";
    const winColor = gameResult === "white_win" ? "white" : "black";
    return winColor === myColor ? "Bạn thắng! 🎉" : "Bạn thua!";
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#34364C] flex flex-col md:flex-row items-center justify-center gap-5 p-4">
      <div className="flex flex-col gap-3 w-full max-w-fit">
        {/* Opponent info + clock */}
        <div className="flex items-center justify-between bg-[#2A2D45] rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
              {opponentName?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{opponentName}</p>
              <p className="text-gray-400 text-xs">{myColor === "white" ? "Đen" : "Trắng"}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono px-4 py-1 rounded-lg ${!isMyTurn && !gameResult ? "bg-white text-[#2A2D45]" : "bg-[#1E2035] text-gray-400"}`}>
            {oppTimeStr}
          </div>
        </div>

        {/* Board */}
        <div className="relative">
          <Chessboard
            onlineMode
            myColor={myColor}
            externalPieces={pieces}
            onlineTurn={currentTurn}
            onMove={handleMove}
            gameOver={!!gameResult}
          />
          {error && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50">
              {error}
            </div>
          )}
        </div>

        {/* My info + clock */}
        <div className="flex items-center justify-between bg-[#2A2D45] rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#B1A7FC] flex items-center justify-center text-white font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user?.username}</p>
              <p className="text-[#B1A7FC] text-xs">{myColor === "white" ? "Trắng" : "Đen"} · {isMyTurn ? "Lượt của bạn" : "Đang chờ..."}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono px-4 py-1 rounded-lg ${isMyTurn && !gameResult ? "bg-white text-[#2A2D45]" : "bg-[#1E2035] text-gray-400"}`}>
            {myTimeStr}
          </div>
        </div>

        {/* Resign */}
        {!gameResult && (
          <button onClick={handleResign} className="text-gray-500 hover:text-red-400 text-sm transition-colors text-center py-1">
            Đầu hàng
          </button>
        )}
      </div>

      {/* Game result overlay */}
      {gameResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#B1A7FC] rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
            <p className="text-[#4A447D] text-sm font-bold uppercase tracking-widest mb-2">Trận đấu kết thúc</p>
            <p className="text-4xl font-bold text-white mb-2">{resultText()}</p>
            {endReason && (
              <p className="text-[#D0CAFF] text-sm mb-6 capitalize">
                {{ checkmate: "Chiếu hết", resign: "Đầu hàng", timeout: "Hết giờ", stalemate: "Hòa - Pat", agreement: "Hòa thỏa thuận" }[endReason] ?? endReason}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                Về lobby
              </button>
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white text-[#B1A7FC] font-bold py-3 rounded-xl transition-all cursor-pointer">
                Chơi lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

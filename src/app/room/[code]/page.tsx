"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import api from "@/lib/api";
import { RoomInfo, RoomMessage } from "@/types/chess";

export default function RoomPage() {
  const auth = useRequireAuth();
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [iAmReady, setIAmReady] = useState(false);
  const [error, setError] = useState("");

  const { connected, subscribe, send } = useWebSocket(accessToken);

  // Load room info
  useEffect(() => {
    api.get(`/api/rooms/${code}`).then((res) => setRoom(res.data)).catch(() => {
      setError("Không tìm thấy phòng");
    });
  }, [code]);

  // WS subscriptions
  useEffect(() => {
    if (!connected) return;

    // Notify others I joined
    send(`/app/room/${code}/join`, {});

    const sub = subscribe(`/topic/room/${code}`, (msg: RoomMessage) => {
      if (msg.type === "player_joined") {
        // Refresh room data
        api.get(`/api/rooms/${code}`).then((res) => setRoom(res.data));
      }

      if (msg.type === "player_ready") {
        api.get(`/api/rooms/${code}`).then((res) => setRoom(res.data));
      }

      if (msg.type === "game_start" && msg.gameId) {
        router.push(`/game/${msg.gameId}`);
      }
    });

    return () => sub?.unsubscribe();
  }, [connected]);

  const handleReady = useCallback(() => {
    if (iAmReady) return;
    send(`/app/room/${code}/ready`, {});
    setIAmReady(true);
  }, [iAmReady, code, send]);

  if (!auth) return null;

  const myPlayer = room?.players.find((p) => p.username === user?.username);
  const opponent = room?.players.find((p) => p.username !== user?.username);
  const canReady = room?.players.length === 2 && !iAmReady;

  return (
    <div className="min-h-screen bg-[#302E2B] bg-[url('/layouts/Cover-Dark.png')] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#2A2D45]/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Mã phòng</p>
          <h2 className="text-4xl font-bold text-[#B1A7FC] tracking-widest">{code}</h2>
          <p className="text-gray-400 text-sm mt-2">
            {room?.timeControl} · {room && Math.floor(room.timeLimitSeconds / 60)} phút
          </p>
        </div>

        {/* Players */}
        <div className="flex flex-col gap-3 mb-8">
          {[user?.username, opponent?.username || "Đang chờ..."].map((name, i) => {
            const isMe = i === 0;
            const isReady = isMe ? iAmReady : (room?.players.find(p => p.username === name)?.isReady ?? false);
            return (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${isMe ? "border-[#B1A7FC]/50 bg-[#B1A7FC]/10" : "border-gray-600 bg-[#1E2035]"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${isMe ? "bg-[#B1A7FC] text-white" : "bg-gray-600 text-gray-300"}`}>
                    {name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{name}</p>
                    {isMe && <p className="text-gray-400 text-xs">Bạn</p>}
                  </div>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${isReady ? "bg-green-500/20 text-green-400" : "bg-gray-600/50 text-gray-400"}`}>
                  {name === "Đang chờ..." ? "—" : isReady ? "Sẵn sàng" : "Chưa sẵn sàng"}
                </span>
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleReady}
            disabled={!canReady}
            className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer"
          >
            {iAmReady ? "✓ Đã sẵn sàng" : room?.players.length === 1 ? "Chờ đối thủ..." : "Sẵn sàng!"}
          </button>

          <button
            onClick={() => router.push("/lobby")}
            className="w-full py-3 rounded-xl text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 transition-all text-sm font-medium"
          >
            Rời phòng
          </button>
        </div>

        <div className={`mt-4 flex items-center justify-center gap-2 text-xs ${connected ? "text-green-400" : "text-gray-500"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-500"}`} />
          {connected ? "Đã kết nối" : "Đang kết nối..."}
        </div>
      </div>
    </div>
  );
}

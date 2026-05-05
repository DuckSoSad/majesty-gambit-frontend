"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import api from "@/lib/api";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AxiosError } from "axios";
import { StompSubscription } from "@stomp/stompjs";

const TIME_CONTROLS = [
  { label: "Bullet 1+0", value: "bullet", seconds: 60 },
  { label: "Blitz 3+0", value: "blitz", seconds: 180 },
  { label: "Blitz 5+0", value: "blitz", seconds: 300 },
  { label: "Rapid 10+0", value: "rapid", seconds: 600 },
];

type ColorPreference = "white" | "random" | "black";

const COLOR_OPTIONS: { value: ColorPreference; label: string; icon: string }[] = [
  { value: "white", label: "Trắng", icon: "♔" },
  { value: "random", label: "Ngẫu nhiên", icon: "⚄" },
  { value: "black", label: "Đen", icon: "♚" },
];

export default function LobbyPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [tab, setTab] = useState<"find" | "private">("find");
  const [privateTab, setPrivateTab] = useState<"create" | "join">("create");
  const [selected, setSelected] = useState(2);
  const [colorPreference, setColorPreference] = useState<ColorPreference>("random");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");

  const matchSubRef = useRef<StompSubscription | undefined>(undefined);
  const { connected, subscribe } = useWebSocket(accessToken);

  if (!auth) return null;

  function switchTab(next: "find" | "private") {
    setTab(next);
    setError("");
  }

  async function handleFindMatch() {
    setError("");
    setLoading(true);
    try {
      const tc = TIME_CONTROLS[selected];
      // Subscribe before POST to avoid missing the match_found message
      matchSubRef.current = subscribe("/user/queue/matchmaking", (msg: { type: string; gameId?: number }) => {
        if (msg.type === "match_found" && msg.gameId) {
          router.push(`/game/${msg.gameId}`);
        }
      });
      await api.post("/api/matchmaking/queue", {
        timeControl: tc.value,
        timeLimitSeconds: tc.seconds,
      });
      setSearchLabel(tc.label);
      setIsSearching(true);
    } catch (err) {
      matchSubRef.current?.unsubscribe();
      matchSubRef.current = undefined;
      const e = err as AxiosError<{ error?: string; message?: string }>;
      setError(e.response?.data?.message || e.response?.data?.error || "Không thể tìm trận");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSearch() {
    matchSubRef.current?.unsubscribe();
    matchSubRef.current = undefined;
    try { await api.delete("/api/matchmaking/queue"); } catch {}
    setIsSearching(false);
  }

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const tc = TIME_CONTROLS[selected];
      const res = await api.post("/api/rooms", {
        timeControl: tc.value,
        timeLimitSeconds: tc.seconds,
        colorPreference,
      });
      router.push(`/room/${res.data.code}`);
    } catch (err) {
      const e = err as AxiosError<{ error?: string; message?: string }>;
      setError(e.response?.data?.message || e.response?.data?.error || `Tạo phòng thất bại${e.response?.status ? ` (${e.response.status})` : ""}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/rooms/${code.toUpperCase()}/join`);
      router.push(`/room/${code.toUpperCase()}`);
    } catch (err) {
      const e = err as AxiosError<{ error?: string; message?: string }>;
      setError(e.response?.data?.message || e.response?.data?.error || "Không tìm thấy phòng");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try { await api.post("/api/auth/logout", { refreshToken }); } catch {}
    }
    logout();
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen bg-[#302E2B] bg-[url('/layouts/Cover-Dark.png')] flex flex-col">
      <div className="absolute top-26 md:top-20 left-2 md:left-4">
        <Link href="/">
          <button className="group flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-[#2A2D45]/90 backdrop-blur-sm text-[#4A4A4A] dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-95 transition-all">
            <ChevronLeft size={18} />
            <span className="font-bold text-sm">Quay lại</span>
          </button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#2A2D45]/80 backdrop-blur-sm border-b border-gray-700">
        <h1 className="text-2xl font-bold text-[#B1A7FC]">Majesty Gambit</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            ♟ <span className="text-white font-semibold">{user?.username}</span>
            <span className="text-[#B1A7FC] ml-2">{user?.eloRating}</span>
          </span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2A2D45]/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">

          {isSearching ? (
            <SearchingView label={searchLabel} onCancel={handleCancelSearch} />
          ) : (
            <>
              {/* Main tabs */}
              <div className="flex mb-6 bg-[#1E2035] rounded-xl p-1">
                <button
                  onClick={() => switchTab("find")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "find" ? "bg-[#B1A7FC] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Tìm trận
                </button>
                <button
                  onClick={() => switchTab("private")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "private" ? "bg-[#B1A7FC] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Phòng riêng
                </button>
              </div>

              {tab === "find" ? (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-300 text-sm font-medium">Chọn thời gian:</p>
                  <TimeControlGrid selected={selected} onSelect={setSelected} />
                  {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                  <button
                    onClick={handleFindMatch}
                    disabled={loading || !connected}
                    className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-50 text-white text-lg font-bold py-3 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer mt-2"
                  >
                    {loading ? "Đang kết nối..." : !connected ? "Đang kết nối..." : "Tìm trận"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Private sub-tabs */}
                  <div className="flex bg-[#1E2035] rounded-lg p-0.5">
                    <button
                      onClick={() => { setPrivateTab("create"); setError(""); }}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${privateTab === "create" ? "bg-[#3A3E5A] text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      Tạo phòng
                    </button>
                    <button
                      onClick={() => { setPrivateTab("join"); setError(""); }}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${privateTab === "join" ? "bg-[#3A3E5A] text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      Vào phòng
                    </button>
                  </div>

                  {privateTab === "create" ? (
                    <>
                      <p className="text-gray-300 text-sm font-medium">Chọn thời gian:</p>
                      <TimeControlGrid selected={selected} onSelect={setSelected} />
                      <div>
                        <p className="text-gray-300 text-sm font-medium mb-2">Màu cờ:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {COLOR_OPTIONS.map(({ value, label, icon }) => (
                            <button
                              key={value}
                              onClick={() => setColorPreference(value)}
                              className={`flex flex-col items-center py-3 rounded-xl text-xs font-bold transition-all border-2 gap-1 cursor-pointer ${
                                colorPreference === value
                                  ? "border-[#B1A7FC] bg-[#B1A7FC]/20 text-white"
                                  : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
                              }`}
                            >
                              <span className="text-2xl">{icon}</span>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                      <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-50 text-white text-lg font-bold py-3 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer"
                      >
                        {loading ? "Đang tạo..." : "Tạo phòng"}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleJoin} className="flex flex-col gap-4">
                      <div>
                        <label className="text-gray-300 text-sm font-medium mb-1 block">Mã phòng</label>
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="w-full px-4 py-3 rounded-xl bg-[#1E2035] text-white text-center text-2xl font-bold tracking-widest border border-gray-600 focus:border-[#B1A7FC] focus:outline-none"
                          placeholder="XXXXXX"
                          required
                        />
                      </div>
                      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-50 text-white text-lg font-bold py-3 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer"
                      >
                        {loading ? "Đang vào..." : "Vào phòng"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeControlGrid({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TIME_CONTROLS.map((tc, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${
            selected === i
              ? "border-[#B1A7FC] bg-[#B1A7FC]/20 text-white"
              : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
          }`}
        >
          {tc.label}
        </button>
      ))}
    </div>
  );
}

function SearchingView({ label, onCancel }: { label: string; onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-[#B1A7FC]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#B1A7FC] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl select-none">♟</div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-lg">Đang tìm đối thủ...</p>
        <p className="text-gray-400 text-sm mt-1">{label}</p>
      </div>
      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-xl border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm font-medium cursor-pointer"
      >
        Hủy tìm kiếm
      </button>
    </div>
  );
}

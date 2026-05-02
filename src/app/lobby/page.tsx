"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

const TIME_CONTROLS = [
  { label: "Bullet 1+0", value: "bullet", seconds: 60 },
  { label: "Blitz 3+0", value: "blitz", seconds: 180 },
  { label: "Blitz 5+0", value: "blitz", seconds: 300 },
  { label: "Rapid 10+0", value: "rapid", seconds: 600 },
];

export default function LobbyPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [tab, setTab] = useState<"create" | "join">("create");
  const [selected, setSelected] = useState(2); // default blitz 5+0
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!auth) return null;

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const tc = TIME_CONTROLS[selected];
      const res = await api.post("/api/rooms", {
        timeControl: tc.value,
        timeLimitSeconds: tc.seconds,
      });
      router.push(`/room/${res.data.code}`);
    } catch {
      setError("Tạo phòng thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/rooms/${code.toUpperCase()}/join`);
      router.push(`/room/${code.toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy phòng");
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
    <div className="min-h-screen bg-[#302E2B] bg-[url('/layouts/Cover-Dark.png')] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#2A2D45]/80 backdrop-blur-sm border-b border-gray-700">
        <h1 className="text-2xl font-bold text-[#B1A7FC]">Majesty Gambit</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            ♟ <span className="text-white font-semibold">{user?.username}</span>
            <span className="text-[#B1A7FC] ml-2">{user?.eloRating}</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2A2D45]/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
          {/* Tabs */}
          <div className="flex mb-6 bg-[#1E2035] rounded-xl p-1">
            <button
              onClick={() => { setTab("create"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "create" ? "bg-[#B1A7FC] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Tạo phòng
            </button>
            <button
              onClick={() => { setTab("join"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "join" ? "bg-[#B1A7FC] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Vào phòng
            </button>
          </div>

          {tab === "create" ? (
            <div className="flex flex-col gap-4">
              <p className="text-gray-300 text-sm font-medium">Chọn thời gian:</p>
              <div className="grid grid-cols-2 gap-3">
                {TIME_CONTROLS.map((tc, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      selected === i
                        ? "border-[#B1A7FC] bg-[#B1A7FC]/20 text-white"
                        : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-50 text-white text-lg font-bold py-3 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer mt-2"
              >
                {loading ? "Đang tạo..." : "Tạo phòng"}
              </button>
            </div>
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
      </div>
    </div>
  );
}

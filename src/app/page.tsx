"use client";

import Link from "next/link";
import GuidePopup from "@/components/GuidePopup";
import { useGuide } from "@/hooks/useGuide";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function Home() {
  const { open } = useGuide();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

  // Redirect back to ongoing game if user has one
  useEffect(() => {
    if (!accessToken) return;
    api.get<{ roomCode?: string }>("/api/games/active").then((res) => {
      if (res.data.roomCode) router.replace(`/game/${res.data.roomCode}`);
    }).catch(() => {});
  }, [accessToken, router]);

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try { await api.post("/api/auth/logout", { refreshToken }); } catch {}
    }
    logout();
  }

  function handleOnline() {
    if (accessToken) router.push("/lobby");
    else router.push("/login");
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen items-center justify-center bg-[#302E2B] p-5 gap-10 font-sans bg-[url('/layouts/Cover-Light.png')] dark:bg-[url('/layouts/Cover-Dark.png')]">
      <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-xl">
        <h1 className="text-4xl lg:text-6xl font-bold text-[#B1A7FC] leading-tight">
          Majesty Gambit <br />
          <span className="text-[#B1A7FC]">Online</span>
        </h1>

        <p className="text-zinc-400 text-lg">
          Thử thách kỹ năng của bạn với mọi người trên khắp thế giới hoặc luyện tập với máy tính.
        </p>

        {/* Auth status */}
        {user ? (
          <div className="flex items-center gap-3 bg-[#2A2D45]/80 rounded-xl px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-[#B1A7FC] flex items-center justify-center text-white font-bold text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-white font-semibold">{user.username}</span>
            <span className="text-[#B1A7FC]">·</span>
            <span className="text-[#B1A7FC] font-semibold">{user.eloRating}</span>
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 text-xs ml-2 transition-colors">
              Đăng xuất
            </button>
          </div>
        ) : null}

        <div className="w-full flex flex-col gap-4 mt-4">
          <Link href="/chess" className="w-full">
            <button className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] text-white text-2xl font-bold py-6 rounded-xl transition-all shadow-[0_5px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer">
              Chơi nội bộ (1 máy)
            </button>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <button className="bg-[#B1A7FC] hover:bg-[#9990EC] text-white font-semibold py-4 rounded-lg transition-colors cursor-pointer opacity-50" disabled>
              Chơi với Máy
            </button>
            <button
              onClick={handleOnline}
              className="bg-[#B1A7FC] hover:bg-[#9990EC] text-white font-semibold py-4 rounded-lg transition-colors cursor-pointer"
            >
              ONLINE
            </button>
          </div>

          {!user && (
            <div className="grid grid-cols-2 gap-4">
              <Link href="/login" className="w-full">
                <button className="w-full border-2 border-[#B1A7FC] text-[#B1A7FC] hover:bg-[#B1A7FC]/10 font-semibold py-3 rounded-lg transition-colors cursor-pointer">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/register" className="w-full">
                <button className="w-full border-2 border-[#B1A7FC] text-[#B1A7FC] hover:bg-[#B1A7FC]/10 font-semibold py-3 rounded-lg transition-colors cursor-pointer">
                  Đăng ký
                </button>
              </Link>
            </div>
          )}

          <button
            onClick={() => open(true)}
            className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] text-white text-2xl font-bold py-3 rounded-xl transition-all shadow-[0_5px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer"
          >
            Hướng dẫn
          </button>
        </div>

        <div className="pt-8 border-t border-zinc-700 w-full">
          <p className="text-zinc-500 text-sm">Đã có 1,234 người đang thi đấu trực tuyến</p>
        </div>
      </div>

      <div className="w-full max-w-[500px] lg:max-w-[700px] shadow-2xl rounded-lg overflow-hidden" />
      <GuidePopup />
    </div>
  );
}

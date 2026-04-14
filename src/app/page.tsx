import Button from "@/components/Button";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div
      className="flex flex-col lg:flex-row min-h-screen items-center justify-center bg-[#302E2B] p-5 gap-10 font-sans
    bg-[url('/layouts/Cover-Light.png')] dark:bg-[url('/layouts/Cover-Dark.png')]"
    >
      <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-xl">
        <h1 className="text-4xl lg:text-6xl font-bold text-[#B1A7FC] leading-tight">
          Majesty Gambit <br />
          <span className="text-[#B1A7FC]">Online</span>
        </h1>

        <p className="text-zinc-400 text-lg">
          Thử thách kỹ năng của bạn với mọi người trên khắp thế giới hoặc luyện
          tập với máy tính.
        </p>

        <div className="w-full flex flex-col gap-4 mt-4">
          <Link href="/chess" className="w-full">
            <button className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] text-white text-2xl font-bold py-6 rounded-xl transition-all shadow-[0_5px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer">
              Bắt đầu chơi ngay
            </button>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <button className="bg-[#B1A7FC] hover:bg-[#9990EC] text-white font-semibold py-4 rounded-lg transition-colors cursor-pointer">
              Chơi với Máy
            </button>
            <button className="bg-[#B1A7FC] hover:bg-[#9990EC] text-white font-semibold py-4 rounded-lg transition-colors cursor-pointer">
              ONLINE
            </button>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-700 w-full">
          <p className="text-zinc-500 text-sm">
            Đã có 1,234 người đang thi đấu trực tuyến
          </p>
        </div>
      </div>

      <div className="w-full max-w-[500px] lg:max-w-[700px] shadow-2xl rounded-lg overflow-hidden"></div>
    </div>
  );
}

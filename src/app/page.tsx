import Chessboard from "@/components/Chessboard";
import MoveHistory from "@/components/MoveHistory";

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row gap-5 min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-[#302E2B]">
      <main className="flex w-fit items-center justify-center bg-white dark:bg-[#302E2B]">
        <Chessboard />
      </main>
      <section className="w-[95vw] h-[95vw] md:w-150 md:h-200 text-center">
        <MoveHistory />
      </section>
    </div>
  );
}

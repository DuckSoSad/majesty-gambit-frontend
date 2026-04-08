import Chessboard from "@/components/Chessboard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full items-center justify-center bg-white dark:bg-black">
        <Chessboard />
      </main>
    </div>
  );
}

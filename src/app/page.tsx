import Chessboard from "@/components/Chessboard";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex items-center justify-center bg-white dark:bg-black sm:items-start">
        <Chessboard />
      </main>
    </div>
  );
}

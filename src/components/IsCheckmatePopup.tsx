import { TeamType } from "@/Constants";
import Button from "./Button";
import { useGameStore } from "@/store/useGameStore";

type IsCheckmatePopupProps = {
  restart: () => void;
};

export default function IsCheckmatePopup({restart}: IsCheckmatePopupProps) {
  const resetGame = useGameStore((state) => state.resetGame);
  const winner = useGameStore((state) => state.winner); 

  const handleRestartGame = () => {
    restart();
    resetGame();
  }

  const winnerName = winner === TeamType.OUR ? "Đen" : "Trắng";

  return (
    <div className="fixed z-50 inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-[#B1A7FC] text-center rounded-2xl shadow-2xl w-[90%] max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <h2 className="text-sm font-bold text-[#4A447D] uppercase tracking-widest mb-2">
          Trận đấu kết thúc
        </h2>
        <p className="text-4xl uppercase mb-6 font-bold tracking-tight text-slate-900">
          {winnerName} Thắng!
        </p>
        
        <Button text="Chơi lại" onClick={handleRestartGame} />
      </div>
    </div>
  );
}
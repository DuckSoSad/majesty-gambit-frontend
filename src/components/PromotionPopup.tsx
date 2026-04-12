import { getPieceImage, PieceRole, TeamType } from "@/Constants";
import Image from "next/image";

type PromotionPopupProps = {
  team: TeamType;
  onSelect: (role: PieceRole) => void;
};

export default function PromotionPopup({ team, onSelect }: PromotionPopupProps) {
  const type = team === TeamType.OPPONENT ? "Black" : "White";

  const promotionItems = [
    {
      role: PieceRole.Bishop,
      image: getPieceImage("Bishop", type),
    },
    {
      role: PieceRole.Knight,
      image: getPieceImage("Knight", type),
    },
    {
      role: PieceRole.Queen,
      image: getPieceImage("Queen", type),
    },
    {
      role: PieceRole.Rook,
      image: getPieceImage("Rook", type),
    },
  ];

  return (
    <div className="fixed z-50 inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#B1A7FC] text-center rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-300">
        <h3 className="text-xl text-white font-bold mb-4 uppercase tracking-wider">Chọn quân phong cấp</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {promotionItems.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(p.role)}
              className="relative w-30 h-30 bg-white/20 hover:bg-white/40 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-inner p-2 cursor-pointer"
            >
              <div className="relative w-full h-full">
                <Image
                  src={p.image}
                  alt={`${p.role}`}
                  fill
                  className="object-contain pointer-events-none select-none"
                  priority
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

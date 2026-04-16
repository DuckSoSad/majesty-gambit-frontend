"use client";

import { TUTORIAL_DATA } from "@/Constants";
import { useGuide } from "@/hooks/useGuide";
import { useGameStore } from "@/store/useGameStore";

export default function GuidePopup() {
  const { open, close } = useGuide();

  const isOpen = useGameStore((state) => state.isOpenGuide);
  const step = useGameStore((state) => state.guideStep);
  const nextStep = useGameStore((state) => state.nextStep);
  const closeGuide = useGameStore((state) => state.closeGuide);

  if (!isOpen) return null;

  const currentData = TUTORIAL_DATA[step];
  const isLastStep = step === TUTORIAL_DATA.length - 1;

  return (
    <div className="fixed z-[100] inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#B1A7FC] w-full max-w-md rounded-3xl shadow-[0_20px_50px_rgba(177,167,252,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-white/10 pt-8 pb-6 flex justify-center">
          <span className="text-6xl animate-bounce">{currentData.icon}</span>
        </div>

        <div className="p-8 text-center">
          <h3 className="text-2xl text-white font-black uppercase tracking-widest mb-3">
            {currentData.title}
          </h3>

          <div className="min-h-[100px] flex items-center justify-center">
            <p className="text-white/90 leading-relaxed font-medium">
              {currentData.content}
            </p>
          </div>

          <div className="flex justify-center gap-2 my-6">
            {TUTORIAL_DATA.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={isLastStep ? close : nextStep}
              className="w-full bg-white text-[#B1A7FC] font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
            >
              {isLastStep ? "Bắt đầu ngay" : "Tiếp theo"}
            </button>

            {!isLastStep && (
              <button
                onClick={close}
                className="text-white/60 text-sm font-semibold hover:text-white transition-colors cursor-pointer"
              >
                Bỏ qua hướng dẫn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useGameStore } from "@/store/useGameStore";

export const useGuide = () => {
  const { openGuide, closeGuide, isOpenGuide, guideStep, nextStep, backStep } = useGameStore();

  const checkAndOpen = (force = false) => {
    const hasSeen = localStorage.getItem("chess_guide_seen");
    if (!hasSeen || force) {
      openGuide();
    }
  };

  const completeGuide = () => {
    localStorage.setItem("chess_guide_seen", "true");
    closeGuide();
  };

  return {
    isOpen: isOpenGuide,
    step: guideStep,
    next: nextStep,
    back: backStep,
    open: checkAndOpen,
    close: completeGuide,
  };
};
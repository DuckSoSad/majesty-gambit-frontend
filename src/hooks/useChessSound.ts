import { useEffect, useRef } from "react";

export const useChessSounds = () => {
  const gameStart = useRef<HTMLAudioElement | null>(null);
  const moveSound = useRef<HTMLAudioElement | null>(null);
  const captureSound = useRef<HTMLAudioElement | null>(null);
  const moveCheck = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    gameStart.current = new Audio("/sounds/game-start.mp3");
    moveSound.current = new Audio("/sounds/move-self.mp3");
    captureSound.current = new Audio("/sounds/capture.mp3");
    moveCheck.current = new Audio("/sounds/move-check.mp3");

    return () => {
      gameStart.current = null;
      moveSound.current = null;
      captureSound.current = null;
      moveCheck.current = null;
    };
  }, []);

  const playGameStart = () => {
    if (gameStart.current) {
      gameStart.current.currentTime = 0;
      gameStart.current.play().catch(() => {});
    }
  };

  const playMove = () => {
    if (moveSound.current) {
      moveSound.current.currentTime = 0;
      moveSound.current.play().catch(() => {});
    }
  };

  const playCapture = () => {
    if (captureSound.current) {
      captureSound.current.currentTime = 0;
      captureSound.current.play().catch(() => {});
    }
  };

  const playMoveCheck = () => {
    if (moveCheck.current) {
      moveCheck.current.currentTime = 0;
      moveCheck.current.play().catch(() => {});
    }
  };

  return {
    playGameStart,
    playMove,
    playMoveCheck,
    playCapture,
  };
};

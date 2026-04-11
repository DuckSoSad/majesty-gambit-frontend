import { useRef, useState } from "react"

export const useChessSounds = () => {
    const moveSound = useRef<HTMLAudioElement | null>(null);
    const captureSound = useRef<HTMLAudioElement | null>(null);

    useState(() => {
        moveSound.current = new Audio('/sounds/move-self.mp3');
        captureSound.current = new Audio('/sounds/capture.mp3');
    })

    const playMove = () => moveSound.current?.play();
    const playCapture = () => captureSound.current?.play();

    return {
        playMove,
        playCapture,
    }
}
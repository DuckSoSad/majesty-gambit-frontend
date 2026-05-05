import { useCallback, useEffect, useRef } from "react";

const SOUND_FILES = {
  gameStart: "/sounds/game-start.mp3",
  move: "/sounds/move-self.mp3",
  capture: "/sounds/capture.mp3",
  moveCheck: "/sounds/move-check.mp3",
} as const;

type SoundKey = keyof typeof SOUND_FILES;

export const useChessSounds = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});

  useEffect(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    (Object.entries(SOUND_FILES) as [SoundKey, string][]).forEach(([key, url]) => {
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
        .then((buf) => { buffersRef.current[key] = buf; })
        .catch(() => {});
    });

    return () => {
      ctx.close();
      ctxRef.current = null;
      buffersRef.current = {};
    };
  }, []);

  const play = useCallback((key: SoundKey) => {
    const ctx = ctxRef.current;
    const buf = buffersRef.current[key];
    if (!ctx || !buf) return;

    const startPlayback = () => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(startPlayback).catch(() => {});
    } else {
      startPlayback();
    }
  }, []);

  const playGameStart = useCallback(() => play("gameStart"), [play]);
  const playMove = useCallback(() => play("move"), [play]);
  const playCapture = useCallback(() => play("capture"), [play]);
  const playMoveCheck = useCallback(() => play("moveCheck"), [play]);

  return { playGameStart, playMove, playMoveCheck, playCapture };
};

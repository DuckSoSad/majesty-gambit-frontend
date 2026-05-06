"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Chessboard from "@/components/Chessboard";
import ConfirmPopup from "@/components/ConfirmPopup";
import GameChat, { ChatMessage } from "@/components/GameChat";
import MoveHistory from "@/components/MoveHistory";
import { fenToMoveHistory, fenToPieces, formatTime } from "@/utils/fenToPieces";
import api from "@/lib/api";
import { ChessGameState } from "@/types/chess";
import { Piece, PieceRole, PIECE_ICONS, TeamType } from "@/Constants";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { useGuide } from "@/hooks/useGuide";
import GuidePopup from "@/components/GuidePopup";

const STARTING_ROLE_COUNTS: Record<PieceRole, number> = {
  [PieceRole.Bishop]: 2,
  [PieceRole.King]: 1,
  [PieceRole.Knight]: 2,
  [PieceRole.Pawn]: 8,
  [PieceRole.Queen]: 1,
  [PieceRole.Rook]: 2,
};

const ROLE_ICON_KEY: Record<PieceRole, string> = {
  [PieceRole.Bishop]: "bishop",
  [PieceRole.King]: "king",
  [PieceRole.Knight]: "knight",
  [PieceRole.Pawn]: "pawn",
  [PieceRole.Queen]: "queen",
  [PieceRole.Rook]: "rook",
};

const HORIZON_AXIS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareToCoord(square: string) {
  return {
    x: HORIZON_AXIS.indexOf(square[0]),
    y: Number(square[1]) - 1,
  };
}

function formatOnlineLastMove(lastMove: string, beforePieces: Piece[]) {
  const normalized = lastMove.toLowerCase();
  if (normalized.length < 4) return normalized;

  const from = normalized.slice(0, 2);
  const to = normalized.slice(2, 4);
  const fromCoord = squareToCoord(from);
  const toCoord = squareToCoord(to);
  const movedPiece = beforePieces.find((piece) => piece.x === fromCoord.x && piece.y === fromCoord.y);

  if (!movedPiece) return `${from}${to}`;

  const teamKey = movedPiece.team === TeamType.OUR ? "white" : "black";
  const icon = PIECE_ICONS[`${ROLE_ICON_KEY[movedPiece.role]}-${teamKey}`];
  const isKingSideCastle = movedPiece.role === PieceRole.King && (from === "e1" && to === "g1" || from === "e8" && to === "g8");
  const isQueenSideCastle = movedPiece.role === PieceRole.King && (from === "e1" && to === "c1" || from === "e8" && to === "c8");

  if (isKingSideCastle) return `${icon}: O-O`;
  if (isQueenSideCastle) return `${icon}: O-O-O`;

  const targetPiece = beforePieces.find((piece) => piece.x === toCoord.x && piece.y === toCoord.y);
  const isEnPassantCapture =
    movedPiece.role === PieceRole.Pawn &&
    fromCoord.x !== toCoord.x &&
    !targetPiece;
  const isCapture = Boolean(targetPiece && targetPiece.team !== movedPiece.team) || isEnPassantCapture;

  return `${icon}: ${from}${isCapture ? "x" : ""}${to}`;
}

type ClockSnapshot = {
  whiteTimeMs: number;
  blackTimeMs: number;
  currentTurn: "white" | "black";
  gameResult: string | null;
  updatedAt: number;
};

function getClockStorageKey(gameId: string) {
  return `chess-game-clock-${gameId}`;
}

function getLiveSnapshotClock(snapshot: ClockSnapshot) {
  let { whiteTimeMs, blackTimeMs } = snapshot;

  if (!snapshot.gameResult) {
    const elapsedMs = Math.max(0, Date.now() - snapshot.updatedAt);
    if (snapshot.currentTurn === "white") {
      whiteTimeMs = Math.max(0, whiteTimeMs - elapsedMs);
    } else {
      blackTimeMs = Math.max(0, blackTimeMs - elapsedMs);
    }
  }

  return { whiteTimeMs, blackTimeMs };
}

function readClockSnapshot(gameId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getClockStorageKey(gameId));
    if (!raw) return null;
    return JSON.parse(raw) as ClockSnapshot;
  } catch {
    return null;
  }
}

function getInitialClock(gameId?: string) {
  if (!gameId) return { whiteTimeMs: 0, blackTimeMs: 0 };

  const snapshot = readClockSnapshot(gameId);
  return snapshot ? getLiveSnapshotClock(snapshot) : { whiteTimeMs: 0, blackTimeMs: 0 };
}

export default function GamePage() {
  const auth = useRequireAuth();
  const params = useParams<{ gameId: string }>();
  const gameId = params?.gameId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { open } = useGuide();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fen, setFen] = useState("");
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white");
  const [whiteUsername, setWhiteUsername] = useState("");
  const [blackUsername, setBlackUsername] = useState("");
  const [whiteTimeMs, setWhiteTimeMs] = useState(() => getInitialClock(gameId ?? undefined).whiteTimeMs);
  const [blackTimeMs, setBlackTimeMs] = useState(() => getInitialClock(gameId ?? undefined).blackTimeMs);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [hasLoadedGameState, setHasLoadedGameState] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [ratingDeltas, setRatingDeltas] = useState<{ white: number; black: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const piecesRef = useRef<Piece[]>([]);
  const currentTurnRef = useRef<"white" | "black">("white");

  const { connected, subscribe, send } = useWebSocket(accessToken);

  const applyState = useCallback((state: ChessGameState) => {
    const nextPieces = state.fen ? fenToPieces(state.fen) : null;
    const nextTurn = state.currentTurn ?? currentTurnRef.current;
    const localSnapshot = gameId ? readClockSnapshot(gameId) : null;
    const localLiveClock = localSnapshot?.currentTurn === nextTurn
      ? getLiveSnapshotClock(localSnapshot)
      : null;

    if (state.fen) {
      setFen(state.fen);
      setPieces(nextPieces ?? []);
    }
    if (state.currentTurn) setCurrentTurn(state.currentTurn);
    if (state.moveHistory) {
      setMoveHistory(state.moveHistory);
    } else if (state.lastMove) {
      const moveNote = formatOnlineLastMove(state.lastMove, piecesRef.current);
      setMoveHistory((history) => history.includes(moveNote) ? history : [...history, moveNote]);
    }
    if (state.whiteTimeMs !== undefined) {
      setWhiteTimeMs(localLiveClock ? Math.min(state.whiteTimeMs, localLiveClock.whiteTimeMs) : state.whiteTimeMs);
    }
    if (state.blackTimeMs !== undefined) {
      setBlackTimeMs(localLiveClock ? Math.min(state.blackTimeMs, localLiveClock.blackTimeMs) : state.blackTimeMs);
    }
    if (state.whiteUsername) setWhiteUsername(state.whiteUsername);
    if (state.blackUsername) setBlackUsername(state.blackUsername);
    if (state.result) {
      setGameResult(state.result);
      setEndReason(state.endReason ?? null);
      if (state.whiteRatingDelta != null && state.blackRatingDelta != null) {
        setRatingDeltas({ white: state.whiteRatingDelta, black: state.blackRatingDelta });
      }
      // Refresh user profile to get updated eloRating
      api.get("/api/users/me").then((res) => setUser(res.data)).catch(() => {});
    }

    if (nextPieces) piecesRef.current = nextPieces;
    setHasLoadedGameState(true);
  }, [gameId]);

  useEffect(() => {
    currentTurnRef.current = currentTurn;
  }, [currentTurn]);

  // Load initial state
  useEffect(() => {
    if (!gameId) return;
    api.get<ChessGameState>(`/api/games/${gameId}`).then((res) => {
      applyState(res.data);
    });
  }, [applyState, gameId]);

  useEffect(() => {
    if (!auth || !accessToken || user) return;
    api.get("/api/users/me").then((res) => setUser(res.data));
  }, [accessToken, auth, setUser, user]);

  // WS subscriptions
  useEffect(() => {
    if (!connected || !gameId) return;

    const gameSub = subscribe(`/topic/game/${gameId}`, applyState);
    const chatSub = subscribe(`/topic/chat/${gameId}`, (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    const errSub = subscribe("/user/queue/errors", (body: { error: string }) => {
      setError(body.error);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      gameSub?.unsubscribe();
      chatSub?.unsubscribe();
      errSub?.unsubscribe();
    };
  }, [applyState, connected, gameId, subscribe]);

  useEffect(() => {
    if (gameResult) return;
    const id = setInterval(() => {
      if (currentTurn === "white") setWhiteTimeMs((t) => Math.max(0, t - 100));
      else setBlackTimeMs((t) => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(id);
  }, [currentTurn, gameResult]);

  useEffect(() => {
    if (!gameId || !hasLoadedGameState) return;

    const snapshot: ClockSnapshot = {
      whiteTimeMs,
      blackTimeMs,
      currentTurn,
      gameResult,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getClockStorageKey(gameId), JSON.stringify(snapshot));
  }, [blackTimeMs, currentTurn, gameId, gameResult, hasLoadedGameState, whiteTimeMs]);

  // Auto-redirect to lobby 5s after game ends
  useEffect(() => {
    if (!gameResult) return;
    
    setRedirectCountdown(5);
    
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          router.push("/lobby");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameResult, router]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    if (!gameId || !pieces) return;
    
    // Optimistic update: update pieces immediately before server confirms
    const fromCoord = squareToCoord(from);
    const toCoord = squareToCoord(to);
    const movedPiece = pieces.find(p => p.x === fromCoord.x && p.y === fromCoord.y);
    
    if (movedPiece) {
      // Move piece and remove any captured piece at destination
      const updatedPieces = pieces
        .filter(p => !(p.x === toCoord.x && p.y === toCoord.y))
        .map(p => 
          p.id === movedPiece.id 
            ? { ...p, x: toCoord.x, y: toCoord.y }
            : p
        );
      
      setPieces(updatedPieces);
    }
    
    send(`/app/game/${gameId}/move`, {
      gameId: Number(gameId),
      fromSquare: from,
      toSquare: to,
      promotion: promotion ?? null,
      timeSpentMs: 0,
    });
  }, [gameId, send, pieces]);

  const onlineMoveHistory = useMemo(
    () => (fen ? fenToMoveHistory(fen) : []),
    [fen],
  );

  const { capturedByWhite, capturedByBlack } = useMemo(() => {
    const whiteCounts = new Map<PieceRole, number>();
    const blackCounts = new Map<PieceRole, number>();

    pieces.forEach((piece) => {
      const counts = piece.team === TeamType.OUR ? whiteCounts : blackCounts;
      counts.set(piece.role, (counts.get(piece.role) ?? 0) + 1);
    });

    const getCaptured = (team: "white" | "black", counts: Map<PieceRole, number>) => {
      const icons: string[] = [];
      Object.entries(STARTING_ROLE_COUNTS).forEach(([roleKey, expected]) => {
        const role = Number(roleKey) as PieceRole;
        const missing = Math.max(0, expected - (counts.get(role) ?? 0));
        for (let i = 0; i < missing; i++) {
          icons.push(PIECE_ICONS[`${ROLE_ICON_KEY[role]}-${team}`]);
        }
      });
      return icons;
    };

    return {
      capturedByWhite: getCaptured("black", blackCounts),
      capturedByBlack: getCaptured("white", whiteCounts),
    };
  }, [pieces]);

  const username = user?.username;
  const myColor: "white" | "black" | null =
    !username || !whiteUsername || !blackUsername
      ? null
      : username === whiteUsername
        ? "white"
        : username === blackUsername
          ? "black"
          : null;

  const colorError = username && whiteUsername && blackUsername && !myColor
    ? "Tài khoản hiện tại không thuộc trận đấu này"
    : "";

  const handleBack = () => {
    if (gameResult) {
      router.push("/lobby");
      return;
    }
    setShowResignConfirm(true);
  };

  const confirmResign = () => {
    if (!gameId) return;
    setShowResignConfirm(false);
    if (moveHistory.length < 10) {
      setError(`Chỉ có thể đầu hàng sau 5 bước đi của mỗi bên`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    send(`/app/game/${gameId}/resign`, {});
  };

  if (!auth || !gameId) return null;

  if (!myColor) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#34364C] flex items-center justify-center p-4">
          <div className="rounded-xl bg-[#2A2D45] px-5 py-4 text-sm font-semibold text-white shadow-lg">
          {colorError || error || "Đang tải trận đấu..."}
        </div>
      </div>
    );
  }

  const isMyTurn = currentTurn === myColor;
  const opponentName = myColor === "white" ? blackUsername : whiteUsername;
  const myName = user?.username ?? "";
  const myTime = myColor === "white" ? whiteTimeMs : blackTimeMs;
  const oppTime = myColor === "white" ? blackTimeMs : whiteTimeMs;
  const myTimeStr = formatTime(myTime);
  const oppTimeStr = formatTime(oppTime);

  const resultText = () => {
    if (!gameResult) return null;
    if (gameResult === "draw") return "Hòa!";
    const winColor = gameResult === "white_win" ? "white" : "black";
    return winColor === myColor ? "Bạn thắng! 🎉" : "Bạn thua!";
  };

  return (
    <div className="relative min-h-screen bg-[#F4F7FA] dark:bg-[#34364C] flex flex-col xl:flex-row items-center justify-center gap-5 p-4">
      <div className="absolute top-4 left-2 md:left-4">
        <button
          onClick={handleBack}
          className="group flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-[#2A2D45]/90 backdrop-blur-sm text-[#4A4A4A] dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-95 transition-all"
        >
          <ChevronLeft size={18} />
          <span className="font-bold text-sm">Quay lại</span>
        </button>
      </div>

      <div className="absolute top-4 right-2 md:right-4">
        <button
          onClick={() => open(true)}
          className="p-2.5 bg-[#B1A7FC] text-white rounded-full shadow-lg shadow-[#B1A7FC]/30 active:scale-90 transition-all cursor-pointer"
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div className="mt-14 md:mt-1 flex w-full max-w-fit flex-col gap-3">
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 shadow-lg ${!isMyTurn && !gameResult ? "bg-[#2A2D45] ring-2 ring-[#B1A7FC]" : "bg-[#2A2D45]"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
              {opponentName?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{opponentName}</p>
              <p className="text-gray-400 text-xs">{myColor === "white" ? "Đen" : "Trắng"}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono px-4 py-1 rounded-lg ${!isMyTurn && !gameResult ? "bg-white text-[#2A2D45]" : "bg-[#1E2035] text-gray-400"}`}>
            {oppTimeStr}
          </div>
        </div>

        <div className="lg:mt-0 flex flex-col items-center gap-4 w-full max-w-fit">
          <div className="relative">
            <Chessboard
              onlineMode
              myColor={myColor}
              externalPieces={pieces}
              externalMoveHistory={onlineMoveHistory}
              onlineSoundHistory={moveHistory}
              onlineTurn={currentTurn}
              onMove={handleMove}
              gameOver={!!gameResult}
            />
            {error && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-4 py-3 shadow-lg ${isMyTurn && !gameResult ? "bg-[#2A2D45] ring-2 ring-[#B1A7FC]" : "bg-[#2A2D45]"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#B1A7FC] flex items-center justify-center text-white font-bold">
              {myName?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{myName}</p>
              <p className="text-[#B1A7FC] text-xs">{myColor === "white" ? "Trắng" : "Đen"} · {isMyTurn ? "Lượt của bạn" : "Đang chờ..."}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono px-4 py-1 rounded-lg ${isMyTurn && !gameResult ? "bg-white text-[#2A2D45]" : "bg-[#1E2035] text-gray-400"}`}>
            {myTimeStr}
          </div>
        </div>
      </div>

      <aside className="flex h-[95vw] w-[95vw] flex-col gap-3 md:h-190 md:w-150">
        <div className="flex-1 min-h-0">
          <MoveHistory
            title="Online Match"
            moveHistory={moveHistory}
            ourEatenHistory={capturedByWhite}
            opnEatenHistory={capturedByBlack}
            leftLabel={whiteUsername || "Trắng"}
            rightLabel={blackUsername || "Đen"}
          />
        </div>
        <GameChat
          messages={chatMessages}
          myUsername={user?.username ?? ""}
          onSend={(msg) => send(`/app/game/${gameId}/chat`, { message: msg })}
          canSend={!!myColor && !gameResult}
        />
        {!gameResult && (() => {
          const movesLeft = Math.max(0, 10 - moveHistory.length);
          const canResign = movesLeft === 0;
          return (
            <button
              onClick={handleBack}
              disabled={!canResign}
              className={`rounded-xl border py-3 text-center text-sm font-bold shadow-sm transition-colors ${
                canResign
                  ? "border-red-300/50 bg-white/80 text-red-500 hover:bg-red-50 cursor-pointer dark:border-red-400/30 dark:bg-[#2A2D45] dark:hover:bg-[#3A2D45]"
                  : "border-gray-500/30 bg-white/40 text-gray-400 cursor-not-allowed dark:bg-[#2A2D45]/60"
              }`}
            >
              {canResign ? "Đầu hàng" : `Đầu hàng (còn ${movesLeft} bước)`}
            </button>
          );
        })()}
      </aside>

      {/* Resign confirm popup */}
      <ConfirmPopup
        open={showResignConfirm}
        icon="🏳️"
        title="Đầu hàng"
        message="Bạn có chắc muốn đầu hàng trận này không?"
        confirmLabel="Đầu hàng"
        cancelLabel="Tiếp tục chơi"
        variant="danger"
        onConfirm={confirmResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      {/* Game result overlay */}
      {gameResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#B1A7FC] rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
            <p className="text-[#4A447D] text-sm font-bold uppercase tracking-widest mb-2">Trận đấu kết thúc</p>
            <p className="text-4xl font-bold text-white mb-2">{resultText()}</p>
            {endReason && (
              <p className="text-[#D0CAFF] text-sm capitalize">
                {{ checkmate: "Chiếu hết", resign: "Đầu hàng", timeout: "Hết giờ", stalemate: "Hòa - Pat", agreement: "Hòa thỏa thuận" }[endReason] ?? endReason}
              </p>
            )}
            {ratingDeltas && myColor && (
              <p className={`text-lg font-bold mt-2 mb-4 ${
                (myColor === "white" ? ratingDeltas.white : ratingDeltas.black) >= 0
                  ? "text-green-300"
                  : "text-red-300"
              }`}>
                {(myColor === "white" ? ratingDeltas.white : ratingDeltas.black) >= 0 ? "+" : ""}
                {myColor === "white" ? ratingDeltas.white : ratingDeltas.black} điểm
              </p>
            )}
            {!ratingDeltas && endReason && <div className="mb-4" />}
            <div className="flex gap-3">
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                Về lobby {redirectCountdown !== null ? `(${redirectCountdown}s)` : ""}
              </button>
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white text-[#B1A7FC] font-bold py-3 rounded-xl transition-all cursor-pointer">
                Chơi lại
              </button>
            </div>
          </div>
        </div>
      )}

      <GuidePopup />
    </div>
  );
}

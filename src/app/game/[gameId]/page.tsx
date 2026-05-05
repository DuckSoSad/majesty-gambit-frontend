"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Chessboard from "@/components/Chessboard";
import MoveHistory from "@/components/MoveHistory";
import { fenToMoveHistory, fenToPieces, formatTime } from "@/utils/fenToPieces";
import api from "@/lib/api";
import { ChessGameState } from "@/types/chess";
import { Piece, PieceRole, PIECE_ICONS, TeamType } from "@/Constants";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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
  const [error, setError] = useState("");
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
    const errSub = subscribe("/user/queue/errors", (body: { error: string }) => {
      setError(body.error);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      gameSub?.unsubscribe();
      errSub?.unsubscribe();
    };
  }, [applyState, connected, gameId, subscribe]);

  // Local clock countdown
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

  const handleResign = () => {
    if (!gameId) return;
    if (!confirm("Bạn có chắc muốn đầu hàng?")) return;
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
        <Link href="/">
          <button
            onClick={handleResign}
            className="group flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-[#2A2D45]/90 backdrop-blur-sm text-[#4A4A4A] dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-95 transition-all"
          >
            <ChevronLeft size={18} />
            <span className="font-bold text-sm">Quay lại</span>
          </button>
        </Link>
      </div>

      <div className="flex w-full max-w-fit flex-col gap-3">
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
        <MoveHistory
          title="Online Match"
          moveHistory={moveHistory}
          ourEatenHistory={capturedByWhite}
          opnEatenHistory={capturedByBlack}
          leftLabel={whiteUsername || "Trắng"}
          rightLabel={blackUsername || "Đen"}
        />
        {!gameResult && (
          <button onClick={handleResign} className="rounded-xl border border-red-300/50 bg-white/80 py-3 text-center text-sm font-bold text-red-500 shadow-sm transition-colors hover:bg-red-50 dark:border-red-400/30 dark:bg-[#2A2D45] dark:hover:bg-[#3A2D45]">
            Đầu hàng
          </button>
        )}
      </aside>

      {/* Game result overlay */}
      {gameResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#B1A7FC] rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
            <p className="text-[#4A447D] text-sm font-bold uppercase tracking-widest mb-2">Trận đấu kết thúc</p>
            <p className="text-4xl font-bold text-white mb-2">{resultText()}</p>
            {endReason && (
              <p className="text-[#D0CAFF] text-sm mb-6 capitalize">
                {{ checkmate: "Chiếu hết", resign: "Đầu hàng", timeout: "Hết giờ", stalemate: "Hòa - Pat", agreement: "Hòa thỏa thuận" }[endReason] ?? endReason}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                Về lobby
              </button>
              <button onClick={() => router.push("/lobby")} className="flex-1 bg-white text-[#B1A7FC] font-bold py-3 rounded-xl transition-all cursor-pointer">
                Chơi lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

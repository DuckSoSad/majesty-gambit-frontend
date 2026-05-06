export interface ChessGameState {
  gameId: number;
  fen: string;
  lastMove?: string;
  moveHistory?: string[];
  currentTurn: "white" | "black";
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  result?: string;
  endReason?: string;
  whiteUsername?: string;
  blackUsername?: string;
  whiteRating?: number;
  blackRating?: number;
  whiteTimeMs?: number;
  blackTimeMs?: number;
  whiteRatingDelta?: number;
  blackRatingDelta?: number;
}

export interface RoomMessage {
  type: string;
  username?: string;
  color?: string;
  allReady?: boolean;
  gameId?: number;
  roomCode?: string;
  whiteUsername?: string;
  blackUsername?: string;
}

export interface RoomInfo {
  id: number;
  code: string;
  timeControl: string;
  timeLimitSeconds: number;
  status: string;
  hostUsername: string;
  players: PlayerInfo[];
}

export interface PlayerInfo {
  username: string;
  color?: string;
  isReady: boolean;
  eloRating?: number;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  eloRating: number;
  status: string;
}

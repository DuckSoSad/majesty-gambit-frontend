package com.chess.service;

import com.chess.entity.*;
import com.chess.repository.GameRepository;
import com.chess.repository.MoveRepository;
import com.chess.repository.RoomPlayerRepository;
import com.chess.repository.RoomRepository;
import com.chess.repository.UserRepository;
import com.chess.websocket.ChessGameState;
import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Piece;
import com.github.bhlangonijr.chesslib.Side;
import com.github.bhlangonijr.chesslib.Square;
import com.github.bhlangonijr.chesslib.move.Move;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;
    private final MoveRepository moveRepository;
    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedDelay = 1000)
    public void checkTimeouts() {
        List<Game> activeGames = gameRepository.findAllActive();
        for (Game game : activeGames) {
            try {
                this.processTimeout(game.getId(), false);
            } catch (Exception ignored) {}
        }
    }

    @Transactional
    public void processTimeout(Long gameId, boolean force) {
        Game game = gameRepository.findByIdWithPlayers(gameId).orElse(null);
        if (game == null || game.getResult() != null) return;

        Board board = new Board();
        board.loadFromFen(game.getCurrentFen());
        ClockSnapshot clock = getLiveClockSnapshot(game, board.getSideToMove());
        
        boolean isWhiteTurn = board.getSideToMove() == com.github.bhlangonijr.chesslib.Side.WHITE;
        long remaining = isWhiteTurn ? clock.whiteTimeMs() : clock.blackTimeMs();

        if (force || remaining <= 500) {
            Game.GameResult gr = isWhiteTurn ? Game.GameResult.black_win : Game.GameResult.white_win;
            Game.WinnerColor wc = isWhiteTurn ? Game.WinnerColor.black : Game.WinnerColor.white;
            
            game.setResult(gr);
            game.setWinnerColor(wc);
            game.setEndReason(Game.EndReason.timeout);
            game.setEndedAt(LocalDateTime.now());
            
            maybeUpdateRatings(game);
            gameRepository.save(game);
            
            ChessGameState state = buildChessGameState(game);
            messagingTemplate.convertAndSend("/topic/game/" + game.getId(), state);
        }
    }

    @Transactional
    public Game startGame(Room room) {
        List<RoomPlayer> players = new ArrayList<>(roomPlayerRepository.findByRoomCode(room.getCode()));
        if (players.size() < 2) throw new RuntimeException("Cần đủ 2 người chơi");

        String hostPref = room.getHostColorPreference();
        RoomPlayer whiteRp, blackRp;

        if ("white".equalsIgnoreCase(hostPref) || "black".equalsIgnoreCase(hostPref)) {
            RoomPlayer hostRp = players.stream()
                    .filter(p -> p.getUser().getId().equals(room.getHost().getId()))
                    .findFirst().orElse(players.get(0));
            RoomPlayer guestRp = players.stream()
                    .filter(p -> !p.getUser().getId().equals(room.getHost().getId()))
                    .findFirst().orElse(players.get(1));
            if ("white".equalsIgnoreCase(hostPref)) {
                hostRp.setColor(RoomPlayer.PieceColor.white);
                guestRp.setColor(RoomPlayer.PieceColor.black);
                whiteRp = hostRp; blackRp = guestRp;
            } else {
                hostRp.setColor(RoomPlayer.PieceColor.black);
                guestRp.setColor(RoomPlayer.PieceColor.white);
                whiteRp = guestRp; blackRp = hostRp;
            }
        } else {
            Collections.shuffle(players);
            players.get(0).setColor(RoomPlayer.PieceColor.white);
            players.get(1).setColor(RoomPlayer.PieceColor.black);
            whiteRp = players.get(0);
            blackRp = players.get(1);
        }
        roomPlayerRepository.saveAll(players);

        room.setStatus(Room.RoomStatus.in_progress);
        room.setStartedAt(LocalDateTime.now());
        roomRepository.save(room);

        long timeMs = (long) room.getTimeLimitSeconds() * 1000L;
        Game game = Game.builder()
                .room(room)
                .whitePlayer(whiteRp.getUser())
                .blackPlayer(blackRp.getUser())
                .whiteTimeMs(timeMs)
                .blackTimeMs(timeMs)
                .build();
        return gameRepository.save(game);
    }

    @Transactional
    public ChessGameState processMove(Long gameId, String fromSq, String toSq,
                                      String promotion, String username, int timeSpentMs) {
        Game game = gameRepository.findByIdWithPlayers(gameId)
                .orElseThrow(() -> new RuntimeException("Game không tồn tại"));

        if (game.getResult() != null)
            throw new RuntimeException("Game đã kết thúc");

        Board board = new Board();
        board.loadFromFen(game.getCurrentFen());

        boolean isWhiteTurn = board.getSideToMove() == Side.WHITE;
        User expected = isWhiteTurn ? game.getWhitePlayer() : game.getBlackPlayer();
        if (!expected.getUsername().equals(username))
            throw new RuntimeException("Không phải lượt của bạn");

        // ===== Kiểm tra thời gian =====
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reference = game.getLastMoveAt() != null ? game.getLastMoveAt() : game.getStartedAt();
        long elapsedMs = Duration.between(reference, now).toMillis();

        long remaining;
        if (isWhiteTurn) {
            remaining = game.getWhiteTimeMs() - elapsedMs;
            game.setWhiteTimeMs(Math.max(0L, remaining));
        } else {
            remaining = game.getBlackTimeMs() - elapsedMs;
            game.setBlackTimeMs(Math.max(0L, remaining));
        }
        game.setLastMoveAt(now);

        if (remaining <= 0) {
            Game.GameResult  gr = isWhiteTurn ? Game.GameResult.black_win : Game.GameResult.white_win;
            Game.WinnerColor wc = isWhiteTurn ? Game.WinnerColor.black    : Game.WinnerColor.white;
            game.setResult(gr); game.setWinnerColor(wc);
            game.setEndReason(Game.EndReason.timeout);
            game.setEndedAt(now);
            gameRepository.save(game);
            int[] td = maybeUpdateRatings(game);
            return ChessGameState.builder()
                    .gameId(gameId)
                    .fen(game.getCurrentFen())
                    .moveHistory(getMoveHistory(game))
                    .result(gr.name())
                    .endReason("timeout")
                    .whiteUsername(game.getWhitePlayer().getUsername())
                    .blackUsername(game.getBlackPlayer().getUsername())
                    .whiteRating(game.getWhitePlayer().getEloRating())
                    .blackRating(game.getBlackPlayer().getEloRating())
                    .whiteTimeMs(game.getWhiteTimeMs())
                    .blackTimeMs(game.getBlackTimeMs())
                    .whiteRatingDelta(td != null ? td[0] : null)
                    .blackRatingDelta(td != null ? td[1] : null)
                    .build();
        }

        Square from = Square.valueOf(fromSq.toUpperCase());
        Square to   = Square.valueOf(toSq.toUpperCase());

        Piece promoTo = Piece.NONE;
        if (promotion != null && !promotion.isBlank())
            promoTo = resolvePromotion(promotion, board.getSideToMove());

        Move chessMove = new Move(from, to, promoTo);

        if (!board.legalMoves().contains(chessMove))
            throw new RuntimeException("Nước đi không hợp lệ");

        Piece movedPiece = board.getPiece(from);
        Piece targetPiece = board.getPiece(to);
        board.doMove(chessMove);

        String newFen   = board.getFen();
        boolean inCheck = board.isKingAttacked();
        boolean noMoves = board.legalMoves().isEmpty();
        boolean isMate  = inCheck  && noMoves;
        boolean isStale = !inCheck && noMoves;

        // ===== Lưu nước đi =====
        int moveNum = moveRepository.countByGame(game) + 1;
        com.chess.entity.Move record = com.chess.entity.Move.builder()
                .game(game)
                .moveNumber(moveNum)
                .playerColor(isWhiteTurn ? RoomPlayer.PieceColor.white : RoomPlayer.PieceColor.black)
                .fromSquare(fromSq.toLowerCase())
                .toSquare(toSq.toLowerCase())
                .piece(toPieceChar(movedPiece))
                .promotion(promotion)
                .san(formatMoveNote(movedPiece, fromSq, toSq, promotion, targetPiece != Piece.NONE, inCheck, isMate))
                .fenAfter(newFen)
                .timeSpentMs((int) elapsedMs)
                .build();
        moveRepository.save(record);

        game.setCurrentFen(newFen);
        game.setLastMoveAt(now);

        String result    = null;
        String endReason = null;
        if (isMate) {
            Game.GameResult  gr = isWhiteTurn ? Game.GameResult.white_win : Game.GameResult.black_win;
            Game.WinnerColor wc = isWhiteTurn ? Game.WinnerColor.white    : Game.WinnerColor.black;
            result = gr.name(); endReason = "checkmate";
            game.setResult(gr); game.setWinnerColor(wc);
            game.setEndReason(Game.EndReason.checkmate);
            game.setEndedAt(now);
        } else if (isStale) {
            result = "draw"; endReason = "stalemate";
            game.setResult(Game.GameResult.draw);
            game.setEndReason(Game.EndReason.stalemate);
        }
        
        int[] md = null;
        if (game.getResult() != null) {
            md = maybeUpdateRatings(game);
        }
        gameRepository.save(game);

        return ChessGameState.builder()
                .gameId(gameId)
                .fen(newFen)
                .lastMove(fromSq.toLowerCase() + toSq.toLowerCase())
                .moveHistory(getMoveHistory(game))
                .currentTurn(isWhiteTurn ? "black" : "white")
                .isCheck(inCheck)
                .isCheckmate(isMate)
                .isStalemate(isStale)
                .result(result)
                .endReason(endReason)
                .whiteUsername(game.getWhitePlayer().getUsername())
                .blackUsername(game.getBlackPlayer().getUsername())
                .whiteRating(game.getWhitePlayer().getEloRating())
                .blackRating(game.getBlackPlayer().getEloRating())
                .whiteTimeMs(game.getWhiteTimeMs())
                .blackTimeMs(game.getBlackTimeMs())
                .whiteRatingDelta(md != null ? md[0] : null)
                .blackRatingDelta(md != null ? md[1] : null)
                .build();
    }

    @Transactional
    public ChessGameState resign(Long gameId, String username) {
        Game game = gameRepository.findByIdWithPlayers(gameId)
                .orElseThrow(() -> new RuntimeException("Game không tồn tại"));

        if (game.getResult() != null)
            throw new RuntimeException("Game đã kết thúc");

        int totalMoves = moveRepository.countByGame(game);
        if (totalMoves < 10)
            throw new RuntimeException("Chỉ có thể đầu hàng sau 10 bước đi");

        boolean resigningWhite = game.getWhitePlayer().getUsername().equals(username);
        Game.GameResult  gr = resigningWhite ? Game.GameResult.black_win : Game.GameResult.white_win;
        Game.WinnerColor wc = resigningWhite ? Game.WinnerColor.black    : Game.WinnerColor.white;
        game.setResult(gr); game.setWinnerColor(wc);
        game.setEndReason(Game.EndReason.resign);
        game.setEndedAt(LocalDateTime.now());
        int[] rd = maybeUpdateRatings(game);
        gameRepository.save(game);

        return ChessGameState.builder()
                .gameId(gameId)
                .fen(game.getCurrentFen())
                .moveHistory(getMoveHistory(game))
                .result(gr.name())
                .endReason("resign")
                .whiteUsername(game.getWhitePlayer().getUsername())
                .blackUsername(game.getBlackPlayer().getUsername())
                .whiteRating(game.getWhitePlayer().getEloRating())
                .blackRating(game.getBlackPlayer().getEloRating())
                .whiteTimeMs(game.getWhiteTimeMs())
                .blackTimeMs(game.getBlackTimeMs())
                .whiteRatingDelta(rd != null ? rd[0] : null)
                .blackRatingDelta(rd != null ? rd[1] : null)
                .build();
    }

    @Transactional(readOnly = true)
    public ChessGameState getGameState(Long gameId) {
        Game game = gameRepository.findByIdWithPlayers(gameId)
                .orElseThrow(() -> new RuntimeException("Game không tồn tại"));
        return buildChessGameState(game);
    }

    private ChessGameState buildChessGameState(Game game) {
        Board board = new Board();
        board.loadFromFen(game.getCurrentFen());

        boolean inCheck = board.isKingAttacked();
        boolean noMoves = board.legalMoves().isEmpty();
        ClockSnapshot clock = getLiveClockSnapshot(game, board.getSideToMove());
        return ChessGameState.builder()
                .gameId(game.getId())
                .fen(game.getCurrentFen())
                .moveHistory(getMoveHistory(game))
                .currentTurn(board.getSideToMove() == Side.WHITE ? "white" : "black")
                .isCheck(inCheck)
                .isCheckmate(inCheck  && noMoves)
                .isStalemate(!inCheck && noMoves)
                .result(game.getResult()    != null ? game.getResult().name()    : null)
                .endReason(game.getEndReason() != null ? game.getEndReason().name() : null)
                .whiteUsername(game.getWhitePlayer().getUsername())
                .blackUsername(game.getBlackPlayer().getUsername())
                .whiteRating(game.getWhitePlayer().getEloRating())
                .blackRating(game.getBlackPlayer().getEloRating())
                .whiteTimeMs(clock.whiteTimeMs())
                .blackTimeMs(clock.blackTimeMs())
                .build();
    }

    private Piece resolvePromotion(String promo, Side side) {
        return switch (promo.toUpperCase()) {
            case "Q" -> side == Side.WHITE ? Piece.WHITE_QUEEN  : Piece.BLACK_QUEEN;
            case "R" -> side == Side.WHITE ? Piece.WHITE_ROOK   : Piece.BLACK_ROOK;
            case "B" -> side == Side.WHITE ? Piece.WHITE_BISHOP : Piece.BLACK_BISHOP;
            case "N" -> side == Side.WHITE ? Piece.WHITE_KNIGHT : Piece.BLACK_KNIGHT;
            default  -> side == Side.WHITE ? Piece.WHITE_QUEEN  : Piece.BLACK_QUEEN;
        };
    }

    private String toPieceChar(Piece piece) {
        if (piece == null || piece == Piece.NONE) return "?";
        return switch (piece.getPieceType()) {
            case PAWN   -> "P";
            case KNIGHT -> "N";
            case BISHOP -> "B";
            case ROOK   -> "R";
            case QUEEN  -> "Q";
            case KING   -> "K";
            default     -> "?";
        };
    }

    private List<String> getMoveHistory(Game game) {
        return moveRepository.findByGameOrderByMoveNumberAsc(game)
                .stream()
                .map(this::formatMoveRecord)
                .toList();
    }

    private String formatMoveRecord(com.chess.entity.Move move) {
        if (move.getSan() != null && !move.getSan().isBlank()) {
            return move.getSan();
        }

        String promotion = move.getPromotion() != null && !move.getPromotion().isBlank()
                ? "=" + move.getPromotion().toUpperCase()
                : "";
        return pieceIcon(move.getPiece(), move.getPlayerColor())
                + ": "
                + move.getFromSquare()
                + move.getToSquare()
                + promotion;
    }

    private String formatMoveNote(Piece piece, String fromSq, String toSq, String promotion,
                                  boolean isCapture, boolean inCheck, boolean isMate) {
        String from = fromSq.toLowerCase();
        String to = toSq.toLowerCase();

        if (piece.getPieceType() == com.github.bhlangonijr.chesslib.PieceType.KING) {
            if (from.equals("e1") && to.equals("g1") || from.equals("e8") && to.equals("g8")) {
                return pieceIcon(toPieceChar(piece), piece.getPieceSide()) + ": O-O";
            }
            if (from.equals("e1") && to.equals("c1") || from.equals("e8") && to.equals("c8")) {
                return pieceIcon(toPieceChar(piece), piece.getPieceSide()) + ": O-O-O";
            }
        }

        String promotionText = promotion != null && !promotion.isBlank()
                ? "=" + promotion.toUpperCase()
                : "";
        String suffix = isMate ? "#" : inCheck ? "+" : "";

        return pieceIcon(toPieceChar(piece), piece.getPieceSide())
                + ": "
                + from
                + (isCapture ? "x" : "")
                + to
                + promotionText
                + suffix;
    }

    private String pieceIcon(String piece, RoomPlayer.PieceColor color) {
        return pieceIcon(piece, color == RoomPlayer.PieceColor.white ? Side.WHITE : Side.BLACK);
    }

    private String pieceIcon(String piece, Side side) {
        boolean white = side == Side.WHITE;
        return switch (piece) {
            case "P" -> white ? "♙" : "♟";
            case "N" -> white ? "♘" : "♞";
            case "B" -> white ? "♗" : "♝";
            case "R" -> white ? "♖" : "♜";
            case "Q" -> white ? "♕" : "♛";
            case "K" -> white ? "♔" : "♚";
            default -> "";
        };
    }

    private ClockSnapshot getLiveClockSnapshot(Game game, Side sideToMove) {
        long whiteTimeMs = game.getWhiteTimeMs();
        long blackTimeMs = game.getBlackTimeMs();

        if (game.getResult() != null) {
            return new ClockSnapshot(whiteTimeMs, blackTimeMs);
        }

        LocalDateTime reference = game.getLastMoveAt() != null ? game.getLastMoveAt() : game.getStartedAt();
        if (reference == null) {
            return new ClockSnapshot(whiteTimeMs, blackTimeMs);
        }

        long elapsedMs = Math.max(0L, Duration.between(reference, LocalDateTime.now()).toMillis());
        if (sideToMove == Side.WHITE) {
            whiteTimeMs = Math.max(0L, whiteTimeMs - elapsedMs);
        } else {
            blackTimeMs = Math.max(0L, blackTimeMs - elapsedMs);
        }

        return new ClockSnapshot(whiteTimeMs, blackTimeMs);
    }

    private record ClockSnapshot(long whiteTimeMs, long blackTimeMs) {}

    private int[] maybeUpdateRatings(Game game) {
        if (game.getResult() == null) return null;
        
        boolean isMatchmaking = Boolean.TRUE.equals(game.getRoom().getIsMatchmaking());
                 
        if (!isMatchmaking) return null;
        
        User white = userRepository.findById(game.getWhitePlayer().getId()).orElse(game.getWhitePlayer());
        User black = userRepository.findById(game.getBlackPlayer().getId()).orElse(game.getBlackPlayer());
        
        int rW = white.getEloRating() != null ? white.getEloRating() : 100;
        int rB = black.getEloRating() != null ? black.getEloRating() : 100;
        
        double scoreW, scoreB;
        if (game.getResult() == Game.GameResult.white_win)      { scoreW = 1.0; scoreB = 0.0; }
        else if (game.getResult() == Game.GameResult.black_win) { scoreW = 0.0; scoreB = 1.0; }
        else                                                     { scoreW = 0.5; scoreB = 0.5; }
        
        int dW = eloChange(rW, rB, scoreW);
        int dB = eloChange(rB, rW, scoreB);
        
        white.setEloRating(Math.max(0, rW + dW));
        black.setEloRating(Math.max(0, rB + dB));
        userRepository.save(white);
        userRepository.save(black);
        
        game.setWhiteRatingDelta(dW);
        game.setBlackRatingDelta(dB);
        gameRepository.save(game);
        
        return new int[]{ dW, dB };
    }

    private int eloChange(int myRating, int oppRating, double score) {
        double expected = 1.0 / (1 + Math.pow(10, (oppRating - myRating) / 400.0));
        return (int) Math.round(20 * (score - expected));
    }

    public record ActiveGameInfo(Long gameId, String roomCode) {}

    @Transactional(readOnly = true)
    public Optional<ActiveGameInfo> findActiveGame(User user) {
        return gameRepository.findActiveByPlayer(user)
                .map(g -> new ActiveGameInfo(g.getId(), g.getRoom().getCode()));
    }

    @Transactional(readOnly = true)
    public ChessGameState getGameStateByRoomCode(String code) {
        Game game = gameRepository.findByRoomCodeWithPlayers(code)
                .orElseThrow(() -> new RuntimeException("Game không tồn tại"));
        return buildChessGameState(game);
    }

    @Transactional(readOnly = true)
    public List<GameHistoryItem> getHistory(User user, int page) {
        List<Game> games = gameRepository.findFinishedByPlayer(user, PageRequest.of(page, 20));
        return games.stream().map(g -> toHistoryItem(g, user)).toList();
    }

    private GameHistoryItem toHistoryItem(Game game, User me) {
        boolean isWhite = game.getWhitePlayer().getId().equals(me.getId());
        String opponentUsername = isWhite
                ? game.getBlackPlayer().getUsername()
                : game.getWhitePlayer().getUsername();

        String result;
        if (game.getResult() == Game.GameResult.draw) result = "draw";
        else if ((game.getResult() == Game.GameResult.white_win && isWhite)
              || (game.getResult() == Game.GameResult.black_win && !isWhite)) result = "win";
        else result = "loss";

        boolean isMatchmaking = Boolean.TRUE.equals(game.getRoom().getIsMatchmaking());
        Integer eloChange = isMatchmaking
                ? (isWhite ? game.getWhiteRatingDelta() : game.getBlackRatingDelta())
                : null;

        return new GameHistoryItem(
                game.getId(),
                opponentUsername,
                isWhite ? "white" : "black",
                result,
                eloChange,
                game.getRoom().getTimeControl().name(),
                game.getRoom().getTimeLimitSeconds(),
                game.getEndReason() != null ? game.getEndReason().name() : null,
                isMatchmaking,
                game.getStartedAt() != null ? game.getStartedAt().toString() : null
        );
    }

    public record GameHistoryItem(
            Long gameId,
            String opponentUsername,
            String myColor,
            String result,
            Integer eloChange,
            String timeControl,
            Integer timeLimitSeconds,
            String endReason,
            boolean isMatchmaking,
            String playedAt
    ) {}
}

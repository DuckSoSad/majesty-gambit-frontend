package com.chess.controller;

import com.chess.entity.User;
import com.chess.service.GameService;
import com.chess.service.GameService.GameHistoryItem;
import com.chess.websocket.ChessGameState;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    // GET /api/games/{gameId} — lấy trạng thái game (dùng khi reconnect)
    @GetMapping("/{gameId}")
    public ResponseEntity<ChessGameState> getGame(@PathVariable Long gameId) {
        return ResponseEntity.ok(gameService.getGameState(gameId));
    }

    // GET /api/games/active — game đang diễn ra của user (dùng để reconnect)
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveGame(@AuthenticationPrincipal User user) {
        return gameService.findActiveGame(user)
                .map(info -> ResponseEntity.ok(Map.<String, Object>of(
                        "gameId", info.gameId(), "roomCode", info.roomCode())))
                .orElseGet(() -> ResponseEntity.ok(Map.of()));
    }

    // GET /api/games/room/{code} — lấy game state bằng room code (dùng cho URL /game/ABCDEF)
    @GetMapping("/room/{code}")
    public ResponseEntity<ChessGameState> getGameByRoomCode(@PathVariable String code) {
        return ResponseEntity.ok(gameService.getGameStateByRoomCode(code));
    }

    // GET /api/games/history?page=0 — lịch sử trận đấu của người dùng hiện tại
    @GetMapping("/history")
    public ResponseEntity<List<GameHistoryItem>> getHistory(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(gameService.getHistory(user, page));
    }
}

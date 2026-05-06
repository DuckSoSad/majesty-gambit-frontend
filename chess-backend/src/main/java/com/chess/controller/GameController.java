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

    // GET /api/games/history?page=0 — lịch sử trận đấu của người dùng hiện tại
    @GetMapping("/history")
    public ResponseEntity<List<GameHistoryItem>> getHistory(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(gameService.getHistory(user, page));
    }
}

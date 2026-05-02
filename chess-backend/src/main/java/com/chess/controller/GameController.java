package com.chess.controller;

import com.chess.service.GameService;
import com.chess.websocket.ChessGameState;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}

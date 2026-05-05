package com.chess.controller;

import com.chess.entity.User;
import com.chess.service.MatchmakingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    // POST /api/matchmaking/queue — join queue
    @PostMapping("/queue")
    public ResponseEntity<Map<String, String>> joinQueue(@AuthenticationPrincipal User user,
                                                         @Valid @RequestBody JoinQueueRequest req) {
        matchmakingService.enqueue(user, req.getTimeControl(), req.getTimeLimitSeconds());
        return ResponseEntity.ok(Map.of("message", "Đang tìm trận"));
    }

    // DELETE /api/matchmaking/queue — leave queue
    @DeleteMapping("/queue")
    public ResponseEntity<Void> leaveQueue(@AuthenticationPrincipal User user) {
        matchmakingService.dequeue(user);
        return ResponseEntity.noContent().build();
    }

    @Data
    static class JoinQueueRequest {
        @NotBlank
        private String timeControl;        // "blitz", "bullet", "rapid"
        private int timeLimitSeconds = 300;
    }
}

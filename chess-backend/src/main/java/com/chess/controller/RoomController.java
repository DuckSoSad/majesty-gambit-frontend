package com.chess.controller;

import com.chess.entity.Room;
import com.chess.entity.RoomPlayer;
import com.chess.entity.User;
import com.chess.service.RoomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    // POST /api/rooms — tạo phòng
    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@AuthenticationPrincipal User user,
                                                    @Valid @RequestBody CreateRoomRequest req) {
        Room.TimeControl tc = Room.TimeControl.valueOf(req.getTimeControl().toLowerCase());
        Room room = roomService.createRoom(user, tc, req.getTimeLimitSeconds());
        return ResponseEntity.ok(RoomResponse.from(room, List.of()));
    }

    // POST /api/rooms/{code}/join — vào phòng
    @PostMapping("/{code}/join")
    public ResponseEntity<RoomResponse> joinRoom(@AuthenticationPrincipal User user,
                                                  @PathVariable String code) {
        Room room = roomService.joinRoom(code, user);
        List<RoomPlayer> players = roomService.getPlayers(code);
        return ResponseEntity.ok(RoomResponse.from(room, players));
    }

    // GET /api/rooms/{code} — lấy thông tin phòng
    @GetMapping("/{code}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String code) {
        Room room = roomService.getRoomWithPlayers(code);
        List<RoomPlayer> players = roomService.getPlayers(code);
        return ResponseEntity.ok(RoomResponse.from(room, players));
    }

    // ===== DTOs =====

    @Data
    static class CreateRoomRequest {
        @NotBlank
        private String timeControl;        // "blitz", "rapid", "bullet", "classical"
        private int timeLimitSeconds = 300;
    }

    record PlayerInfo(String username, String color, Boolean isReady) {
        static PlayerInfo from(RoomPlayer p) {
            return new PlayerInfo(
                    p.getUser().getUsername(),
                    p.getColor() != null ? p.getColor().name() : null,
                    p.getIsReady()
            );
        }
    }

    record RoomResponse(
            Long id,
            String code,
            String timeControl,
            Integer timeLimitSeconds,
            String status,
            String hostUsername,
            List<PlayerInfo> players
    ) {
        static RoomResponse from(Room room, List<RoomPlayer> players) {
            return new RoomResponse(
                    room.getId(),
                    room.getCode(),
                    room.getTimeControl().name(),
                    room.getTimeLimitSeconds(),
                    room.getStatus().name(),
                    room.getHost().getUsername(),
                    players.stream().map(PlayerInfo::from).toList()
            );
        }
    }
}

package com.chess.websocket;

import com.chess.entity.Game;
import com.chess.entity.Room;
import com.chess.entity.User;
import com.chess.service.GameService;
import com.chess.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChessWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomService roomService;
    private final GameService gameService;

    /**
     * Client gửi nước đi: SEND /app/game/{gameId}/move
     * Server broadcast: /topic/game/{gameId}
     */
    @MessageMapping("/game/{gameId}/move")
    public void handleMove(@DestinationVariable Long gameId,
                           @Payload ChessMoveMessage move,
                           Principal principal) {
        try {
            ChessGameState state = gameService.processMove(
                    gameId,
                    move.getFromSquare(),
                    move.getToSquare(),
                    move.getPromotion(),
                    principal.getName(),
                    move.getTimeSpentMs()
            );
            messagingTemplate.convertAndSend("/topic/game/" + gameId, state);
        } catch (Exception e) {
            log.warn("Move rejected for game {}: {}", gameId, e.getMessage());
            // Chỉ báo lỗi cho người gửi
            messagingTemplate.convertAndSendToUser(
                    principal.getName(), "/queue/errors",
                    ErrorMessage.of(e.getMessage())
            );
        }
    }

    /**
     * Client resign: SEND /app/game/{gameId}/resign
     */
    @MessageMapping("/game/{gameId}/resign")
    public void handleResign(@DestinationVariable Long gameId, Principal principal) {
        try {
            ChessGameState state = gameService.resign(gameId, principal.getName());
            messagingTemplate.convertAndSend("/topic/game/" + gameId, state);
        } catch (Exception e) {
            log.warn("Resign failed for game {}: {}", gameId, e.getMessage());
            messagingTemplate.convertAndSendToUser(
                    principal.getName(), "/queue/errors",
                    ErrorMessage.of(e.getMessage())
            );
        }
    }

    /**
     * Client join phòng: SEND /app/room/{roomCode}/join
     * Broadcast: /topic/room/{roomCode}
     */
    @MessageMapping("/room/{roomCode}/join")
    public void handleJoinRoom(@DestinationVariable String roomCode, Principal principal) {
        log.debug("{} joined room {}", principal.getName(), roomCode);
        RoomMessage msg = RoomMessage.builder()
                .type("player_joined")
                .username(principal.getName())
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + roomCode, msg);
    }

    /**
     * Client bấm Ready: SEND /app/room/{roomCode}/ready
     * Nếu cả 2 ready → start game và broadcast game_start
     */
    @MessageMapping("/room/{roomCode}/ready")
    public void handleReady(@DestinationVariable String roomCode, Principal principal) {
        try {
            User user = (User) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken)
                    principal).getPrincipal();

            boolean bothReady = roomService.setReady(roomCode, user);

            RoomMessage readyMsg = RoomMessage.builder()
                    .type("player_ready")
                    .username(principal.getName())
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + roomCode, readyMsg);

            if (bothReady) {
                Room room = roomService.getRoomWithPlayers(roomCode);
                Game game = gameService.startGame(room);

                RoomMessage startMsg = RoomMessage.builder()
                        .type("game_start")
                        .gameId(game.getId())
                        .whiteUsername(game.getWhitePlayer().getUsername())
                        .blackUsername(game.getBlackPlayer().getUsername())
                        .build();
                messagingTemplate.convertAndSend("/topic/room/" + roomCode, startMsg);
            }
        } catch (Exception e) {
            log.warn("Ready failed in room {}: {}", roomCode, e.getMessage());
            messagingTemplate.convertAndSendToUser(
                    principal.getName(), "/queue/errors",
                    ErrorMessage.of(e.getMessage())
            );
        }
    }

    /**
     * Client gửi chat: SEND /app/game/{gameId}/chat
     * Broadcast: /topic/chat/{gameId}
     */
    @MessageMapping("/game/{gameId}/chat")
    public void handleChat(@DestinationVariable Long gameId,
                           @Payload Map<String, String> payload,
                           Principal principal) {
        try {
            String msg = payload.get("message");
            if (msg == null || msg.isBlank()) return;
            msg = msg.trim();
            if (msg.length() > 200) msg = msg.substring(0, 200);

            ChatMessageDto chat = ChatMessageDto.builder()
                    .type("chat")
                    .username(principal.getName())
                    .message(msg)
                    .timestamp(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")))
                    .build();
            messagingTemplate.convertAndSend("/topic/chat/" + gameId, chat);
        } catch (Exception e) {
            log.warn("Chat failed for game {}: {}", gameId, e.getMessage());
        }
    }

    record ErrorMessage(String error) {
        static ErrorMessage of(String msg) { return new ErrorMessage(msg); }
    }
}

package com.chess.websocket;

import com.chess.repository.GameRepository;
import com.chess.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        String username = principal.getName();
        userRepository.findByUsername(username).ifPresent(user ->
            gameRepository.findActiveByPlayer(user).ifPresent(game -> {
                log.debug("Player {} disconnected from game {}", username, game.getId());
                messagingTemplate.convertAndSend("/topic/game/" + game.getId(),
                        Map.of("type", "player_away", "username", username));
            })
        );
    }
}

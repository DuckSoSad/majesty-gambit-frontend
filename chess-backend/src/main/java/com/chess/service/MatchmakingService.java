package com.chess.service;

import com.chess.entity.Game;
import com.chess.entity.Room;
import com.chess.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private final RoomService roomService;
    private final GameService gameService;
    private final SimpMessagingTemplate messagingTemplate;

    // timeKey ("blitz:300") → queue of waiting players
    private final Map<String, ConcurrentLinkedDeque<QueueEntry>> queues = new ConcurrentHashMap<>();

    public synchronized void enqueue(User user, String timeControl, int timeLimitSeconds) {
        String timeKey = timeControl.toLowerCase() + ":" + timeLimitSeconds;
        log.info("[MATCHMAKING] enqueue called: user={} (id={}), timeKey={}",
                user.getUsername(), user.getId(), timeKey);

        ConcurrentLinkedDeque<QueueEntry> queue =
                queues.computeIfAbsent(timeKey, k -> new ConcurrentLinkedDeque<>());

        log.info("[MATCHMAKING] Queue size BEFORE removeFromAll: {}", queue.size());
        removeFromAllQueues(user.getId());
        log.info("[MATCHMAKING] Queue size AFTER removeFromAll: {}", queue.size());

        QueueEntry opponent = null;
        for (QueueEntry entry : queue) {
            log.info("[MATCHMAKING] Checking entry: {} (id={})",
                    entry.user().getUsername(), entry.user().getId());
            if (!entry.user().getId().equals(user.getId())) {
                opponent = entry;
                break;
            }
        }

        if (opponent != null) {
            queue.remove(opponent);
            log.info("[MATCHMAKING] MATCH FOUND: {} vs {}", user.getUsername(), opponent.user().getUsername());
            startMatchedGame(user, opponent.user(), timeControl, timeLimitSeconds);
        } else {
            queue.add(new QueueEntry(user, timeControl, timeLimitSeconds));
            log.info("[MATCHMAKING] No opponent found. Queued {} for {}. Queue size now: {}",
                    user.getUsername(), timeKey, queue.size());
        }
    }

    public synchronized void dequeue(User user) {
        removeFromAllQueues(user.getId());
        log.info("{} left matchmaking queue", user.getUsername());
    }

    private void removeFromAllQueues(Long userId) {
        queues.values().forEach(q -> q.removeIf(e -> e.user().getId().equals(userId)));
    }

    private void startMatchedGame(User p1, User p2, String timeControl, int timeLimitSeconds) {
        try {
            log.info("[MATCHMAKING] startMatchedGame: {} vs {}, tc={}, time={}",
                    p1.getUsername(), p2.getUsername(), timeControl, timeLimitSeconds);
            Room.TimeControl tc = Room.TimeControl.valueOf(timeControl.toLowerCase());
            Room room = roomService.createMatchmakingRoom(p1, p2, tc, timeLimitSeconds);
            Game game = gameService.startGame(room);

            Map<String, Object> msg = Map.of("type", "match_found", "gameId", game.getId());
            log.info("[MATCHMAKING] Sending match_found to {} and {}, gameId={}",
                    p1.getUsername(), p2.getUsername(), game.getId());
            messagingTemplate.convertAndSendToUser(p1.getUsername(), "/queue/matchmaking", msg);
            messagingTemplate.convertAndSendToUser(p2.getUsername(), "/queue/matchmaking", msg);
            log.info("[MATCHMAKING] Match started successfully: {} vs {} → game {}",
                    p1.getUsername(), p2.getUsername(), game.getId());
        } catch (Exception e) {
            log.error("[MATCHMAKING] FAILED to start matched game for {} vs {}: {}",
                    p1.getUsername(), p2.getUsername(), e.getMessage(), e);
        }
    }

    public record QueueEntry(User user, String timeControl, int timeLimitSeconds) {}
}

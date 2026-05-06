package com.chess.service;

import com.chess.entity.Game;
import com.chess.entity.Room;
import com.chess.entity.User;
import com.chess.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // timeKey ("blitz:300") → queue of waiting players
    private final Map<String, ConcurrentLinkedDeque<QueueEntry>> queues = new ConcurrentHashMap<>();

    public synchronized void enqueue(User user, String timeControl, int timeLimitSeconds) {
        String timeKey = timeControl.toLowerCase() + ":" + timeLimitSeconds;
        int myElo = user.getEloRating() != null ? user.getEloRating() : 100;

        ConcurrentLinkedDeque<QueueEntry> queue =
                queues.computeIfAbsent(timeKey, k -> new ConcurrentLinkedDeque<>());

        removeFromAllQueues(user.getId());

        QueueEntry best = null;
        int bestDiff = Integer.MAX_VALUE;
        for (QueueEntry entry : queue) {
            int diff = Math.abs(entry.eloRating() - myElo);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = entry;
            }
        }

        if (best != null) {
            queue.remove(best);

            startMatchedGame(user.getId(), user.getUsername(), best.userId(), best.username(), timeControl, timeLimitSeconds);
        } else {
            queue.add(new QueueEntry(user.getId(), user.getUsername(), myElo, timeControl, timeLimitSeconds));

        }
    }

    public synchronized void dequeue(User user) {
        removeFromAllQueues(user.getId());
    }

    private void removeFromAllQueues(Long userId) {
        queues.values().forEach(q -> q.removeIf(e -> e.userId().equals(userId)));
    }

    private void startMatchedGame(Long userId1, String username1,
                                   Long userId2, String username2,
                                   String timeControl, int timeLimitSeconds) {
        try {
            User p1 = userRepository.findById(userId1)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId1));
            User p2 = userRepository.findById(userId2)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId2));

            Room.TimeControl tc = Room.TimeControl.valueOf(timeControl.toLowerCase());
            Room room = roomService.createMatchmakingRoom(p1, p2, tc, timeLimitSeconds);
            Game game = gameService.startGame(room);

            Map<String, Object> msg = Map.of(
                    "type", "match_found",
                    "gameId", game.getId(),
                    "roomCode", room.getCode()
            );
            messagingTemplate.convertAndSendToUser(username1, "/queue/matchmaking", msg);
            messagingTemplate.convertAndSendToUser(username2, "/queue/matchmaking", msg);
        } catch (Exception e) {
            log.error("[MATCHMAKING] Failed to start game for {} vs {}: {}", username1, username2, e.getMessage(), e);
        }
    }

    public record QueueEntry(Long userId, String username, int eloRating,
                              String timeControl, int timeLimitSeconds) {}
}

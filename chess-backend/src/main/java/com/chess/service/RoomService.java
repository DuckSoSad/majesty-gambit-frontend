package com.chess.service;

import com.chess.entity.Room;
import com.chess.entity.RoomPlayer;
import com.chess.entity.User;
import com.chess.repository.RoomPlayerRepository;
import com.chess.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;

    public Room createRoom(User host, Room.TimeControl timeControl, int timeLimitSeconds, String colorPreference) {
        String pref = "white".equalsIgnoreCase(colorPreference) || "black".equalsIgnoreCase(colorPreference)
                ? colorPreference.toLowerCase() : null;
        Room room = Room.builder()
                .code(generateUniqueCode())
                .host(host)
                .timeControl(timeControl)
                .timeLimitSeconds(timeLimitSeconds)
                .hostColorPreference(pref)
                .build();
        room = roomRepository.save(room);

        RoomPlayer hostPlayer = RoomPlayer.builder()
                .room(room)
                .user(host)
                .build();
        roomPlayerRepository.save(hostPlayer);
        return room;
    }

    public Room createMatchmakingRoom(User player1, User player2, Room.TimeControl timeControl, int timeLimitSeconds) {
        Room room = Room.builder()
                .code(generateUniqueCode())
                .host(player1)
                .timeControl(timeControl)
                .timeLimitSeconds(timeLimitSeconds)
                .build();
        room = roomRepository.save(room);

        roomPlayerRepository.saveAll(List.of(
                RoomPlayer.builder().room(room).user(player1).isReady(true).build(),
                RoomPlayer.builder().room(room).user(player2).isReady(true).build()
        ));
        return room;
    }

    public Room joinRoom(String code, User user) {
        Room room = roomRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));

        if (room.getStatus() != Room.RoomStatus.waiting)
            throw new RuntimeException("Phòng đã bắt đầu hoặc đã kết thúc");

        List<RoomPlayer> players = roomPlayerRepository.findByRoomCode(code);
        if (players.size() >= 2)
            throw new RuntimeException("Phòng đã đủ 2 người");

        boolean alreadyIn = players.stream()
                .anyMatch(p -> p.getUser().getId().equals(user.getId()));
        if (alreadyIn)
            throw new RuntimeException("Bạn đã ở trong phòng này");

        RoomPlayer player = RoomPlayer.builder()
                .room(room)
                .user(user)
                .build();
        roomPlayerRepository.save(player);
        return room;
    }

    // Returns true nếu cả 2 người đã ready → caller sẽ start game
    public boolean setReady(String code, User user) {
        RoomPlayer player = roomPlayerRepository
                .findByRoomCodeAndUsername(code, user.getUsername())
                .orElseThrow(() -> new RuntimeException("Bạn chưa vào phòng này"));

        player.setIsReady(true);
        roomPlayerRepository.save(player);

        List<RoomPlayer> players = roomPlayerRepository.findByRoomCode(code);
        return players.size() == 2 && players.stream().allMatch(RoomPlayer::getIsReady);
    }

    @Transactional(readOnly = true)
    public Room getRoomWithPlayers(String code) {
        return roomRepository.findByCodeWithPlayers(code)
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));
    }

    public List<RoomPlayer> getPlayers(String code) {
        return roomPlayerRepository.findByRoomCode(code);
    }

    private String generateUniqueCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random rand = new Random();
        String code;
        do {
            code = IntStream.range(0, 6)
                    .mapToObj(i -> String.valueOf(chars.charAt(rand.nextInt(chars.length()))))
                    .collect(Collectors.joining());
        } while (roomRepository.existsByCode(code));
        return code;
    }
}

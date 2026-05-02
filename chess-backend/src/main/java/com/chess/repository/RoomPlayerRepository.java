package com.chess.repository;

import com.chess.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, Long> {

    @Query("SELECT rp FROM RoomPlayer rp JOIN FETCH rp.user WHERE rp.room.code = :code")
    List<RoomPlayer> findByRoomCode(@Param("code") String code);

    @Query("SELECT rp FROM RoomPlayer rp WHERE rp.room.code = :code AND rp.user.username = :username")
    Optional<RoomPlayer> findByRoomCodeAndUsername(@Param("code") String code, @Param("username") String username);
}

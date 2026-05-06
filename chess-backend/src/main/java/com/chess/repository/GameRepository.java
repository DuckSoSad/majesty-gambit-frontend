package com.chess.repository;

import com.chess.entity.Game;
import com.chess.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer WHERE g.id = :id")
    Optional<Game> findByIdWithPlayers(@Param("id") Long id);

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer WHERE g.room.code = :code")
    Optional<Game> findByRoomCodeWithPlayers(@Param("code") String code);

    @Query("""
        SELECT g FROM Game g
        JOIN FETCH g.whitePlayer
        JOIN FETCH g.blackPlayer
        JOIN FETCH g.room
        WHERE (g.whitePlayer = :user OR g.blackPlayer = :user)
          AND g.result IS NOT NULL
        ORDER BY g.startedAt DESC
        """)
    List<Game> findFinishedByPlayer(@Param("user") User user, Pageable pageable);

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer JOIN FETCH g.room WHERE (g.whitePlayer = :user OR g.blackPlayer = :user) AND g.result IS NULL")
    Optional<Game> findActiveByPlayer(@Param("user") User user);

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer JOIN FETCH g.room WHERE g.result IS NULL")
    List<Game> findAllActive();
}

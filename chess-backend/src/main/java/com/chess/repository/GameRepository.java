package com.chess.repository;

import com.chess.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer WHERE g.id = :id")
    Optional<Game> findByIdWithPlayers(@Param("id") Long id);

    @Query("SELECT g FROM Game g JOIN FETCH g.whitePlayer JOIN FETCH g.blackPlayer WHERE g.room.code = :code")
    Optional<Game> findByRoomCodeWithPlayers(@Param("code") String code);
}

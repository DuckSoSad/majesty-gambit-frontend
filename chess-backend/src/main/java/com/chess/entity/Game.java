package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "games")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false, unique = true)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "white_player_id", nullable = false)
    private User whitePlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "black_player_id", nullable = false)
    private User blackPlayer;

    @Column(name = "current_fen", length = 120)
    @Builder.Default
    private String currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    private GameResult result;

    @Column(name = "winner_color", length = 10)
    @Enumerated(EnumType.STRING)
    private WinnerColor winnerColor;

    @Column(name = "end_reason", length = 30)
    @Enumerated(EnumType.STRING)
    private EndReason endReason;

    @Column(name = "white_time_ms")
    private Long whiteTimeMs;

    @Column(name = "black_time_ms")
    private Long blackTimeMs;

    @Column(name = "white_rating_delta")
    private Integer whiteRatingDelta;

    @Column(name = "black_rating_delta")
    private Integer blackRatingDelta;

    @Column(name = "last_move_at")
    private LocalDateTime lastMoveAt;

    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @PrePersist
    protected void onCreate() { startedAt = LocalDateTime.now(); }

    public enum GameResult  { white_win, black_win, draw }
    public enum WinnerColor { white, black }
    public enum EndReason   {
        checkmate, resign, timeout,
        stalemate, insufficient_material,
        threefold_repetition, agreement
    }
}

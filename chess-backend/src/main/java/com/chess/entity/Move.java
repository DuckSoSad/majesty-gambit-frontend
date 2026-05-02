package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "moves",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"game_id", "move_number", "player_color"}))
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Move {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "move_number", nullable = false)
    private Integer moveNumber;

    @Column(name = "player_color", length = 10, nullable = false)
    @Enumerated(EnumType.STRING)
    private RoomPlayer.PieceColor playerColor;

    @Column(name = "from_square", length = 2, nullable = false)
    private String fromSquare;

    @Column(name = "to_square", length = 2, nullable = false)
    private String toSquare;

    @Column(length = 2, nullable = false)
    private String piece;

    @Column(length = 2)
    private String promotion;

    @Column(length = 10)
    private String san;

    @Column(name = "fen_after", length = 120, nullable = false)
    private String fenAfter;

    @Column(name = "time_spent_ms")
    @Builder.Default
    private Integer timeSpentMs = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}

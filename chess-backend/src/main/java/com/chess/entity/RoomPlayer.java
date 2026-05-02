package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_players",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"room_id", "user_id"}),
        @UniqueConstraint(columnNames = {"room_id", "color"})
    })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private PieceColor color;

    @Column(name = "is_ready")
    @Builder.Default
    private Boolean isReady = false;

    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() { joinedAt = LocalDateTime.now(); }

    public enum PieceColor { white, black }
}

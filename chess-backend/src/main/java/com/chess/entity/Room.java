package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rooms")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @Column(name = "time_control", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TimeControl timeControl = TimeControl.blitz;

    @Column(name = "time_limit_seconds")
    @Builder.Default
    private Integer timeLimitSeconds = 300;

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RoomStatus status = RoomStatus.waiting;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoomPlayer> players = new ArrayList<>();

    @OneToOne(mappedBy = "room", fetch = FetchType.LAZY)
    private Game game;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "host_color_preference", length = 10)
    private String hostColorPreference;

    @Column(name = "is_matchmaking")
    @Builder.Default
    private Boolean isMatchmaking = false;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public enum TimeControl { bullet, blitz, rapid, classical }
    public enum RoomStatus  { waiting, in_progress, finished, cancelled }
}

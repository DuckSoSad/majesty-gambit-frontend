package com.chess.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomMessage {
    private String type;
    private String username;
    private String color;
    private boolean allReady;
    private Long gameId;
    private String roomCode;
    private String whiteUsername;
    private String blackUsername;
}

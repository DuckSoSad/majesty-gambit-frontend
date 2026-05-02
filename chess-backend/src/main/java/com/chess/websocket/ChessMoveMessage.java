package com.chess.websocket;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChessMoveMessage {
    private Long gameId;
    private String fromSquare;
    private String toSquare;
    private String promotion;
    private int timeSpentMs;
}

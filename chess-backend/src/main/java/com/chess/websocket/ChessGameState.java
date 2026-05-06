package com.chess.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChessGameState {
    private Long gameId;
    private String fen;
    private String lastMove;
    private List<String> moveHistory;
    private String currentTurn;
    private boolean isCheck;
    private boolean isCheckmate;
    private boolean isStalemate;
    private String result;
    private String endReason;
    private String whiteUsername;
    private String blackUsername;
    private Long whiteTimeMs;
    private Long blackTimeMs;
    private Integer whiteRatingDelta;
    private Integer blackRatingDelta;
}

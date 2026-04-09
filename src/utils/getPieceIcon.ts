import { Piece, PIECE_ICONS, PieceRole, TeamType } from "@/Constants";

export const getPieceIcon = (piece: Piece):string => {
    if(!piece) return "";
    
    const roleName = PieceRole[piece.role].toLowerCase();
    const teamName = piece.team === TeamType.OUR ? "white" : "black";

    const key = `${roleName}-${teamName}`;

    return PIECE_ICONS[key] || "";
}
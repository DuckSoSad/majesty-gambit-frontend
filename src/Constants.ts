export const verticalAxis = [1, 2, 3, 4, 5, 6, 7, 8];
export const horizonAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const PIECE_ICONS: Record<string, string> = {
  "pawn-white": "♙",
  "pawn-black": "♟",
  "rook-white": "♖",
  "rook-black": "♜",
  "knight-white": "♘",
  "knight-black": "♞",
  "bishop-white": "♗",
  "bishop-black": "♝",
  "queen-white": "♕",
  "queen-black": "♛",
  "king-white": "♔",
  "king-black": "♚",
};

export enum TeamType {
  OPPONENT,
  OUR,
}

export enum PieceRole {
  Bishop,
  King,
  Knight,
  Pawn,
  Queen,
  Rook,
}

export type Piece = {
  id: string;
  image: string;
  x: number;
  y: number;
  role: PieceRole;
  team: TeamType;
  hasMoved?: boolean;
};

export function getPieceImage(name: string, type: string) {
  return `/pieces/Light/${name}_${type}.png`;
}

export default function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let p = 0; p < 2; p++) {
    const teamType = p === 0 ? TeamType.OPPONENT : TeamType.OUR;
    const type = teamType === TeamType.OPPONENT ? "Black" : "White";

    const y = teamType === TeamType.OPPONENT ? 7 : 0;

    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 0,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 1,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 2,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Queen", type),
      role: PieceRole.Queen,
      team: teamType,
      x: 3,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("King", type),
      role: PieceRole.King,
      team: teamType,
      x: 4,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Bishop", type),
      role: PieceRole.Bishop,
      team: teamType,
      x: 5,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Knight", type),
      role: PieceRole.Knight,
      team: teamType,
      x: 6,
      y: y,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Rook", type),
      role: PieceRole.Rook,
      team: teamType,
      x: 7,
      y: y,
    });
  }

  for (let i = 0; i < 8; i++) {
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Pawn", "Black"),
      role: PieceRole.Pawn,
      team: TeamType.OPPONENT,
      x: i,
      y: 6,
    });
    pieces.push({
      id: crypto.randomUUID(),
      image: getPieceImage("Pawn", "White"),
      role: PieceRole.Pawn,
      team: TeamType.OUR,
      x: i,
      y: 1,
    });
  }

  return pieces;
}

export const TUTORIAL_DATA = [
  {
    title: "Chào mừng Kiện tướng!",
    content:
      "Chào mừng bạn đến với đấu trường trí tuệ! Mục tiêu của bạn là dồn quân Vua của đối phương vào thế không thể trốn thoát — gọi là Chiếu hết (Checkmate). Hãy cùng điểm qua những luật chơi từ cơ bản đến nâng cao nhé.",
    icon: "👑",
  },
  {
    title: "Cách di chuyển",
    content:
      "Rất đơn giản: Click vào quân cờ để kích hoạt gợi ý. Các chấm tím sẽ hiển thị tầm kiểm soát của quân đó. Bạn có thể kéo thả quân cờ hoặc chạm trực tiếp vào ô đích để thực hiện nước đi.",
    icon: "🎯",
  },
  {
    title: "Nhập thành (Castling)",
    content:
      "Nước đi đặc biệt giúp bảo vệ Vua và đưa Xe ra tham chiến nhanh chóng. Điều kiện: Vua và Xe chưa từng di chuyển, đường đi giữa chúng phải trống và Vua không được đang bị chiếu. Hãy di chuyển Vua 2 ô về phía Xe, quân Xe sẽ tự động nhảy qua để bảo vệ Vua.",
    icon: "🛡️",
  },
  {
    title: "Bắt tốt qua đường (En Passant)",
    content:
      "Đây là cái bẫy dành riêng cho quân Tốt! Nếu đối thủ vừa nhảy Tốt 2 ô từ vị trí xuất phát để đứng cạnh Tốt của bạn, bạn có thể ăn quân đó bằng cách di chuyển chéo vào ô mà họ vừa nhảy qua. Lưu ý: Bạn chỉ có thể thực hiện ngay lập tức sau khi đối thủ vừa đi nước đó.",
    icon: "⚔️",
  },
  {
    title: "Phong cấp (Promotion)",
    content:
      "Khi quân Tốt dũng cảm của bạn tiến đến được hàng cuối cùng phía đối diện, nó sẽ được 'Phong cấp'. Bạn có thể chọn biến nó thành Hậu, Xe, Tượng hoặc Mã. Hầu hết các kỳ thủ sẽ chọn Hậu để sở hữu sức mạnh tấn công lớn nhất!",
    icon: "⬆️",
  },
  {
    title: "Chiếu tướng & Kết thúc",
    content:
      "Khi Vua bị tấn công, bạn đang bị 'Chiếu'. Nếu không còn nước đi nào để cứu Vua, ván đấu sẽ kết thúc (Checkmate). Nếu bạn không bị chiếu nhưng cũng không còn nước đi hợp lệ nào, ván đấu sẽ hòa (Stalemate). Hãy tính toán thật kỹ!",
    icon: "🏁",
  },
];

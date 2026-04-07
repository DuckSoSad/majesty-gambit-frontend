"use client";

interface Props {
  isBlack: boolean,
}

export default function CellColor({ isBlack }: Props) {
  return (
    <div
      className={`
      w-full h-full flex items-center justify-center absolute z-0
      ${isBlack ? "bg-[#b7C0D8]" : "bg-[#DEE2E6]"}
    `}
    ></div>
  );
}

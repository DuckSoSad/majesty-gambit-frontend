"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";

export type ChatMessage = {
  username: string;
  message: string;
  timestamp: string;
};

type GameChatProps = {
  messages: ChatMessage[];
  myUsername: string;
  onSend: (message: string) => void;
  canSend: boolean;
};

export default function GameChat({ messages, myUsername, onSend, canSend }: GameChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col bg-[#2A2D45] rounded-xl border border-gray-700 overflow-hidden flex-shrink-0 h-52">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/60 bg-[#1E2035]">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-3 select-none">Chưa có tin nhắn nào</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.username === myUsername;
          return (
            <div key={i} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
              <div className={`flex items-baseline gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <span className="text-[10px] text-gray-500 font-medium">{msg.username}</span>
                <span className="text-[10px] text-gray-600">{msg.timestamp}</span>
              </div>
              <span
                className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
                  isMe
                    ? "bg-[#B1A7FC] text-white rounded-tr-sm"
                    : "bg-[#1E2035] text-gray-200 rounded-tl-sm"
                }`}
              >
                {msg.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canSend && (
        <div className="flex gap-2 px-2 py-2 border-t border-gray-700/60">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn tin..."
            className="flex-1 bg-[#1E2035] text-white text-xs px-3 py-1.5 rounded-lg border border-gray-600 focus:border-[#B1A7FC] focus:outline-none placeholder-gray-500 min-w-0"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-1.5 bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex-shrink-0"
          >
            Gửi
          </button>
        </div>
      )}
    </div>
  );
}

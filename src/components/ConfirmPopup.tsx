"use client";

interface ConfirmPopupProps {
  open: boolean;
  icon?: string;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmPopup({
  open,
  icon = "⚠️",
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmPopupProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed z-100 inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm rounded-3xl shadow-[0_20px_50px_rgba(177,167,252,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300 ${
          isDanger ? "bg-[#FF6B6B]" : "bg-[#B1A7FC]"
        }`}
      >
        {/* Icon header */}
        <div className="bg-white/10 pt-8 pb-6 flex justify-center">
          <span className="text-6xl animate-bounce">{icon}</span>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <h3 className="text-2xl text-white font-black uppercase tracking-widest mb-3">
            {title}
          </h3>

          {message && (
            <div className="min-h-12 flex items-center justify-center mb-6">
              <p className="text-white/90 leading-relaxed font-medium">
                {message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 active:scale-95 transition-all uppercase tracking-wider cursor-pointer ${
                isDanger
                  ? "bg-white text-[#FF6B6B]"
                  : "bg-white text-[#B1A7FC]"
              }`}
            >
              {confirmLabel}
            </button>

            <button
              onClick={onCancel}
              className="text-white/60 text-sm font-semibold hover:text-white transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

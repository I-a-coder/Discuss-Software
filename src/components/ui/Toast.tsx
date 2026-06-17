"use client";

import { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        type === "success"
          ? "bg-white border-green-200 text-gray-900"
          : "bg-white border-red-200 text-gray-900"
      }`}
      role="status"
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

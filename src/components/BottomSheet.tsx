"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  footer,
  children,
  maxHeight = "85vh",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight }}
      >
        <div className="flex flex-col items-center pt-2 pb-1 flex-shrink-0">
          <span className="block w-9 h-1 rounded-full bg-gray-200" aria-hidden="true" />
        </div>
        {(title || true) && (
          <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
            <div className="text-sm font-semibold text-gray-900 min-w-0 truncate">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-3">{children}</div>
        {footer && (
          <div
            className="flex-shrink-0 border-t border-gray-100 px-4 py-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
        {!footer && (
          <div
            className="flex-shrink-0"
            style={{ height: "env(safe-area-inset-bottom)" }}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );
}

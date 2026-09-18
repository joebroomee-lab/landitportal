"use client";

import { useEffect } from "react";

export default function Modal({ open, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`card fade-up relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} p-8`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-xl leading-none text-[var(--text-faint)] hover:text-[var(--text)]"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

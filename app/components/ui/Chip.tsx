"use client";

import { C } from "../../lib/constants";

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[13px] whitespace-nowrap cursor-pointer transition-all duration-200 flex-shrink-0"
      style={{
        border: `1.5px solid ${active ? C.ink : C.border}`,
        background: active ? C.ink : C.surface,
        color: active ? C.cream : C.inkSoft,
        fontWeight: active ? 600 : 500,
        fontFamily:"'Hanken Grotesk',sans-serif",
      }}
    >
      {label}
    </button>
  );
}

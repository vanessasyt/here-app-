"use client";

import { C } from "../../lib/constants";
import { Icon } from "./Icon";

export function BackBtn({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 border-0 transition-colors"
      style={{ background: dark ? "rgba(246,241,233,0.12)" : "rgba(28,23,20,0.06)", color: dark ? C.cream : C.ink }}
      aria-label="Back"
    ><Icon name="back" size={20} /></button>
  );
}

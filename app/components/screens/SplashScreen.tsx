"use client";

import { useEffect } from "react";
import { C } from "../../lib/constants";
import { Icon } from "../ui/Icon";
import { Wordmark } from "../ui/Wordmark";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: C.ink }}>
      <div style={{ color: C.accent, marginBottom: 22, animation: "float 3s ease-in-out infinite" }}>
        <Icon name="spark" size={54} />
      </div>
      <Wordmark size={46} />
      <div className="text-sm mt-3.5" style={{ color: "rgba(246,241,233,0.5)", letterSpacing: "0.04em" }}>Meet in the moment</div>
    </div>
  );
}

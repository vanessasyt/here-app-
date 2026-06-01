import { C } from "../../lib/constants";

export function Wordmark({ size = 40, light = true }: { size?: number; light?: boolean }) {
  return (
    <span style={{ fontWeight: 800, letterSpacing: "-0.04em", fontSize: size, lineHeight: 1, color: light ? C.cream : C.ink }}>
      here<span style={{ color: C.accent }}>.</span>
    </span>
  );
}

import { INTERESTS } from "../../lib/constants";
import { C } from "../../lib/constants";

export function InterestTag({ interest }: { interest: string }) {
  const meta = INTERESTS.find(i => i.id === interest);
  const display = meta ? meta.label : interest;
  return (
    <span
      className="text-[11px] font-medium px-2 py-[3px] rounded-full"
      style={{ background: "rgba(28,23,20,0.05)", color: C.inkSoft, letterSpacing: "0.01em" }}
    >
      {display}
    </span>
  );
}

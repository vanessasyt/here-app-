"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { UserProfile, Screen } from "../../lib/types";
import { Icon } from "../ui/Icon";

export function PendingScreen({
  person, onNavigate, inboxCount, msgCount, currentUser, sentAt,
}: { person: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number; currentUser: UserProfile; sentAt: string }) {
  const firstName = person.name.split(",")[0];
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase.from("meet_requests").select("status").eq("from_id", currentUser.id).eq("to_id", person.id).gte("created_at", sentAt).in("status", ["accepted", "declined"]).limit(1).maybeSingle();
      if (data) clearInterval(pollRef.current!);
    }
    const delay = setTimeout(() => {
      checkStatus();
      pollRef.current = setInterval(checkStatus, 8_000);
    }, 3_000);
    return () => { clearTimeout(delay); if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentUser.id, person.id, sentAt]);

  return (
    <div className="flex flex-col h-full" style={{ background:C.ink }}>
      <div className="px-6 pt-6 flex items-center gap-3 flex-shrink-0">
        <button onClick={()=>onNavigate("inbox")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base cursor-pointer flex-shrink-0 border-0"
          style={{ background:"rgba(246,241,233,0.1)", color:C.cream }}><Icon name="close" size={18} /></button>
        <div className="text-xs uppercase tracking-[1.5px] font-semibold" style={{ color:"rgba(245,240,232,0.45)" }}>Request sent</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-5" style={{ color:C.accent, animation:"float 3s ease-in-out infinite" }}><Icon name="clock" size={50} stroke={1.6} /></div>
        <div className="text-[28px] leading-snug mb-3" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>
          Request sent to<br /><em style={{ color:C.accent }}>{firstName}</em>
        </div>
        <div className="text-[13px] leading-relaxed mb-6 max-w-[280px]" style={{ color:"rgba(245,240,232,0.55)" }}>
          Waiting for <strong style={{ color:"rgba(245,240,232,0.8)" }}>{firstName}</strong> to respond.
        </div>
        <div className="flex gap-2 mb-6">
          {[0,1,2].map(i=>(
            <div key={i} className="w-2 h-2 rounded-full" style={{ background:C.accent, animation:`pulse 1.4s ${i*0.2}s ease-in-out infinite` }} />
          ))}
        </div>
        <div className="w-full p-4 rounded-[18px] mb-4 text-left" style={{ background:"rgba(196,120,58,0.08)", border:"1px solid rgba(196,120,58,0.2)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.accent }}>What happens next</div>
          <div className="text-[13px] leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>
            If {firstName} accepts, you will see a notification in your <strong style={{ color:"rgba(245,240,232,0.75)" }}>Requests</strong> tab. Open it to get the green light and go find them.
          </div>
        </div>
        <div className="text-xs leading-relaxed" style={{ color:"rgba(245,240,232,0.35)" }}>
          Location is never shared. This is an in-person introduction only.
        </div>
      </div>
      <div className="px-6 pb-6 flex flex-col gap-2.5">
        <button onClick={()=>onNavigate("nearby")} className="w-full py-3.5 rounded-2xl text-[15px] font-semibold cursor-pointer border-0"
          style={{ background:C.accent, color:"white", fontFamily:"'Hanken Grotesk',sans-serif" }}>
          ← Back to Nearby
        </button>
        <button onClick={()=>onNavigate("inbox")} className="w-full py-3.5 rounded-2xl text-[14px] font-medium cursor-pointer border-0"
          style={{ background:"rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.55)", fontFamily:"'Hanken Grotesk',sans-serif" }}>
          View Meet Requests
        </button>
      </div>
    </div>
  );
}

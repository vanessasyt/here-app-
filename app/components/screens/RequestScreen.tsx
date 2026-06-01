"use client";

import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { C, INTERESTS } from "../../lib/constants";
import type { UserProfile, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { BackBtn } from "../ui/BackBtn";
import { BottomNav } from "../ui/BottomNav";

export function RequestScreen({
  person, currentUser, onNavigate, inboxCount, msgCount,
}: { person: UserProfile; currentUser: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const firstName = person.name.split(",")[0];
  const submittingRef = useRef(false);

  async function sendRequest() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true); setError("");
    const cutoff30 = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data: existing } = await supabase.from("meet_requests").select("id").eq("from_id", currentUser.id).eq("to_id", person.id).gte("created_at", cutoff30).in("status", ["pending", "accepted"]).maybeSingle();
    if (existing) { setError("You have already expressed interest in this person today."); setSending(false); submittingRef.current = false; return; }
    const sentAt = new Date().toISOString();
    const { error: err } = await supabase.from("meet_requests").insert({ from_id: currentUser.id, to_id: person.id, hint: null, status: "pending", created_at: sentAt });
    setSending(false);
    if (err) { setError("Something went wrong. Please try again."); submittingRef.current = false; return; }
    setSent(true);
    setTimeout(() => onNavigate("pending", { person, sentAt }), 1200);
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-5 flex items-center gap-3.5 flex-shrink-0">
        <BackBtn onClick={()=>onNavigate("nearby")} />
        <AvatarCircle user={person} size={52} />
        <div>
          <div className="text-[19px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>{person.name}, {person.age}</div>
          <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{person.occupation} · Verified</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="bg-white mx-[22px] mt-4 rounded-[18px] px-4 pt-4 pb-4" style={{ boxShadow:"0 2px 14px rgba(26,20,16,0.06)" }}>
          <div className="text-[10px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>Interests</div>
          <div className="flex flex-wrap gap-1.5">
            {person.interests.map(i=><InterestTag key={i} interest={i} />)}
          </div>
          {person.interests.length > 0 && (
            <div className="mt-3 px-3 py-2.5 rounded-xl text-[12px] leading-relaxed" style={{ background:"rgba(74,124,89,0.06)", color:C.inkSoft }}>
              Ask about{" "}
              {person.interests.slice(0,2).map((id, idx, arr) => {
                const meta = INTERESTS.find(x => x.id === id);
                return (
                  <span key={id}>
                    <strong style={{ color:C.ink }}>{meta?.label ?? id}</strong>
                    {idx < arr.length - 1 ? " or " : ""}
                  </span>
                );
              })}
              {" "}to break the ice.
            </div>
          )}
          {(person.languages ?? []).length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-[1.5px] font-semibold mt-3 mb-2" style={{ color:C.warmMid }}>Languages</div>
              <div className="flex flex-wrap gap-1.5">
                {(person.languages ?? []).map(l => (
                  <span key={l} className="text-[11px] px-2 py-0.5 rounded-lg" style={{ background:"rgba(139,115,85,0.1)", color:C.inkSoft }}>{l}</span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mx-[22px] mt-3 px-4 py-3 rounded-xl text-[12px] leading-relaxed" style={{ background:"rgba(139,115,85,0.07)", color:C.warmMid }}>
          You will only receive a notification if <strong style={{ color:C.inkSoft }}>{firstName}</strong> is also open to meet. If they accept, that is your green light to find each other in person.
        </div>
        {!sent ? (
          <button onClick={sendRequest} disabled={sending}
            className="mx-[22px] mt-4 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background:C.green, width:"calc(100% - 44px)", opacity:sending?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
            {sending ? "Sending…" : "Express interest"}
          </button>
        ) : (
          <div className="mx-[22px] mt-4 py-4 rounded-2xl text-center text-[14px] font-semibold" style={{ background:"rgba(74,124,89,0.1)", color:C.green }}>
            Interest sent — you will hear back in Requests
          </div>
        )}
        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <div className="h-4" />
      </div>
      <BottomNav messagesCount={msgCount} active="nearby" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

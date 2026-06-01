"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { UserProfile, Screen } from "../../lib/types";
import { getPronouns } from "../../lib/utils";
import { AvatarCircle } from "../ui/Avatar";

export function FollowUpScreen({
  person, onNavigate, inboxCount, msgCount, currentUser, requestId,
}: { person: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number; currentUser: UserProfile; requestId: string | null }) {
  const [choice, setChoice] = useState<string | null>(null);
  const firstName = person.name.split(",")[0];
  const pr = getPronouns(person);

  const opts = [
    { id:"yes",       label:"Would meet again",             sub:`If ${pr.sub.toLowerCase()} says yes too, chat opens`, yes:true  },
    { id:"nice",      label:"It was nice but no",           sub:`No chat, no notification to ${pr.obj}`,               yes:false },
    { id:"numbers",   label:"We already exchanged numbers", sub:"No further action needed",                             yes:false },
    { id:"didntmeet", label:"Didn't end up meeting",        sub:"Closes the record quietly",                           yes:false },
  ];

  async function confirm() {
    if (!choice) return;
    const key = `here_met_${currentUser.id}`;
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
    const updated = existing.map((e: any) =>
      e.personId === person.id ? { ...e, answered: true, choice } : e
    );
    localStorage.setItem(key, JSON.stringify(updated));
    if (choice === "yes" && requestId) {
      await supabase.from("meet_again").upsert(
        { user_id: currentUser.id, request_id: requestId, created_at: new Date().toISOString() },
        { onConflict: "user_id,request_id" }
      );
    }
    onNavigate("messages");
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.ink }}>
      <div className="px-6 pt-8 flex items-center gap-3 flex-shrink-0">
        <AvatarCircle user={person} size={42} />
        <div>
          <div className="text-[18px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>{firstName}</div>
          <div className="text-[11px]" style={{ color:"rgba(245,240,232,0.45)" }}>You met earlier</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ minHeight: 0 }}>
        <div className="text-[24px] mt-6 mb-2 leading-snug" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>
          How did it go with {firstName}?
        </div>
        <div className="text-[13px] mb-6" style={{ color:"rgba(245,240,232,0.45)" }}>
          Only a mutual yes unlocks chat. {pr.sub} never knows if you said no.
        </div>
        {opts.map(o => (
          <div key={o.id} onClick={() => setChoice(o.id)}
            className="p-3.5 rounded-2xl mb-2.5 cursor-pointer transition-all duration-200"
            style={{
              border: `1px solid ${choice === o.id ? (o.yes ? "rgba(74,124,89,0.5)" : "rgba(245,240,232,0.3)") : "rgba(245,240,232,0.1)"}`,
              background: choice === o.id ? (o.yes ? "rgba(74,124,89,0.1)" : "rgba(245,240,232,0.05)") : "transparent",
            }}>
            <div className="text-[13px] font-semibold" style={{ color: choice === o.id && o.yes ? "#b8e8c8" : C.cream }}>{o.label}</div>
            <div className="text-[11px] mt-0.5" style={{ color: choice === o.id && o.yes ? "rgba(184,232,200,0.55)" : "rgba(245,240,232,0.4)" }}>{o.sub}</div>
          </div>
        ))}
      </div>
      <div className="px-6 pb-7 flex-shrink-0">
        <button onClick={confirm} disabled={!choice}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold border-0 cursor-pointer transition-all"
          style={{
            background: choice === "yes" ? C.green : choice ? "rgba(245,240,232,0.12)" : "rgba(245,240,232,0.06)",
            color: choice ? C.cream : "rgba(245,240,232,0.3)",
            fontFamily:"'Hanken Grotesk',sans-serif",
          }}>
          Confirm
        </button>
      </div>
    </div>
  );
}

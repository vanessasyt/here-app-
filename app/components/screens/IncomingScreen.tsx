"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { InboxRequest, IncResponse, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { BackBtn } from "../ui/BackBtn";
import { BottomNav } from "../ui/BottomNav";

export function IncomingScreen({
  request, onNavigate, inboxCount, msgCount, onDecline,
}: { request: InboxRequest; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number; onDecline: (id: string) => void }) {
  const [response,  setResponse]  = useState<IncResponse>("accept");
  const [areaHint,  setAreaHint]  = useState("");
  const [sending,   setSending]   = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error,     setError]     = useState("");
  const firstName                 = request.name.split(",")[0];

  const options: { id: IncResponse; label: string; sub: string }[] = [
    { id:"accept", label:"Accept — meet now",        sub:"Give them the green light to approach you" },
    { id:"15min",  label:"Accept — meet in 15 min",  sub:"I will be with you shortly"                },
    { id:"30min",  label:"Accept — meet in 30 min",  sub:"I will see you in a bit"                   },
  ];
  const showAreaHint = true;

  async function confirm() {
    setSending(true); setError("");
    const { error: err } = await supabase.from("meet_requests").update({ status:"accepted", recipient_hint:areaHint.trim()||null, response_timing:response }).eq("id", request.id);
    setSending(false);
    if (err) { setError("Failed: " + err.message); return; }
    onNavigate("match", { request, response, fromIncoming: true, recipientHint: areaHint.trim() || null, requestId: request.id });
  }

  async function handleDecline() {
    setDeclining(true);
    await supabase.from("meet_requests").update({ status: "declined" }).eq("id", request.id);
    onDecline(request.id);
    setDeclining(false);
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-[22px] flex items-center gap-3 flex-shrink-0">
        <BackBtn onClick={()=>onNavigate("inbox")} />
        <div className="text-xs uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Incoming interest</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="mx-[22px] mt-4 flex items-center gap-4">
          <AvatarCircle user={{ photo_url:request.photo_url, bg:request.bg, name:request.name }} size={58} />
          <div>
            <div className="text-[20px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>{request.name}</div>
            <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{request.meta}</div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">{request.tags.map(t=><InterestTag key={t} interest={t} />)}</div>
          </div>
        </div>
        <div className="mx-[22px] mt-3.5 p-[14px_18px] rounded-2xl" style={{ background:"rgba(74,124,89,0.08)", border:"1px solid rgba(74,124,89,0.25)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.green }}>Expressed interest in meeting you</div>
          <div className="text-[14px] leading-relaxed" style={{ color:C.inkSoft }}>{firstName} would like to meet you in person. Accept to give them the green light to approach you.</div>
        </div>
        <div className="px-[22px] pt-3.5">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2.5" style={{ color:C.warmMid }}>Your response</div>
          {options.map(opt=>(
            <div key={opt.id} onClick={()=>setResponse(opt.id)}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl mb-2.5 cursor-pointer transition-all duration-200"
              style={{ border:`1.5px solid ${response===opt.id?C.green:C.border}`, background:response===opt.id?"rgba(74,124,89,0.08)":"transparent" }}>
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor:response===opt.id?C.green:C.border, background:response===opt.id?C.green:"transparent" }}>
                {response===opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color:C.ink }}>{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{opt.sub}</div>
              </div>
            </div>
          ))}
        </div>
        {showAreaHint && (
          <div className="px-[22px] pt-1 pb-1">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>
              Where will you be? <span className="normal-case font-normal" style={{ textTransform:"none", letterSpacing:0 }}>(optional)</span>
            </div>
            <input value={areaHint} onChange={e=>setAreaHint(e.target.value)} maxLength={80}
              placeholder="e.g. near the tube exit, by the bar…"
              className="w-full px-4 py-3 rounded-[14px] text-[13px] outline-none"
              style={{ border:`1.5px solid ${C.border}`, fontFamily:"'Hanken Grotesk',sans-serif", color:C.ink, background:"white" }} />
            <div className="text-[11px] text-right mt-1" style={{ color:C.warmMid }}>{areaHint.length} / 80</div>
          </div>
        )}
        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <button onClick={confirm} disabled={sending}
          className="mx-[22px] mt-3 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:C.green, width:"calc(100% - 44px)", opacity:sending?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
          {sending ? "Confirming…" : "Accept"}
        </button>
        <button onClick={handleDecline} disabled={declining}
          className="mx-[22px] mt-2.5 py-[13px] rounded-2xl text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.warmMid, width:"calc(100% - 44px)", fontFamily:"'Hanken Grotesk',sans-serif", opacity:declining?0.5:1 }}>
          {declining ? "Declining…" : "Decline"}
        </button>
        <div className="h-6" />
      </div>
      <BottomNav messagesCount={msgCount} active="inbox" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

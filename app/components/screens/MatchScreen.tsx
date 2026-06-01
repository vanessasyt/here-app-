"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { C, BG_OPTIONS } from "../../lib/constants";
import type { UserProfile, InboxRequest, IncResponse, Screen } from "../../lib/types";
import { getPronouns } from "../../lib/utils";
import { AvatarCircle } from "../ui/Avatar";
import { Icon } from "../ui/Icon";

export function MatchScreen({
  matchData, onNavigate, currentUser, onBlock, onDecline, onClearAccepted, onMetThem, matchPersonProfile,
}: {
  matchData: { person?: UserProfile; request?: InboxRequest; response?: IncResponse; fromIncoming?: boolean; recipientHint?: string };
  onNavigate: (s: Screen, d?: unknown) => void; currentUser: UserProfile;
  onBlock: (id: string) => void; onDecline: (id: string) => void;
  onClearAccepted: () => void; onMetThem: (id: string) => void;
  matchPersonProfile?: UserProfile|null;
}) {
  const person    = matchPersonProfile ?? matchData.person ?? matchData.request;
  const firstName = person ? person.name.split(",")[0] : "They";
  const pr        = getPronouns((matchPersonProfile ?? matchData.person) as UserProfile | null);
  const timerMins = matchData.response==="15min" ? 15 : 30;
  const reportedId = (matchData.person?.id) || ((matchData.request as any)?.from_id) || null;
  const fromIncoming = matchData.fromIncoming ?? false;
  const askMePrompts = (matchPersonProfile ?? matchData.person as UserProfile | undefined)?.ask_me_prompts ?? [];

  const [secs,         setSecs]       = useState(timerMins*60);
  const [erased,       setErased]     = useState(false);
  const [showReport,   setShowReport] = useState(false);
  const [reportOpt,    setReportOpt]  = useState("");
  const [showToast,    setShowToast]  = useState(false);
  const [submitting,   setSubmitting] = useState(false);
  const [showNotes,    setShowNotes]  = useState(false);
  const [notesText,    setNotesText]  = useState("");

  useEffect(()=>{
    if (erased) return;
    const t = setInterval(()=>setSecs(s=>{ if(s<=1){clearInterval(t);setErased(true);return 0;} return s-1; }),1000);
    return ()=>clearInterval(t);
  },[erased]);

  const mins = Math.floor(secs/60), sec = secs%60;

  return (
    <div className="flex flex-col h-full relative" style={{ background:C.ink }}>
      <div className="flex-1 flex flex-col items-center pt-7 px-6 overflow-y-auto" style={{ minHeight:0 }}>
        <div className="mb-4" style={{ color:C.green, animation:"float 3s ease-in-out infinite" }}><Icon name="spark" size={48} /></div>
        <div className="text-[30px] text-center leading-snug" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.cream }}>
          {fromIncoming ? "You accepted." : `${firstName} accepted.`}<br />
          <em style={{ color:C.green }}>{pr.goFind}.</em>
        </div>
        <div className="text-[13px] text-center mt-2.5 leading-relaxed px-2" style={{ color:"rgba(245,240,232,0.55)" }}>
          {fromIncoming
            ? `${firstName} will be looking out for you. Head over and introduce yourself.`
            : `${firstName} is expecting you. Go say hello in person.`}
        </div>

        <div className="w-full mt-5 p-4 rounded-[20px] flex items-center gap-3.5" style={{ background:"rgba(245,240,232,0.05)", border:"1px solid rgba(245,240,232,0.1)" }}>
          <AvatarCircle user={person ?? { name:"?", bg:BG_OPTIONS[0], photo_url:null }} size={52} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]" style={{ color:C.cream }}>{person?.name ?? firstName}</div>
            <div className="text-[12px] mt-0.5" style={{ color:"rgba(245,240,232,0.45)" }}>{(person as UserProfile)?.occupation ?? ""}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {((person as UserProfile)?.interests ?? []).slice(0,3).map((i:string)=>(
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background:"rgba(74,124,89,0.2)", color:"rgba(232,245,238,0.8)" }}>{i}</span>
              ))}
            </div>
            {matchData.recipientHint && (
              <div className="mt-2 text-[12px] leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>
                Near: <strong style={{ color:C.cream }}>{matchData.recipientHint}</strong>
              </div>
            )}
          </div>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:C.green, boxShadow:`0 0 10px ${C.green}` }} />
        </div>

        {askMePrompts.length > 0 && (
          <div className="w-full mt-4">
            <div className="text-[11px] uppercase tracking-[1.4px] font-semibold mb-2" style={{ color:C.accent }}>Ask {firstName} about…</div>
            <div className="flex flex-col gap-2">
              {askMePrompts.map((prompt, i) => (
                <div key={i} className="flex gap-2.5 items-start px-3.5 py-3 rounded-xl"
                  style={{ background:"rgba(245,240,232,0.05)", border:"1px solid rgba(245,240,232,0.1)" }}>
                  <span className="text-[12px] font-bold flex-shrink-0 mt-0.5" style={{ color:C.accent }}>{i+1}</span>
                  <span className="text-[13px] leading-relaxed" style={{ color:C.cream }}>{prompt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 text-center">
          <div className="w-[68px] h-[68px] rounded-full border-[3px] mx-auto flex items-center justify-center relative"
            style={{ borderColor:"rgba(245,240,232,0.12)", borderTopColor:erased?"rgba(245,240,232,0.12)":C.green, animation:erased?"none":"spin 30s linear infinite" }}>
            <div className="text-[17px] font-semibold absolute" style={{ color:C.cream }}>
              {erased ? "—" : `${mins}:${String(sec).padStart(2,"0")}`}
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color:"rgba(245,240,232,0.4)" }}>
            {erased ? "Green light expired" : `Green light expires in ${timerMins} min`}
          </div>
        </div>
        <div className="w-full mt-4 p-3.5 rounded-xl text-xs leading-relaxed text-center" style={{ background:"rgba(245,240,232,0.04)", border:"1px solid rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.35)" }}>
          Location is never shared. This is an in-person introduction only.
        </div>
      </div>

      <div className="flex gap-3 px-6 pt-3 flex-shrink-0">
        <button onClick={()=>setShowReport(true)} className="flex-1 py-3.5 rounded-[14px] text-[13px] cursor-pointer" style={{ border:"1px solid rgba(184,80,66,0.3)", background:"transparent", color:"rgba(245,240,232,0.6)", fontFamily:"'Hanken Grotesk',sans-serif" }}>Report</button>
        <button onClick={()=>{
          if(reportedId) onMetThem(reportedId);
          const metPerson = matchPersonProfile ?? matchData.person ?? (matchData.request ? {
            id: (matchData.request as any).from_id ?? "",
            name: matchData.request.name, age: 25, occupation: matchData.request.meta,
            interests: matchData.request.tags ?? [], languages: [], photo_url: matchData.request.photo_url,
            bg: matchData.request.bg, email: "", open_to_meet: true,
            checked_in_event_id: null, checked_in_at: null, lat: null, lng: null,
          } as UserProfile : null);
          if (metPerson && (metPerson as UserProfile).id && currentUser) {
            const key = `here_met_${currentUser.id}`;
            const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
            const alreadyThere = existing.some((e: any) => e.personId === (metPerson as UserProfile).id);
            const reqId = (matchData as any).requestId ?? (matchData.request as any)?.id ?? null;
            if (!alreadyThere) {
              existing.push({ personId: (metPerson as UserProfile).id, person: metPerson, requestId: reqId, metAt: new Date().toISOString(), answered: false });
              localStorage.setItem(key, JSON.stringify(existing));
              window.dispatchEvent(new Event("here_met_updated"));
            }
          }
          setShowNotes(true);
        }} className="flex-[2] py-3.5 rounded-[14px] text-[13px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.green, fontFamily:"'Hanken Grotesk',sans-serif" }}>Met them</button>
      </div>
      <div className="h-7" />

      {showNotes && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background:"rgba(0,0,0,0.6)" }}>
          <div className="w-full rounded-[28px_28px_0_0] p-6 pb-9" style={{ background:C.cream }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background:C.border }} />
            <div className="flex items-center gap-3 mb-1">
              <AvatarCircle user={person ?? { name:"?", bg:BG_OPTIONS[0], photo_url:null }} size={36} />
              <div>
                <div className="text-[17px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>First impression</div>
                <div className="text-[11px]" style={{ color:C.warmMid }}>Private, only you can see this</div>
              </div>
            </div>
            <div className="mb-3 mt-3 text-xs leading-relaxed" style={{ color:C.warmMid }}>
              Jot down your initial thoughts about {firstName}. This is saved as a personal note, {firstName} will never see it.
            </div>
            <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={5}
              placeholder={`Your first impression of ${firstName}… (optional)`}
              className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none resize-none mb-4"
              style={{ border:`1.5px solid ${C.border}`, background:"white", fontFamily:"'Hanken Grotesk',sans-serif", color:C.ink }} />
            <button onClick={()=>{
              if (person && (person as UserProfile).id) {
                localStorage.setItem(`here_note_${currentUser.id}_${(person as UserProfile).id}`, notesText);
              }
              setShowNotes(false); onNavigate("inbox");
            }} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer mb-2"
              style={{ background:C.green, fontFamily:"'Hanken Grotesk',sans-serif" }}>Save &amp; done</button>
            <button onClick={()=>{ setShowNotes(false); onNavigate("inbox"); }}
              className="w-full py-3 rounded-2xl text-[14px] cursor-pointer border-0"
              style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Skip</button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background:"rgba(0,0,0,0.6)" }}>
          <div className="w-full rounded-[28px_28px_0_0] p-6 pb-9" style={{ background:C.cream }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background:C.border }} />
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Report this profile</div>
            <div className="text-[13px] mb-5" style={{ color:C.warmMid }}>What&apos;s the issue? Your report is anonymous.</div>
            {["Made me feel unsafe or uncomfortable","Inappropriate behaviour or messages","Fake or misleading profile","Other"].map(opt=>(
              <button key={opt} onClick={()=>setReportOpt(opt)}
                className="w-full p-3.5 rounded-[14px] text-[14px] text-left mb-2.5 cursor-pointer transition-all"
                style={{ border:`1.5px solid ${reportOpt===opt?C.ink:C.border}`, background:reportOpt===opt?C.ink:"white", color:reportOpt===opt?C.cream:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                {opt}
              </button>
            ))}
            {reportOpt && (
              <button disabled={submitting} onClick={async () => {
                setSubmitting(true);
                await supabase.from("reports").insert({ reporter_id:currentUser.id, reported_id:reportedId, reason:reportOpt, created_at:new Date().toISOString() });
                if (reportedId) {
                  await supabase.from("blocked_users").insert({ blocker_id:currentUser.id, blocked_id:reportedId, created_at:new Date().toISOString() });
                  onBlock(reportedId);
                  const requestId = (matchData.request as any)?.id;
                  if (requestId) onDecline(requestId);
                  onClearAccepted();
                }
                setSubmitting(false); setShowReport(false); setShowToast(true);
                setTimeout(()=>{ setShowToast(false); onNavigate("inbox"); }, 3000);
              }} className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white border-0 cursor-pointer mb-2.5"
                style={{ background:C.ink, opacity:submitting?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            )}
            <button onClick={()=>setShowReport(false)} className="w-full py-3.5 rounded-[14px] text-[14px] cursor-pointer" style={{ border:`1px solid ${C.border}`, background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {showToast && (
        <div className="absolute bottom-10 left-6 right-6 p-4 rounded-[18px] text-center z-[200]" style={{ background:C.ink, color:C.cream, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", border:"1px solid rgba(245,240,232,0.1)" }}>
          <div className="text-[15px] font-semibold mb-1">Thank you for your report</div>
          <div className="text-[13px] leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>We take safety seriously and will review within 24 hours. This person has been blocked.</div>
        </div>
      )}
    </div>
  );
}

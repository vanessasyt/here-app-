"use client";

import { useState, useEffect } from "react";
import { C } from "../../lib/constants";
import type { InboxRequest, UserProfile, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { Icon } from "../ui/Icon";
import { BottomNav } from "../ui/BottomNav";

type PendingMetEntry = { personId: string; person: UserProfile; requestId: string|null; metAt: string; answered: boolean };

export function InboxScreen({
  requests, onNavigate, onDecline, onDismiss, acceptedSent, onViewMatch, msgCount, currentUser,
}: {
  requests: InboxRequest[]; onNavigate: (s: Screen, d?: unknown) => void;
  onDecline: (id: string) => void; onDismiss: (id: string) => void;
  msgCount?: number; currentUser?: UserProfile;
  acceptedSent?: { person: UserProfile; recipientHint: string|null } | null;
  onViewMatch?: () => void;
}) {
  function readPendingMet(): PendingMetEntry[] {
    if (!currentUser || typeof window === "undefined") return [];
    const raw = localStorage.getItem(`here_met_${currentUser.id}`);
    if (!raw) return [];
    try { return (JSON.parse(raw) as any[]).filter(e => !e.answered); } catch { return []; }
  }
  const [pendingMet, setPendingMet] = useState<PendingMetEntry[]>(readPendingMet);

  useEffect(() => {
    function onStorage() { setPendingMet(readPendingMet()); }
    window.addEventListener("storage", onStorage);
    window.addEventListener("here_met_updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("here_met_updated", onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const pendingMetPersonIds = new Set(pendingMet.map(m => m.personId));
  const filteredRequests = requests.filter(r => !r.from_id || !pendingMetPersonIds.has(r.from_id));

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-5 flex-shrink-0">
        <div className="text-[22px] mt-0.5" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Meet Requests</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="pt-3">
          {acceptedSent && (<>
            <div className="px-[22px] mb-2">
              <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.green }}>Green light</div>
            </div>
            <div className="mx-[22px] mb-4 rounded-[18px] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background:"linear-gradient(135deg,#1a3a28,#2a5a3a)", border:"2px solid rgba(74,124,89,0.6)", boxShadow:"0 4px 24px rgba(74,124,89,0.25)" }}
              onClick={onViewMatch}>
              <div style={{ height:3, background:"linear-gradient(to right,transparent,rgba(74,124,89,0.8),#4A7C59,rgba(74,124,89,0.8),transparent)", animation:"shimmer 2s linear infinite", backgroundSize:"200% 100%" }} />
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <AvatarCircle user={acceptedSent.person} size={44} />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background:C.green, border:"2px solid #1a3a28", color:"white" }}><Icon name="check" size={11} stroke={2.8} /></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold" style={{ color:"#e8f5ee", fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em" }}>
                      {acceptedSent.person.name.split(",")[0]} accepted
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color:"rgba(232,245,238,0.65)" }}>Tap to get the green light and go find them</div>
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {pendingMet.length > 0 && (<>
            <div className="px-[22px] mb-2 mt-1">
              <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Pending</div>
            </div>
            {pendingMet.map(m => {
              const firstName = m.person.name.split(",")[0];
              const hoursAgo = Math.floor((Date.now() - new Date(m.metAt).getTime()) / 3_600_000);
              const isOverdue = hoursAgo >= 3;
              return (
                <div key={m.personId}
                  className="mx-[22px] mb-3 p-4 rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: isOverdue ? "rgba(196,120,58,0.06)" : "rgba(139,115,85,0.05)", border:`1.5px solid ${isOverdue ? C.accent : C.border}` }}
                  onClick={() => onNavigate("followup", { person: m.person, requestId: m.requestId ?? null })}>
                  <div className="flex items-center gap-3">
                    <AvatarCircle user={m.person} size={42} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color:C.ink }}>{firstName}</div>
                      <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>
                        {isOverdue ? "Waiting for your answer" : `Met ${hoursAgo < 1 ? "just now" : `${hoursAgo}h ago`}`}
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold flex-shrink-0" style={{ color: isOverdue ? C.accent : C.warmMid }}>
                      {isOverdue ? "Answer now →" : "How did it go? →"}
                    </div>
                  </div>
                </div>
              );
            })}
          </>)}

          <div className="px-[22px] mb-2 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Incoming</div>
            {filteredRequests.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background:C.green, animation:"pulse 2s infinite" }} />
                <span className="text-[11px] font-semibold" style={{ color:C.green }}>{filteredRequests.length} new</span>
              </div>
            )}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color:C.warmMid }}>
              {acceptedSent ? "No other incoming requests" : "No requests yet"}
            </div>
          ) : filteredRequests.map(r=>(
            <div key={r.id} className="mx-5 mb-3 p-4 rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background:"rgba(196,120,58,0.04)", border:`1.5px solid ${C.accent}`, boxShadow:"0 2px 14px rgba(26,20,16,0.07)" }}
              onClick={()=>onNavigate("incoming",r.id)}>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:C.accent }} />
                <AvatarCircle user={{ photo_url:r.photo_url, bg:r.bg, name:r.name }} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color:C.ink }}>{r.name}</div>
                  <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{r.meta}</div>
                  <div className="text-[11px] font-semibold mt-1" style={{ color:C.accent }}>{r.reqLabel}</div>
                </div>
                <div className="text-[11px] flex-shrink-0" style={{ color:C.warmMid }}>{r.time}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={e=>{e.stopPropagation();onNavigate("incoming",r.id);}} className="flex-[2] py-2.5 rounded-xl text-[13px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.green }}>Respond →</button>
                <button onClick={e=>{e.stopPropagation();onDecline(r.id);}} className="flex-1 py-2.5 rounded-xl text-[13px] cursor-pointer" style={{ border:`1px solid ${C.border}`, background:"transparent", color:C.warmMid }}>Decline</button>
              </div>
            </div>
          ))}

          <div className="mx-5 mt-2 p-3.5 rounded-[14px] text-xs leading-relaxed" style={{ background:"rgba(139,115,85,0.07)", color:C.warmMid }}>
            You are only notified when both parties are open to meet. Requests expire after 30 minutes.
          </div>
        </div>
        <div className="h-2" />
      </div>
      <BottomNav messagesCount={msgCount ?? 0} active="inbox" onNavigate={onNavigate} inboxCount={filteredRequests.length + (acceptedSent ? 1 : 0)} />
    </div>
  );
}

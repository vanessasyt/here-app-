"use client";

import { C } from "../../lib/constants";
import type { HereEvent, Screen } from "../../lib/types";
import { Icon, categoryIcon } from "../ui/Icon";
import { BackBtn } from "../ui/BackBtn";
import { BottomNav } from "../ui/BottomNav";

export function EventDetailScreen({
  event, onNavigate, inboxCount, msgCount,
}: { event: HereEvent; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number }) {
  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="h-48 relative flex items-center justify-center flex-shrink-0" style={{ background:`linear-gradient(160deg,${event.gradientFrom},${event.gradientTo})` }}>
        <span style={{ color:"rgba(255,255,255,0.92)", filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}><Icon name={categoryIcon(event.category)} size={64} stroke={1.6} /></span>
        <div className="absolute top-4 left-4"><BackBtn onClick={()=>onNavigate("events")} dark /></div>
        {event.sponsored && <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ background:C.accent }}><span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><Icon name="star" size={11} /> Sponsored</span></div>}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white" style={{ background:"rgba(74,124,89,0.88)" }}><span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Icon name="spark" size={12} /> {event.members} here</span></div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="px-[22px] pt-[18px]">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>{event.category} · {event.venue}</div>
          <div className="text-[22px] mt-1 leading-snug" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>{event.name}</div>
          <div className="text-[13px] mt-1.5" style={{ color:C.warmMid }}><span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Icon name="calendar" size={14} stroke={1.9} /> {event.meta}</span></div>
          <div className="text-[13px] mt-2.5 leading-relaxed" style={{ color:C.inkSoft }}>{event.desc}</div>
        </div>
        <div className="px-[22px] pt-4">
          {event.sponsored ? (
            <div className="flex gap-2.5">
              <button className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.accent }}><span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name="ticket" size={17} stroke={2} /> Buy Ticket</span></button>
              <button className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold border-0 cursor-pointer" style={{ background:"rgba(139,115,85,0.12)", color:C.ink }}><span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name="qr" size={17} stroke={2} /> Scan QR</span></button>
            </div>
          ) : (
            <button className="w-full py-3.5 rounded-2xl text-[15px] font-semibold border-0 cursor-pointer" style={{ background:"rgba(139,115,85,0.12)", color:C.ink }}><span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name="qr" size={17} stroke={2} /> Scan venue QR to check in</span></button>
          )}
        </div>
        <div className="h-6" />
      </div>
      <BottomNav messagesCount={msgCount} active="events" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

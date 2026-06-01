"use client";

import { useState } from "react";
import { C, EVENTS } from "../../lib/constants";
import type { HereEvent, Screen } from "../../lib/types";
import { Icon, categoryIcon } from "../ui/Icon";
import { Chip } from "../ui/Chip";
import { BottomNav } from "../ui/BottomNav";

function EventRow({ e, onNavigate }: { e: HereEvent; onNavigate: (s: Screen, d?: unknown) => void }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-colors"
      style={{ borderTop:`1px solid ${C.border}` }}
      onClick={()=>onNavigate("eventdetail",e.id)}
      onMouseEnter={ev=>((ev.currentTarget as HTMLDivElement).style.background="rgba(28,23,20,0.03)")}
      onMouseLeave={ev=>((ev.currentTarget as HTMLDivElement).style.background="transparent")}>
      <div className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center flex-shrink-0 text-white"
        style={{ background:`linear-gradient(145deg,${e.gradientFrom},${e.gradientTo})` }}>
        <Icon name={categoryIcon(e.category)} size={24} stroke={1.9} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] truncate" style={{ color:C.ink, fontWeight:600, letterSpacing:"-0.01em" }}>{e.name}</div>
        <div className="text-[12.5px] mt-0.5 truncate" style={{ color:C.warmMid }}>{e.venue} · {e.area}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color:C.green }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background:C.green }} />
            {e.members} here
          </span>
          <span className="text-[11px]" style={{ color:C.warmMid }}>· {e.time}</span>
          {e.sponsored && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background:C.accentSoft, color:C.accent }}>Sponsored</span>}
        </div>
      </div>
      <span style={{ color:C.warmMid, opacity:0.5 }}><Icon name="chevron" size={18} /></span>
    </div>
  );
}

export function EventsScreen({ onNavigate, inboxCount, msgCount }: { onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number }) {
  const [cat, setCat] = useState("all");
  const cats = ["all","music","art","food","comedy","fitness","dance","film"];
  const catLabels: Record<string,string> = { all:"All", music:"Live Music", art:"Art & Culture", food:"Food & Drink", comedy:"Comedy", fitness:"Fitness", dance:"Dance", film:"Film" };
  const tonight = EVENTS.filter(e=>e.section==="tonight"&&(cat==="all"||e.category===cat));
  const week    = EVENTS.filter(e=>e.section==="week"   &&(cat==="all"||e.category===cat));

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="flex justify-between items-center px-5 pt-5 pb-1 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[1.6px] font-bold" style={{ color:C.warmMid }}>
            <Icon name="pin" size={13} stroke={2} /> London
          </div>
          <div className="text-[26px] mt-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.035em", color:C.ink }}>Discover</div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background:"rgba(28,23,20,0.06)", color:C.ink }} aria-label="Search">
          <Icon name="search" size={20} />
        </button>
      </div>
      <div className="flex gap-2 px-5 pt-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth:"none" }}>
        {cats.map(c=><Chip key={c} label={catLabels[c]??c} active={cat===c} onClick={()=>setCat(c)} />)}
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        {tonight.length>0 && (<>
          <div className="px-5 pt-[18px] flex justify-between items-center">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Tonight near you</div>
            <div className="inline-flex items-center gap-0.5 text-[12px] font-semibold cursor-pointer" style={{ color:C.accent }}>See all<Icon name="chevron" size={13} stroke={2.2} /></div>
          </div>
          <div className="mt-2.5">{tonight.map(e=><EventRow key={e.id} e={e} onNavigate={onNavigate} />)}</div>
        </>)}
        {week.length>0 && (<>
          <div className="px-5 pt-[18px] flex justify-between items-center">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>This week</div>
            <div className="inline-flex items-center gap-0.5 text-[12px] font-semibold cursor-pointer" style={{ color:C.accent }}>See all<Icon name="chevron" size={13} stroke={2.2} /></div>
          </div>
          <div className="mt-2.5">{week.map(e=><EventRow key={e.id} e={e} onNavigate={onNavigate} />)}</div>
        </>)}
        <div className="h-2" />
      </div>
      <BottomNav messagesCount={msgCount} active="events" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

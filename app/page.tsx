"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ──────────────────────────────────────────────
const supabase = createClient(
  "https://rxpqlfxdsoduncihomta.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cHFsZnhkc29kdW5jaWhvbXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzcxMDcsImV4cCI6MjA4ODkxMzEwN30.NAhwFU4ydOML0MEaySHn4So20FjnMwPgQC4LUZwzYi8"
);

// ── Types ──────────────────────────────────────────────────
type Screen =
  | "splash" | "login" | "signup" | "onboarding"
  | "events" | "eventdetail" | "nearby" | "request"
  | "inbox"  | "incoming"    | "match" | "profile" | "pending";

type IncResponse  = "accept" | "15min" | "30min";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  occupation: string;
  interests: string[];
  languages: string[];          // spoken languages
  photo_url: string | null;   // uploaded photo
  bg: string;                  // fallback gradient colour
  open_to_meet: boolean;
  checked_in_event_id: number | null;
  checked_in_at: string | null;  // ISO timestamp – used for time-at-event
  lat: number | null;           // GPS latitude
  lng: number | null;           // GPS longitude
}

// NearbyUser extends UserProfile with client-side display fields
interface NearbyUser extends UserProfile {
  display_order: number;      // round-robin slot (0 = top)
  minutes_at_event: number;
}

interface HereEvent {
  id: number; emoji: string; gradientFrom: string; gradientTo: string;
  category: string; name: string; venue: string; area: string;
  meta: string; members: number; time: string;
  sponsored?: boolean; buyTicket?: boolean;
  section: "tonight" | "week"; desc: string;
}

interface InboxRequest {
  id: number; name: string; photo_url: string | null; bg: string;
  gender: "m" | "f"; meta: string; tags: string[];
  reqLabel: string; time: string; isNew: boolean;
  from_id?: string; hint?: string | null;
}

// ── Design tokens ──────────────────────────────────────────
const C = {
  cream: "#F5F0E8", ink: "#1A1410", inkSoft: "#3D3530",
  warmMid: "#8B7355", accent: "#C4783A", green: "#4A7C59",
  border: "rgba(139,115,85,0.2)",
};

// ── Static data ────────────────────────────────────────────
const EVENTS: HereEvent[] = [
  // ── TONIGHT ───────────────────────────────────────────────────────────────
  { id:0,  emoji:"🎻", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"music",   name:"LSO — An Evening of Brahms",               venue:"Barbican Centre",          area:"Barbican",         meta:"Tonight 7:30pm · from £35",       members:34, time:"7:30pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"The LSO performs Brahms' Symphony No. 4 and Piano Concerto No. 1. One of London's finest concert series — a full house and an electric atmosphere." },
  { id:1,  emoji:"🍷", gradientFrom:"#1a2535", gradientTo:"#243045", category:"food",    name:"Terroirs Natural Wine Evening",            venue:"Terroirs Wine Bar",         area:"Strand",           meta:"Tonight · until 11pm · Free",     members:27, time:"Until 11pm", sponsored:false, buyTicket:false, section:"tonight", desc:"The best natural wine bar in London — an evening of exceptional low-intervention wines poured at the bar." },
  { id:2,  emoji:"🎨", gradientFrom:"#1e1a30", gradientTo:"#2d1e3a", category:"art",     name:"Tate Modern Late — After Hours",           venue:"Tate Modern",               area:"Bankside",         meta:"Tonight until 10pm · £12",        members:42, time:"Until 10pm", sponsored:false, buyTicket:true,  section:"tonight", desc:"After-hours access to the Tate galleries with a live DJ set and the riverside bar open late." },
  { id:3,  emoji:"🎷", gradientFrom:"#182a1e", gradientTo:"#223828", category:"music",   name:"Jazz at Ronnie Scott's",                   venue:"Ronnie Scott's",            area:"Soho",             meta:"Tonight 9:30pm · from £30",       members:38, time:"9:30pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"The world-famous jazz club. Tonight's late set features some of London's finest musicians — standing room only." },
  { id:4,  emoji:"💃", gradientFrom:"#2a1035", gradientTo:"#4a1060", category:"dance",   name:"Bachata Social Night",                     venue:"Café Salsa",                area:"Covent Garden",    meta:"Tonight 9pm–2am · £10",           members:31, time:"9pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"London's most popular bachata social. All levels welcome — the dance floor does the introducing." },
  { id:5,  emoji:"😂", gradientFrom:"#2a1a10", gradientTo:"#3a2810", category:"comedy",  name:"Comedy Store — Late Show",                 venue:"The Comedy Store",          area:"Leicester Square", meta:"Tonight 9:45pm · from £16",       members:29, time:"9:45pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"London's most iconic comedy club. Tonight's late show brings the UK's best stand-up talent to one stage." },
  { id:6,  emoji:"🍜", gradientFrom:"#2a1208", gradientTo:"#3a2010", category:"food",    name:"Maltby Street Market — Evening Edition",   venue:"Maltby Street",             area:"Bermondsey",       meta:"Tonight 5pm–10pm · Free",         members:37, time:"5pm–10pm",   sponsored:false, buyTicket:false, section:"tonight", desc:"Over 30 of London's best street food traders in the arches under London Bridge — an evening edition." },
  { id:7,  emoji:"🎬", gradientFrom:"#10101a", gradientTo:"#1a1a2a", category:"film",    name:"Rooftop Cinema Club — Brief Encounter",    venue:"Roof East",                 area:"Stratford",        meta:"Tonight 8pm · £19",               members:33, time:"8pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"Classic British romance under the stars on Roof East's open-air screen. Blankets provided." },
  { id:8,  emoji:"🏃", gradientFrom:"#1a2a1a", gradientTo:"#243824", category:"fitness", name:"Run Dem Crew — Thursday Run",              venue:"Regent's Park",             area:"Regent's Park",    meta:"Tonight 6:30pm · Free",           members:22, time:"6:30pm",     sponsored:false, buyTicket:false, section:"tonight", desc:"London's most sociable running crew. 5k through Regent's Park, all paces welcome — drinks after at the pub." },
  { id:9,  emoji:"🥊", gradientFrom:"#2a1010", gradientTo:"#3a1818", category:"fitness", name:"BXR London — Boxing Evening Class",        venue:"BXR London",                area:"Marylebone",       meta:"Tonight 7pm · £25",               members:18, time:"7pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"London's best boxing gym runs an open evening class. Gloves provided. All fitness levels — come prepared to work." },
  { id:10, emoji:"🎵", gradientFrom:"#1a1028", gradientTo:"#2a1838", category:"music",   name:"Electric Brixton — Club Night",            venue:"Electric Brixton",          area:"Brixton",          meta:"Tonight 10pm · £15",              members:51, time:"10pm",       sponsored:true,  buyTicket:true,  section:"tonight", desc:"One of London's best live music venues. Tonight's resident DJs play disco, house, and soul until 4am." },

  // ── THIS WEEK ─────────────────────────────────────────────────────────────
  { id:11, emoji:"🎭", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"art",     name:"ENO — La Traviata Opening Night",          venue:"London Coliseum",           area:"West End",         meta:"Friday 8pm · from £25",           members:25, time:"Fri 8pm",    sponsored:true,  buyTicket:true,  section:"week",    desc:"English National Opera's acclaimed new production of Verdi's La Traviata. Opening night." },
  { id:12, emoji:"🖼️", gradientFrom:"#1a2535", gradientTo:"#243045", category:"art",     name:"National Portrait Gallery Members Evening",venue:"NPG",                       area:"St Martin's Place",meta:"Thursday 6:30pm · Members free",  members:29, time:"Thu 6:30pm", sponsored:false, buyTicket:false, section:"week",    desc:"Exclusive after-hours access to the galleries with wine and live music." },
  { id:13, emoji:"🌿", gradientFrom:"#182a1e", gradientTo:"#223828", category:"food",    name:"Borough Market — After Dark",              venue:"Borough Market",            area:"Borough",          meta:"Saturday 6pm · Free",             members:46, time:"Sat 6pm",    sponsored:false, buyTicket:false, section:"week",    desc:"London's most celebrated food market stays open late with evening-only traders and street food." },
  { id:14, emoji:"🎸", gradientFrom:"#1a1020", gradientTo:"#281830", category:"music",   name:"Moth Club — Indie Night",                  venue:"Moth Club",                 area:"Hackney",          meta:"Friday 9pm · £12",                members:28, time:"Fri 9pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"Hackney's best-kept secret. Indie and alternative DJ sets in the most characterful venue in East London." },
  { id:15, emoji:"🧗", gradientFrom:"#1a1010", gradientTo:"#282010", category:"fitness", name:"Castle Climbing — Evening Session",        venue:"Castle Climbing Centre",    area:"Stoke Newington",  meta:"Thursday 6pm · £18",              members:17, time:"Thu 6pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"One of London's most celebrated climbing walls. Evening sessions are open to all abilities — shoes for hire." },
  { id:16, emoji:"🍳", gradientFrom:"#2a1808", gradientTo:"#3a2010", category:"food",    name:"Ottolenghi — Saturday Masterclass",        venue:"Ottolenghi NOPI",           area:"Soho",             meta:"Saturday 11am · £95",             members:12, time:"Sat 11am",   sponsored:true,  buyTicket:true,  section:"week",    desc:"A hands-on morning with Ottolenghi's chefs. Learn four signature dishes, then sit down together to eat them." },
  { id:17, emoji:"🎤", gradientFrom:"#1a0a28", gradientTo:"#2a1038", category:"comedy",  name:"Soho Theatre — Stand-Up Night",            venue:"Soho Theatre",              area:"Soho",             meta:"Wednesday 8pm · £15",             members:21, time:"Wed 8pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"The most respected comedy venue in London. Tonight's bill features three rising stand-ups at the top of their game." },
  { id:18, emoji:"🚣", gradientFrom:"#0a1a2a", gradientTo:"#102030", category:"fitness", name:"Paddleboarding on the Thames",             venue:"Thames Paddle Co.",         area:"Richmond",         meta:"Sunday 10am · £35",               members:16, time:"Sun 10am",   sponsored:false, buyTicket:true,  section:"week",    desc:"Guided paddleboard session on the Thames at Richmond. Equipment and full instruction included. Beginners welcome." },
  { id:19, emoji:"🌅", gradientFrom:"#1a1410", gradientTo:"#2a2018", category:"food",    name:"Skylight Rooftop Bar — Sunset Session",    venue:"Skylight Tobacco Dock",     area:"Wapping",          meta:"Saturday 5pm · Free entry",       members:39, time:"Sat 5pm",    sponsored:false, buyTicket:false, section:"week",    desc:"London's most loved rooftop bar and games space. Cocktails, croquet, and a view of the city at golden hour." },
  { id:20, emoji:"🏊", gradientFrom:"#0a1a28", gradientTo:"#101e30", category:"fitness", name:"London Fields Lido — Social Swim",         venue:"London Fields Lido",        area:"Hackney",          meta:"Sunday 8am · £5",                 members:23, time:"Sun 8am",    sponsored:false, buyTicket:true,  section:"week",    desc:"The heated outdoor lido at London Fields. Sunday morning swims followed by coffee and pastries at the poolside café." },
  { id:21, emoji:"📖", gradientFrom:"#1a1818", gradientTo:"#282020", category:"art",     name:"Waterstones — Author Reading & Q&A",       venue:"Waterstones Piccadilly",    area:"Piccadilly",       meta:"Tuesday 7pm · £10",               members:14, time:"Tue 7pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"The world's largest bookshop hosts an evening reading and Q&A with one of this year's most talked-about authors." },
  { id:22, emoji:"🎻", gradientFrom:"#1e1a30", gradientTo:"#2e1a40", category:"music",   name:"Wigmore Hall — Piano Recital",             venue:"Wigmore Hall",              area:"Marylebone",       meta:"Thursday 7:30pm · from £18",      members:19, time:"Thu 7:30pm", sponsored:false, buyTicket:true,  section:"week",    desc:"The finest chamber music venue in the world. This Thursday's recital features a rising pianist performing Schubert." },
  { id:23, emoji:"🏃", gradientFrom:"#182a18", gradientTo:"#223820", category:"fitness", name:"Parkrun — Victoria Park",                  venue:"Victoria Park",             area:"Hackney",          meta:"Saturday 9am · Free",             members:31, time:"Sat 9am",    sponsored:false, buyTicket:false, section:"week",    desc:"The world's largest free weekly run. 5k around Victoria Park — all paces welcome, no registration needed on the day." },
];

// 18 interests — each user picks up to 3
const INTERESTS: { id: string; emoji: string; label: string }[] = [
  { id:"art",           emoji:"", label:"Art"           },
  { id:"comedy",        emoji:"", label:"Comedy"        },
  { id:"cooking",       emoji:"", label:"Cooking"       },
  { id:"fashion",       emoji:"", label:"Fashion"       },
  { id:"film",          emoji:"", label:"Film"          },
  { id:"fitness",       emoji:"", label:"Fitness"       },
  { id:"food",          emoji:"", label:"Food"          },
  { id:"gaming",        emoji:"", label:"Gaming"        },
  { id:"hiking",        emoji:"", label:"Hiking"        },
  { id:"museums",       emoji:"", label:"Museums"       },
  { id:"music",         emoji:"", label:"Music"         },
  { id:"photography",   emoji:"", label:"Photography"   },
  { id:"podcasts",      emoji:"", label:"Podcasts"      },
  { id:"racket_sports", emoji:"", label:"Racket Sports" },
  { id:"reading",       emoji:"", label:"Reading"       },
  { id:"team_sports",   emoji:"", label:"Team Sports"   },
  { id:"tech",          emoji:"", label:"Tech"          },
  { id:"theatre",       emoji:"", label:"Theatre"       },
  { id:"travel",        emoji:"", label:"Travel"        },
  { id:"wine",          emoji:"", label:"Wine"          },
];

const MAX_INTERESTS = 3;

const LANGUAGES = [
  "Arabic","Bengali","Cantonese","Czech","Danish","Dutch","English","Finnish",
  "French","German","Greek","Hebrew","Hindi","Hungarian","Italian","Japanese",
  "Korean","Malay","Mandarin","Norwegian","Persian","Polish","Portuguese",
  "Romanian","Russian","Spanish","Swahili","Swedish","Thai","Turkish","Urdu","Vietnamese",
];

const BG_OPTIONS = [
  "linear-gradient(160deg,#d4a5a5,#c47a6b)",
  "linear-gradient(160deg,#a5c4d4,#6b8fc4)",
  "linear-gradient(160deg,#a5d4b5,#6ba87c)",
  "linear-gradient(160deg,#d4c4a5,#c4a06b)",
  "linear-gradient(160deg,#c4a5d4,#8f6bc4)",
  "linear-gradient(160deg,#d4d4a5,#c4c46b)",
];

const INTEREST_STYLE: Record<string, { background: string; color: string }> = {
  art:          { background:"rgba(60,120,160,0.1)",    color:"#3C78A0" },
  comedy:       { background:"rgba(220,160,40,0.12)",   color:"#b08010" },
  cooking:      { background:"rgba(196,140,40,0.12)",   color:"#c48c28" },
  fashion:      { background:"rgba(200,80,120,0.1)",    color:"#c85078" },
  film:         { background:"rgba(160,100,40,0.12)",   color:"#a06428" },
  fitness:      { background:"rgba(80,140,80,0.12)",    color:"#3a8a3a" },
  food:         { background:"rgba(196,120,58,0.12)",   color:"#C4783A" },
  gaming:       { background:"rgba(40,140,180,0.1)",    color:"#288cb4" },
  hiking:       { background:"rgba(60,160,80,0.1)",     color:"#3a9a50" },
  museums:      { background:"rgba(100,80,60,0.1)",     color:"#64503c" },
  music:        { background:"rgba(100,80,160,0.1)",    color:"#6450A0" },
  photography:  { background:"rgba(40,100,160,0.1)",    color:"#2864A0" },
  podcasts:     { background:"rgba(140,60,200,0.1)",    color:"#8c3cc8" },
  reading:      { background:"rgba(80,80,80,0.1)",      color:"#505050" },
  tech:         { background:"rgba(60,80,180,0.1)",     color:"#3c50b4" },
  theatre:      { background:"rgba(120,40,120,0.1)",    color:"#782878" },
  travel:       { background:"rgba(60,160,120,0.1)",    color:"#3CA078" },
  wine:         { background:"rgba(160,60,80,0.1)",     color:"#A03C50" },
  racket_sports: { background:"rgba(58,140,196,0.12)",   color:"#3a8cc4" },
  team_sports:   { background:"rgba(58,100,196,0.12)",   color:"#3a60c4" },
  // legacy aliases so old profiles still render
  gym:          { background:"rgba(80,140,80,0.12)",    color:"#3a8a3a" },
  movies:       { background:"rgba(160,100,40,0.12)",   color:"#a06428" },
  sports:       { background:"rgba(58,100,196,0.12)",   color:"#3a60c4" },
  dance:        { background:"rgba(196,58,160,0.1)",    color:"#c43aa0" },
  architecture: { background:"rgba(100,80,60,0.1)",     color:"#64503c" },
  volunteering: { background:"rgba(60,160,100,0.1)",    color:"#3ca064" },
};

// No dummy inbox — all requests come from Supabase

// ── Round-robin rotation ───────────────────────────────────
// Every ROTATION_MS we advance the top slot by 1, giving each person
// equal time at the most-visible position.  No scores, no popularity.
const ROTATION_MS = 30_000;

function applyRoundRobin(users: UserProfile[], offset: number): NearbyUser[] {
  if (!users.length) return [];
  // Base order: earliest check-in first (proxy for proximity when no GPS)
  const base = [...users].sort((a, b) => {
    const ta = a.checked_in_at ? +new Date(a.checked_in_at) : Date.now();
    const tb = b.checked_in_at ? +new Date(b.checked_in_at) : Date.now();
    return ta - tb;
  });
  const n = base.length;
  return base
    .map((u, i) => ({
      ...u,
      display_order: (i - offset + n) % n,
      minutes_at_event: u.checked_in_at
        ? Math.max(0, Math.floor((Date.now() - +new Date(u.checked_in_at)) / 60_000))
        : 0,
    }))
    .sort((a, b) => a.display_order - b.display_order);
}

function timeAtEventLabel(mins: number) {
  if (mins < 1)  return "";
  if (mins < 60) return `${mins}m here`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m here` : `${h}h here`;
}

// ── Shared UI atoms ────────────────────────────────────────

/** Shows uploaded photo or a gradient-initial fallback — round */
function AvatarCircle({
  user, size = 52,
}: { user: { photo_url?: string | null; bg: string; name: string }; size?: number }) {
  const initial = user.name?.[0]?.toUpperCase() ?? "?";
  if (user.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: user.bg, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

/** Shows photo or gradient initial — fills a rectangular container */
function AvatarFill({
  user,
}: { user: { photo_url?: string | null; bg: string; name: string } }) {
  const initial = user.name?.[0]?.toUpperCase() ?? "?";
  if (user.photo_url) {
    return <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center font-bold text-white text-5xl" style={{ background: user.bg }}>
      {initial}
    </div>
  );
}

function InterestTag({ interest }: { interest: string }) {
  const s    = INTEREST_STYLE[interest] ?? { background: "rgba(139,115,85,0.1)", color: C.inkSoft };
  const meta = INTERESTS.find(i => i.id === interest);
  const display = meta ? meta.label : interest;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={s}>{display}</span>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all duration-200 flex-shrink-0"
      style={{
        border: `1px solid ${active ? C.ink : C.border}`,
        background: active ? C.ink : "transparent",
        color: active ? C.cream : C.inkSoft,
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function BackBtn({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center text-base cursor-pointer flex-shrink-0 border-0"
      style={{ background: dark ? "rgba(245,240,232,0.1)" : "rgba(139,115,85,0.14)", color: dark ? C.cream : C.ink }}
    >←</button>
  );
}

type NavTab = "events" | "nearby" | "inbox" | "profile";
function BottomNav({
  active, onNavigate, dark, inboxCount,
}: { active: NavTab; onNavigate: (s: Screen) => void; dark?: boolean; inboxCount?: number }) {
  const items: { id: NavTab; dest: Screen; icon: string; label: string }[] = [
    { id:"events",  dest:"events",  icon:"🎭", label:"Events"   },
    { id:"nearby",  dest:"nearby",  icon:"📡", label:"Nearby"   },
    { id:"inbox",   dest:"inbox",   icon:"💬", label:"Requests" },
    { id:"profile", dest:"profile", icon:"👤", label:"Profile"  },
  ];
  return (
    <div
      className="h-20 flex items-center justify-around px-2 pb-3 flex-shrink-0"
      style={{ background: dark ? C.ink : C.cream, borderTop: `1px solid ${dark ? "rgba(245,240,232,0.08)" : C.border}` }}
    >
      {items.map((item) => {
        const on = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.dest)}
            className="flex flex-col items-center gap-[3px] px-2.5 py-[5px] rounded-xl border-0 bg-transparent cursor-pointer relative"
          >
            <span className="text-xl" style={{ opacity: on ? 1 : 0.38 }}>{item.icon}</span>
            <span className="text-[10px] font-medium" style={{ color: on ? (dark ? C.cream : C.ink) : (dark ? "rgba(245,240,232,0.4)" : C.warmMid), opacity: on ? 1 : 0.55 }}>
              {item.label}
            </span>
            {item.id === "inbox" && (inboxCount ?? 0) > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: C.accent }}>
                {inboxCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SCREENS
// ══════════════════════════════════════════════════════════

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: C.ink }}>
      <div className="text-[64px] mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>✦</div>
      <div className="text-[40px] font-light tracking-tight" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color: C.cream }}>here.</div>
      <div className="text-sm mt-3" style={{ color: "rgba(245,240,232,0.45)" }}>Meet in the moment</div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────
function LoginScreen({ onNavigate, onLogin }: { onNavigate:(s:Screen)=>void; onLogin:(u:UserProfile)=>void }) {
  const [email, setEmail]       = useState("");
  const [password, setPass]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handle() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setLoading(false);
      if (!profile) onNavigate("onboarding"); else onLogin(profile as UserProfile);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address above first"); return; }
    setResetLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setResetLoading(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'DM Sans',sans-serif" };

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div className="text-[36px] mb-2" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>here.</div>
        <div className="text-sm mb-10" style={{ color:"rgba(245,240,232,0.45)" }}>Meet in the moment</div>
        <div className="w-full space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" className={inp} style={inpStyle} />
          {/* Password with show/hide */}
          <div className="relative">
            <input value={password} onChange={e=>setPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Password"
              className={inp} style={{ ...inpStyle, paddingRight:48 }}
              onKeyDown={e=>e.key==="Enter"&&handle()} />
            <button onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-xs font-medium"
              style={{ color:"rgba(245,240,232,0.45)", fontFamily:"'DM Sans',sans-serif" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          {/* Show password checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color:"rgba(245,240,232,0.5)", fontSize:13 }}>
            <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-[#C4783A]" />
            Show password
          </label>
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          {resetSent && (
            <div className="text-xs text-center leading-relaxed p-3 rounded-xl" style={{ background:"rgba(74,124,89,0.15)", color:"rgba(232,245,238,0.8)" }}>
              Password reset email sent. Check your inbox and follow the link to set a new password.
            </div>
          )}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <button onClick={handleForgotPassword} disabled={resetLoading} className="w-full text-center text-sm border-0 bg-transparent cursor-pointer py-1" style={{ color:"rgba(245,240,232,0.4)", fontFamily:"'DM Sans',sans-serif" }}>
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
        </div>
        <div className="mt-4 text-sm" style={{ color:"rgba(245,240,232,0.45)" }}>
          New here?{" "}
          <button onClick={()=>onNavigate("signup")} className="border-0 bg-transparent cursor-pointer font-semibold" style={{ color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>Create account</button>
        </div>
      </div>
    </div>
  );
}

// ── Sign-up ────────────────────────────────────────────────
function SignupScreen({ onNavigate }: { onNavigate:(s:Screen)=>void }) {
  const [email,     setEmail]   = useState("");
  const [pass,      setPass]    = useState("");
  const [confirm,   setConfirm] = useState("");
  const [showPass,  setShowPass]= useState(false);
  const [error,     setError]   = useState("");
  const [loading,   setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false); // shown after sign-up email sent

  async function handle() {
    if (!email||!pass)          { setError("Please fill in all fields"); return; }
    if (pass!==confirm)         { setError("Passwords don't match"); return; }
    if (pass.length<6)          { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const { data, error:err } = await supabase.auth.signUp({ email, password:pass });
    if (err) { setError(err.message); setLoading(false); return; }
    setLoading(false);
    // If email confirmation is enabled, user.identities will be populated but
    // session will be null — show the confirm-your-email screen.
    // If confirmation is disabled, sign in immediately and proceed to onboarding.
    if (!data.session) {
      setConfirmed(true);
      return;
    }
    onNavigate("onboarding");
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'DM Sans',sans-serif" };

  // ── Email confirmation sent screen ──
  if (confirmed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8" style={{ background:C.ink }}>
        <div className="text-[48px] mb-5">📬</div>
        <div className="text-[26px] text-center leading-snug mb-3" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>
          Check your inbox
        </div>
        <div className="text-sm text-center leading-relaxed mb-8" style={{ color:"rgba(245,240,232,0.55)" }}>
          We sent a confirmation link to <strong style={{ color:C.cream }}>{email}</strong>. Open it to verify your account, then come back and sign in.
        </div>
        <button onClick={()=>onNavigate("login")}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
          style={{ background:C.accent, fontFamily:"'DM Sans',sans-serif" }}>
          Go to sign in
        </button>
        <div className="mt-4 text-xs text-center leading-relaxed" style={{ color:"rgba(245,240,232,0.3)" }}>
          Didn&apos;t receive it? Check your spam folder or try signing up again.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col px-8 pt-14 pb-8">
        <div className="mb-8">
          <div className="text-[28px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>Create account</div>
          <div className="text-sm mt-1.5" style={{ color:"rgba(245,240,232,0.45)" }}>Join here. and meet people around you</div>
        </div>
        <div className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" className={inp} style={inpStyle} />
          {/* Password */}
          <div className="relative">
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Password (min 6 chars)"
              className={inp} style={{ ...inpStyle, paddingRight:48 }} />
            <button onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-xs font-medium"
              style={{ color:"rgba(245,240,232,0.45)", fontFamily:"'DM Sans',sans-serif" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          {/* Confirm password */}
          <div className="relative">
            <input value={confirm} onChange={e=>setConfirm(e.target.value)}
              type={showPass ? "text" : "password"} placeholder="Confirm password"
              className={inp} style={{ ...inpStyle, paddingRight:48 }}
              onKeyDown={e=>e.key==="Enter"&&handle()} />
          </div>
          {/* Show password checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color:"rgba(245,240,232,0.5)", fontSize:13 }}>
            <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-[#C4783A]" />
            Show password
          </label>
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </div>
        <div className="mt-6 text-sm text-center" style={{ color:"rgba(245,240,232,0.45)" }}>
          Already have an account?{" "}
          <button onClick={()=>onNavigate("login")} className="border-0 bg-transparent cursor-pointer font-semibold" style={{ color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding — 4 steps ───────────────────────────────────
function OnboardingScreen({ onDone }: { onDone:(p:UserProfile)=>void }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState("");
  const [age,  setAge]            = useState("");
  const [occ,  setOcc]            = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [langInput,  setLangInput] = useState("");
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [photoPreview, setPreview]= useState<string|null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef                   = useRef<HTMLInputElement>(null);
  const bg = BG_OPTIONS[Math.floor(Math.random() * BG_OPTIONS.length)];

  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(x=>x!==lang) : [...prev, lang]);
  }
  const filteredLangs = LANGUAGES.filter(l =>
    l.toLowerCase().includes(langInput.toLowerCase()) && !languages.includes(l)
  );
  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(x=>x!==id) : prev.length<MAX_INTERESTS ? [...prev,id] : prev);
  }
  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5*1024*1024) { setError("Photo must be under 5 MB"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError("");
  }
  async function finish() {
    if (!interests.length) { setError("Pick at least one interest"); return; }
    setLoading(true); setError("");

    // Safety timeout — if saving takes more than 12 seconds, show an error
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Saving is taking too long. Please check your connection and try again.");
    }, 12_000);

    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { clearTimeout(timeout); setError("Not logged in — please go back and sign in again."); setLoading(false); return; }

      let photo_url: string|null = null;
      if (photoFile) {
        const ext  = photoFile.name.split(".").pop() ?? "jpg";
        const path = `avatars/${user.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) { clearTimeout(timeout); setError("Photo upload failed: " + upErr.message); setLoading(false); return; }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        photo_url = urlData.publicUrl + `?v=${Date.now()}`;
        localStorage.setItem(`selfie_date_${user.id}`, new Date().toDateString());
      }

      const profile: UserProfile = {
        id: user.id, email: user.email ?? "", name, age: parseInt(age),
        occupation: occ, interests, languages: languages ?? [], photo_url, bg,
        open_to_meet: false, checked_in_event_id: null, checked_in_at: null, lat: null, lng: null,
      };

      const { error: dbErr } = await supabase.from("profiles").upsert(profile);
      clearTimeout(timeout);
      if (dbErr) { setError("Could not save profile: " + dbErr.message); setLoading(false); return; }
      setLoading(false);
      onDone(profile);
    } catch (e: any) {
      clearTimeout(timeout);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
  const canStep1 = name.trim() && age && parseInt(age)>=18 && occ.trim();

  return (
    <div className="flex flex-col" style={{ background: C.cream, height:"100vh", overflow:"hidden" }}>
      {/* Progress bar — 4 steps */}
      <div className="px-6 pt-10 flex-shrink-0">
        <div className="flex gap-1.5 mb-1">
          {[1,2,3,4].map(s=>(
            <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: s<=step ? C.accent : "rgba(139,115,85,0.2)" }} />
          ))}
        </div>
        <div className="text-[11px] mt-2 mb-3" style={{ color:C.warmMid }}>Step {step} of 4</div>
      </div>

      {/* ─── Step 1: Photo + basics ─── */}
      {step===1 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-3 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>About you</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>This is what others will see</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>Today's Photo</div>
              <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed" style={{ background:"rgba(196,120,58,0.07)", border:`1px solid rgba(196,120,58,0.18)`, color:C.inkSoft }}>
                <strong style={{ color:C.ink }}>here.</strong> is built for same-day, same-place connections. Your profile photo must be taken daily to accurately represent how you look today. A green tick next to a profile photo indicates the photo has been updated today.
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center relative"
                  style={{ background: photoPreview ? "transparent" : "rgba(139,115,85,0.1)", border:`2px solid ${photoPreview ? C.green : C.border}` }}>
                  {photoPreview
                    ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                    : <span className="text-2xl opacity-30">📷</span>}
                  {photoPreview && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background:C.green, color:"white", border:"2px solid white" }}>✓</div>
                  )}
                </div>
                <div className="flex-1">
                  <button onClick={()=>fileRef.current?.click()}
                    className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer border-0"
                    style={{ background: photoPreview ? "rgba(74,124,89,0.12)" : C.ink, color: photoPreview ? C.green : C.cream, fontFamily:"'DM Sans',sans-serif" }}>
                    {photoPreview ? "Retake photo" : "Take photo now"}
                  </button>
                  <div className="text-[11px] mt-1.5" style={{ color:C.warmMid }}>
                    {photoPreview ? "Looks good — retake if needed" : "Opens your camera"}
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={pickPhoto} />
            </div>
            <div className="space-y-3 mb-3">
              {([
                { label:"First name", val:name, set:setName, placeholder:"e.g. Sophie", type:"text" },
                { label:"Age",        val:age,  set:setAge,  placeholder:"e.g. 26",     type:"number" },
                { label:"Occupation", val:occ,  set:setOcc,  placeholder:"e.g. Architect", type:"text" },
              ] as { label:string; val:string; set:(v:string)=>void; placeholder:string; type:string }[]).map(({ label,val,set,placeholder,type }) => (
                <div key={label}>
                  <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.warmMid }}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type={type} placeholder={placeholder} min={type==="number"?"18":undefined}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'DM Sans',sans-serif" }} />
                </div>
              ))}
            </div>
            {error && <div className="text-xs mb-3 text-center" style={{ color:"#ef4444" }}>{error}</div>}
            <div style={{ height:8 }} />
          </div>
          <button onClick={()=>canStep1&&setStep(2)} disabled={!canStep1}
            className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity flex-shrink-0"
            style={{ background:C.accent, opacity:canStep1?1:0.4, fontFamily:"'DM Sans',sans-serif", marginTop:12 }}>
            Next
          </button>
        </div>
      )}

      {/* ─── Step 2: Interests ─── */}
      {step===2 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-2 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Your interests</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Pick up to {MAX_INTERESTS} — shown as conversation starters</div>
          </div>
          <div className="mb-2 p-3 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(196,120,58,0.07)", color:C.inkSoft, border:`1px solid rgba(196,120,58,0.15)` }}>
            These tags don't affect who sees you or in what order — purely for starting conversations.
          </div>
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <div className="text-xs font-semibold" style={{ color:C.inkSoft }}>
              {interests.length === MAX_INTERESTS
                ? <span style={{ color:C.green }}>{MAX_INTERESTS} selected</span>
                : <span style={{ color:C.warmMid }}>{interests.length} / {MAX_INTERESTS}</span>}
            </div>
            {interests.length > 0 && (
              <button onClick={()=>setInterests([])} className="text-xs border-0 bg-transparent cursor-pointer" style={{ color:C.warmMid, fontFamily:"'DM Sans',sans-serif" }}>Clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 overflow-y-auto flex-1" style={{ minHeight:0 }}>
            {INTERESTS.map(item => {
              const on = interests.includes(item.id);
              const maxed = !on && interests.length >= MAX_INTERESTS;
              return (
                <button key={item.id} onClick={()=>{ if (!maxed) toggleInterest(item.id); }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border"
                  style={{ background:on?C.ink:maxed?"rgba(139,115,85,0.04)":"white", borderColor:on?C.ink:maxed?"rgba(139,115,85,0.1)":C.border, color:on?C.cream:maxed?"rgba(139,115,85,0.28)":C.inkSoft, cursor:maxed?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", opacity:maxed?0.55:1, alignSelf:"flex-start" }}>
                  {item.label}
                </button>
              );
            })}
          </div>
          {error && <div className="text-xs mt-2 text-center flex-shrink-0" style={{ color:"#ef4444" }}>{error}</div>}
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(1)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'DM Sans',sans-serif" }}>Back</button>
            <button onClick={()=>interests.length>0&&setStep(3)} disabled={!interests.length}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.accent, opacity:interests.length?1:0.4, fontFamily:"'DM Sans',sans-serif" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Languages ─── */}
      {step===3 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-2 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Languages you speak</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Helps others know they can approach you</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {languages.map(l => (
                  <span key={l} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background:C.ink, color:C.cream, fontFamily:"'DM Sans',sans-serif" }}>
                    {l}
                    <button onClick={()=>toggleLanguage(l)} className="border-0 bg-transparent cursor-pointer" style={{ color:"rgba(245,240,232,0.55)", fontSize:14, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <input value={langInput} onChange={e=>setLangInput(e.target.value)}
              placeholder="Search languages…"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-2"
              style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'DM Sans',sans-serif" }} />
            <div className="rounded-2xl overflow-hidden" style={{ border:`1px solid ${C.border}`, maxHeight:300, overflowY:"auto" }}>
              {filteredLangs.slice(0,25).map((l,idx) => (
                <button key={l} onClick={()=>{ toggleLanguage(l); setLangInput(""); }}
                  className="w-full px-4 py-3 text-left text-sm cursor-pointer border-0"
                  style={{ background:idx%2===0?"white":"rgba(245,240,232,0.5)", color:C.ink, fontFamily:"'DM Sans',sans-serif", borderBottom:`1px solid ${C.border}`, display:"block" }}>
                  {l}
                </button>
              ))}
              {filteredLangs.length===0 && <div className="px-4 py-3 text-sm" style={{ color:C.warmMid }}>No matches</div>}
            </div>
            <div style={{ height:8 }} />
          </div>
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(2)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'DM Sans',sans-serif" }}>Back</button>
            <button onClick={()=>setStep(4)}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
              style={{ background:C.accent, fontFamily:"'DM Sans',sans-serif" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Preview ─── */}
      {step===4 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            <div className="mb-4">
              <div className="text-[22px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>You're all set</div>
              <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Here's how others will see your card</div>
            </div>
            <div className="rounded-[20px] overflow-hidden mb-4" style={{ boxShadow:"0 4px 24px rgba(26,20,16,0.12)", border:`2px solid ${C.green}`, maxWidth:180, alignSelf:"center", width:"100%" }}>
              <div className="h-44 relative overflow-hidden">
                {photoPreview
                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-white text-6xl" style={{ background:bg }}>{name[0]?.toUpperCase()}</div>}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background:C.green }}>Active</div>
                {photoPreview && <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold" style={{ color:C.green, boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}>✓</div>}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] font-semibold text-white text-center"
                  style={{ background:"linear-gradient(to top,rgba(26,20,16,0.75),transparent)" }}>Just arrived</div>
              </div>
              <div className="px-3 pt-2 pb-1 bg-white">
                <div className="font-semibold text-sm" style={{ color:C.ink }}>{name||"Your name"}, {age||"??"}</div>
                <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>{occ||"Occupation"}</div>
              </div>
              <div className="px-3 pb-2 bg-white flex flex-wrap gap-1">
                {interests.map(i=><InterestTag key={i} interest={i} />)}
              </div>
              {languages.length > 0 && (
                <div className="px-3 pb-3 bg-white">
                  <div className="text-[10px] font-semibold mb-1" style={{ color:C.warmMid }}>Speaks</div>
                  <div className="flex flex-wrap gap-1">
                    {languages.map(l=><span key={l} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background:"rgba(139,115,85,0.1)", color:C.inkSoft }}>{l}</span>)}
                  </div>
                </div>
              )}
            </div>
            {error && <div className="text-xs mb-3 text-center" style={{ color:"#ef4444" }}>{error}</div>}
            <div style={{ height:8 }} />
          </div>
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(3)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'DM Sans',sans-serif" }}>Back</button>
            <button onClick={finish} disabled={loading}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.green, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
              {loading ? "Saving…" : "Enter here."}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Events ─────────────────────────────────────────────────
function EventsScreen({ onNavigate, inboxCount }: { onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number }) {
  const [cat, setCat] = useState("all");
  const cats = ["all","music","art","food","comedy","fitness","dance","film"];
  const catLabels: Record<string,string> = { all:"All", music:"Live Music", art:"Art & Culture", food:"Food & Drink", comedy:"Comedy", fitness:"Fitness", dance:"Dance", film:"Film" };
  const hero    = EVENTS[0];
  const heroVis = cat==="all" || hero.category===cat;
  const tonight = EVENTS.filter(e=>e.section==="tonight"&&(cat==="all"||e.category===cat));
  const week    = EVENTS.filter(e=>e.section==="week"   &&(cat==="all"||e.category===cat));

  function EventRow({ e }: { e:HereEvent }) {
    return (
      <div className="flex items-center gap-3.5 px-5 py-3 cursor-pointer"
        style={{ borderTop:`1px solid ${C.border}` }}
        onClick={()=>onNavigate("eventdetail",e.id)}
        onMouseEnter={ev=>((ev.currentTarget as HTMLDivElement).style.background="rgba(139,115,85,0.05)")}
        onMouseLeave={ev=>((ev.currentTarget as HTMLDivElement).style.background="transparent")}>
        <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
          style={{ background:`linear-gradient(135deg,${e.gradientFrom},${e.gradientTo})` }}>{e.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color:C.ink }}>{e.name}</div>
          <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{e.venue} · {e.area}</div>
          {e.buyTicket && <div className="text-xs mt-0.5 font-semibold" style={{ color:C.accent }}>Buy ticket here</div>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="text-[11px] font-semibold" style={{ color:C.green }}>{e.members} members</div>
          <div className="text-[11px]" style={{ color:C.warmMid }}>{e.time}</div>
          {e.sponsored && <div className="text-[10px] font-semibold" style={{ color:C.accent }}>Sponsored</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="flex justify-between items-end px-5 pt-4 pb-0 flex-shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>London </div>
          <div className="text-[22px] mt-0.5" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Discover Events</div>
        </div>
        <div className="text-[22px] cursor-pointer" style={{ opacity:0.6 }}>🔍</div>
      </div>

      <div className="flex gap-2 px-5 pt-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth:"none" }}>
        {cats.map(c=><Chip key={c} label={catLabels[c]??c} active={cat===c} onClick={()=>setCat(c)} />)}
      </div>


      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        {tonight.length>0 && (<>
          <div className="px-5 pt-[18px] flex justify-between items-center">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Tonight near you</div>
            <div className="text-xs font-medium cursor-pointer" style={{ color:C.accent }}>See all →</div>
          </div>
          <div className="mt-2.5">{tonight.map(e=><EventRow key={e.id} e={e} />)}</div>
        </>)}
        {week.length>0 && (<>
          <div className="px-5 pt-[18px] flex justify-between items-center">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>This week</div>
            <div className="text-xs font-medium cursor-pointer" style={{ color:C.accent }}>See all →</div>
          </div>
          <div className="mt-2.5">{week.map(e=><EventRow key={e.id} e={e} />)}</div>
        </>)}
        <div className="h-2" />
      </div>
      <BottomNav active="events" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ── Nearby card (exact visual hierarchy from spec) ─────────
function NearbyCard({
  user, onSayHi, onDismiss,
}: { user:NearbyUser; onSayHi:()=>void; onDismiss:()=>void }) {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white" style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)", border:`2px solid ${C.green}` }}>

      {/* Photo / avatar */}
      <div className="h-[152px] relative overflow-hidden">
        <AvatarFill user={user} />

        {/* (1) Open-to-meet status — top-left badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background:C.green }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" style={{ animation:"pulse 2s infinite" }} />
          Active
        </div>
        {/* Verified tick — only shown when user has an uploaded photo */}
        {user.photo_url && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px]" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.2)", color:C.green }}>✓</div>
        )}

        {/* (2) Time at event — bottom gradient strip */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] font-semibold text-white text-center leading-none"
          style={{ background:"linear-gradient(to top,rgba(26,20,16,0.8) 0%,transparent 100%)" }}>
          {timeAtEventLabel(user.minutes_at_event)}
        </div>
      </div>

      {/* (3) Brief info */}
      <div className="px-2.5 pt-2 pb-1">
        <div className="font-semibold text-sm leading-tight" style={{ color:C.ink }}>{user.name}, {user.age}</div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color:C.warmMid }}>{user.occupation}</div>
      </div>

      {/* (4) Interest tags — conversation starters, no ranking */}
      <div className="px-2.5 pb-1 flex flex-wrap gap-1 min-h-[20px]">
        {user.interests.slice(0,3).map(i=><InterestTag key={i} interest={i} />)}
      </div>
      {/* (5) Languages */}
      {(user.languages ?? []).length > 0 && (
        <div className="px-2.5 pb-1.5 flex flex-wrap gap-1">
          {(user.languages ?? []).slice(0,3).map(l=>(
            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background:"rgba(139,115,85,0.1)", color:C.inkSoft }}>{l}</span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 px-2.5 pb-2.5">
        <button onClick={onSayHi}   className="flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.green }}>Express interest</button>
        <button onClick={onDismiss} className="w-8 py-1.5 rounded-[10px] text-[13px] cursor-pointer flex items-center justify-center" style={{ border:`1px solid ${C.border}`, background:"transparent" }}>✕</button>
      </div>
    </div>
  );
}

// ── Haversine distance (metres) ────────────────────────────
function haversineMetres(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6_371_000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
// ── Nearby screen ──────────────────────────────────────────
function NearbyScreen({
  currentUser, onNavigate, inboxCount, locationGranted, onForceTurnOff, blockedIds, isLive, setIsLive, interactedIds, setInteractedIds,
}: { currentUser:UserProfile; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number; locationGranted:boolean; onForceTurnOff:(fn:()=>void)=>void; blockedIds:string[]; isLive:boolean; setIsLive:(v:boolean)=>void; interactedIds:string[]; setInteractedIds:React.Dispatch<React.SetStateAction<string[]>> }) {
  const [locOn,      setLocOn]     = useState(isLive);
  const [rawUsers,   setRawUsers]  = useState<UserProfile[]>([]);
  const [dismissed,  setDismissed] = useState<string[]>([]);
  const [loading,    setLoading]   = useState(false);
  const [offset,     setOffset]    = useState(0);
  const [myLat,      setMyLat]     = useState<number|null>(currentUser.lat ?? null);
  const [myLng,      setMyLng]     = useState<number|null>(currentUser.lng ?? null);
  const [locError,   setLocError]  = useState<string|null>(null);

  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const myLatRef = useRef<number|null>(currentUser.lat ?? null);
  const myLngRef = useRef<number|null>(currentUser.lng ?? null);

  const RADIUS_M = 500;

  // Wrap geolocation in a promise so we can await it properly
  function refreshMyCoords(): Promise<void> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          myLatRef.current = lat;
          myLngRef.current = lng;
          setMyLat(lat);
          setMyLng(lng);
          await supabase.from("profiles").update({ lat, lng, location_updated_at: new Date().toISOString() }).eq("id", currentUser.id);
          resolve();
        },
        () => resolve(), // on error just resolve so fetch continues
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 10_000 }
      );
    });
  }

  const fetchUsers = useCallback(async () => {
    // Always refresh GPS first and WAIT for it before filtering
    await refreshMyCoords();

    // Fetch all blocked relationships involving current user
    const { data: blocksData } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`);

    const excludeIds = new Set<string>();
    (blocksData ?? []).forEach((b: any) => {
      if (b.blocker_id === currentUser.id) excludeIds.add(b.blocked_id);
      if (b.blocked_id === currentUser.id) excludeIds.add(b.blocker_id);
    });
    blockedIds.forEach(id => excludeIds.add(id));

    let q = supabase.from("profiles").select("*").eq("open_to_meet",true).neq("id",currentUser.id);
    if (currentUser.checked_in_event_id !== null) {
      q = q.eq("checked_in_event_id", currentUser.checked_in_event_id);
    }
    const { data } = await q;
    let candidates = ((data as UserProfile[]) ?? []).filter(u => !excludeIds.has(u.id));

    // Distance filter — only show users within RADIUS_M who are open_to_meet
    // Rely on open_to_meet=false to remove people who have left, not on timestamp staleness
    const myLat = myLatRef.current;
    const myLng = myLngRef.current;
    if (myLat !== null && myLng !== null) {
      candidates = candidates.filter(u => {
        if (u.lat === null || u.lng === null) return false;
        return haversineMetres(myLat, myLng, u.lat, u.lng) <= RADIUS_M;
      });
    } else {
      // No coords yet — show nobody rather than everyone
      candidates = [];
    }

    setRawUsers(candidates);
  }, [currentUser.id, currentUser.checked_in_event_id, blockedIds]);

  async function toggleLoc() {
    if (locOn) {
      // Turn OFF
      setLocOn(false);
      setIsLive(false);
      localStorage.removeItem("here_is_live");
      await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id",currentUser.id);
      setRawUsers([]);
      if (pollRef.current)     clearInterval(pollRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
      return;
    }

    // Turn ON — use cached coords if location already granted
    setLoading(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError("Your browser doesn't support location services.");
      setLoading(false);
      return;
    }

    // If location was already granted in Profile, use a quick cached position
    const geoOptions = locationGranted
      ? { enableHighAccuracy:false, timeout:5_000, maximumAge:600_000 }
      : { enableHighAccuracy:false, timeout:20_000, maximumAge:300_000 };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLat(lat);
        setMyLng(lng);
        myLatRef.current = lat;
        myLngRef.current = lng;

        await supabase.from("profiles")
          .update({ open_to_meet:true, lat, lng, location_updated_at: new Date().toISOString() })
          .eq("id", currentUser.id);

        await fetchUsers();
        setLoading(false);
        setLocOn(true);
        setIsLive(true);

        pollRef.current = setInterval(fetchUsers, 15_000);
        rotationRef.current = setInterval(()=>setOffset(o=>o+1), ROTATION_MS);

        // Register callback so App-level timer can force turn off
        onForceTurnOff(async () => {
          setLocOn(false);
          setIsLive(false);
          localStorage.removeItem("here_is_live");
          await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id", currentUser.id);
          setRawUsers([]);
          if (pollRef.current)     clearInterval(pollRef.current);
          if (rotationRef.current) clearInterval(rotationRef.current);
        });
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Location denied. On iPhone: Settings → Safari → Location → set to Allow. Then reload the page.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocError("Location unavailable. Make sure Location Services is on in iPhone Settings → Privacy → Location Services.");
        } else if (err.code === err.TIMEOUT) {
          setLocError("Location timed out. Please try again.");
        } else {
          setLocError(`Location error (code ${err.code}). Please try again.`);
        }
      },
      geoOptions
    );
  }

  // If locationGranted is turned off externally (Profile toggle / timer), turn off Go live too
  useEffect(() => {
    if (!locationGranted && locOn) {
      setLocOn(false);
      setIsLive(false);
      supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id", currentUser.id);
      setRawUsers([]);
      if (pollRef.current)     clearInterval(pollRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
    }
  }, [locationGranted]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (pollRef.current)     clearInterval(pollRef.current);
    if (rotationRef.current) clearInterval(rotationRef.current);
  }, []);

  // Re-fetch and restart polls when screen mounts while already live
  useEffect(() => {
    if (isLive && locationGranted) {
      fetchUsers();
      if (!pollRef.current)     pollRef.current     = setInterval(fetchUsers, 15_000);
      if (!rotationRef.current) rotationRef.current = setInterval(()=>setOffset(o=>o+1), ROTATION_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Round-robin all open users (no distance filter — page ranks by proximity already)
  const ordered = applyRoundRobin(rawUsers, offset);
  const visible = ordered.filter(u=>!dismissed.includes(u.id) && !blockedIds.includes(u.id) && !interactedIds.includes(u.id));

  const eventName = currentUser.checked_in_event_id !== null
    ? (EVENTS.find(e=>e.id===currentUser.checked_in_event_id)?.name ?? "this event")
    : null;

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-5 pb-0 flex-shrink-0">
        <div>
          {eventName && (
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>
              At {eventName}
            </div>
          )}
          <div className="text-[22px] mt-0.5" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Nearby</div>
          {locOn && (
            <div className="text-[11px] mt-0.5 font-medium" style={{ color:C.warmMid }}>
              Within <strong style={{ color:C.ink }}>500 m</strong> · open to meet only
            </div>
          )}
        </div>

        {/* Compact discoverability toggle — top-right corner */}
        <button
          onClick={locationGranted ? toggleLoc : undefined}
          disabled={loading || !locationGranted}
          title={!locationGranted ? "Enable Location Access in Profile first" : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-0 transition-all duration-300 flex-shrink-0"
          style={{
            background: locOn ? "rgba(74,124,89,0.12)" : locationGranted ? "rgba(139,115,85,0.10)" : "rgba(139,115,85,0.05)",
            border: `1.5px solid ${locOn ? "rgba(74,124,89,0.35)" : locationGranted ? C.border : "rgba(139,115,85,0.1)"}`,
            cursor: locationGranted ? "pointer" : "not-allowed",
            opacity: locationGranted ? 1 : 0.45,
          }}
        >
          {loading
            ? <span style={{ fontSize:11, animation:"spin 1s linear infinite", display:"inline-block", color:C.warmMid }}>⟳</span>
            : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: locOn ? C.green : C.warmMid, animation: locOn ? "pulse 2s infinite" : "none", display:"inline-block" }} />
          }
          <span className="text-[11px] font-semibold" style={{ color: locOn ? C.green : C.warmMid }}>
            {loading ? "Locating…" : locOn ? "Live" : "Go live"}
          </span>
        </button>
      </div>

      {/* Hint when location access is off */}
      {!locationGranted && (
        <div className="mx-5 mt-2 text-center text-[11px]" style={{ color:C.warmMid }}>
          Enable <strong>Location Access</strong> in Profile to go live
        </div>
      )}

      {/* Location error banner */}
      {locError && (
        <div className="mx-5 mt-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#dc2626" }}>
          📍 {locError}
        </div>
      )}

      {/* Fairness note — only when live */}
      {locOn && (
        <div className="mx-5 mt-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed flex gap-2 flex-shrink-0"
          style={{ background:"rgba(74,124,89,0.07)", border:"1px solid rgba(74,124,89,0.15)", color:C.inkSoft }}>
          <span>📍</span>
          <span>Showing only people <strong>within 500 m</strong> who are open to meet.</span>
        </div>
      )}

      {/* Content */}
      {locOn ? (
        <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
          <div className="px-5 pt-3 flex justify-between items-center">
            <div className="text-[13px] font-semibold" style={{ color:C.ink }}>
              {loading ? "Finding people…" : `${visible.length} open to meet nearby`}
            </div>
            {eventName && <div className="text-[11px] font-medium" style={{ color:C.accent }}>🎟 Same event</div>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-3xl" style={{ animation:"spin 1s linear infinite" }}>⟳</div>
            </div>
          ) : visible.length===0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
              <div className="text-4xl mb-3 opacity-30">🔍</div>
              <div className="text-[14px] font-semibold" style={{ color:C.ink }}>No one else is open to meet yet</div>
            </div>
          ) : (
            <div className="px-5 pt-3 grid grid-cols-2 gap-3">
              {visible.map(u=>(
                <NearbyCard
                  key={u.id}
                  user={u}
                  onSayHi={()=>{ setInteractedIds(prev=>[...prev,u.id]); onNavigate("request",u.id); }}
                  onDismiss={()=>{ setDismissed(prev=>[...prev,u.id]); setInteractedIds(prev=>[...prev,u.id]); }}
                />
              ))}
            </div>
          )}

          <div className="mx-5 mt-3.5 mb-2 p-3 rounded-xl text-xs leading-relaxed flex gap-2" style={{ background:"rgba(139,115,85,0.08)", color:C.warmMid }}>
            <span>🔒</span><span>Others only see your approximate area, never your exact location. Your visibility ends when you turn off the Go live button or your location access.</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
          <div className="text-[48px] opacity-30 mb-4">📡</div>
          <div className="text-[15px] font-semibold mb-2" style={{ color:C.ink }}>Discover people around you</div>
          <div className="text-[13px] leading-relaxed" style={{ color:C.warmMid }}>Tap <strong>Go live</strong> in the top-right to become discoverable and see who else is open to meet right now.</div>
        </div>
      )}

      <BottomNav active="nearby" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ── Send request ───────────────────────────────────────────
function RequestScreen({
  person, currentUser, onNavigate, inboxCount,
}: { person:UserProfile; currentUser:UserProfile; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const firstName = person.name.split(",")[0];

  async function sendRequest() {
    setSending(true); setError("");
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const { data: existing } = await supabase
      .from("meet_requests")
      .select("id")
      .eq("from_id", currentUser.id)
      .eq("to_id", person.id)
      .gte("created_at", startOfDay.toISOString())
      .maybeSingle();
    if (existing) {
      setError("You have already expressed interest in this person today.");
      setSending(false);
      return;
    }
    const sentAt = new Date().toISOString();
    const { error: err } = await supabase.from("meet_requests").insert({
      from_id:    currentUser.id,
      to_id:      person.id,
      hint:       null,
      status:     "pending",
      created_at: sentAt,
    });
    setSending(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setSent(true);
    setTimeout(() => onNavigate("pending", { person, sentAt }), 1200);
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      {/* Header */}
      <div className="px-[22px] pt-5 flex items-center gap-3.5 flex-shrink-0">
        <BackBtn onClick={()=>onNavigate("nearby")} />
        <AvatarCircle user={person} size={52} />
        <div>
          <div className="text-[19px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>{person.name}, {person.age}</div>
          <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{person.occupation} · Verified</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        {/* Profile card */}
        <div className="bg-white mx-[22px] mt-4 rounded-[18px] px-4 pt-4 pb-4" style={{ boxShadow:"0 2px 14px rgba(26,20,16,0.06)" }}>

          {/* Interests */}
          <div className="text-[10px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>Interests</div>
          <div className="flex flex-wrap gap-1.5">
            {person.interests.map(i=><InterestTag key={i} interest={i} />)}
          </div>

          {/* Conversation starter */}
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

          {/* Languages */}
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

        {/* Privacy note */}
        <div className="mx-[22px] mt-3 px-4 py-3 rounded-xl text-[12px] leading-relaxed" style={{ background:"rgba(139,115,85,0.07)", color:C.warmMid }}>
          You will only receive a notification if <strong style={{ color:C.inkSoft }}>{firstName}</strong> is also open to meet. If they accept, that is your green light to find each other in person.
        </div>

        {/* Button */}
        {!sent ? (
          <button onClick={sendRequest} disabled={sending}
            className="mx-[22px] mt-4 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background:C.green, width:"calc(100% - 44px)", opacity:sending?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
            {sending ? "Sending…" : "Express interest →"}
          </button>
        ) : (
          <div className="mx-[22px] mt-4 py-4 rounded-2xl text-center text-[14px] font-semibold" style={{ background:"rgba(74,124,89,0.1)", color:C.green }}>
            Interest sent — you will hear back in Requests
          </div>
        )}
        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <div className="h-4" />
      </div>
      <BottomNav active="nearby" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ── Pending Screen (request sent, waiting for other party) ─
function PendingScreen({
  person, onNavigate, inboxCount, currentUser, sentAt,
}: { person:UserProfile; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number; currentUser:UserProfile; sentAt:string }) {
  const firstName = person.name.split(",")[0];
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // No auto-navigation — sender stays here until they tap a button.
  // We just stop polling silently when a final status is reached.
  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase
        .from("meet_requests")
        .select("status")
        .eq("from_id", currentUser.id)
        .eq("to_id", person.id)
        .gte("created_at", sentAt)
        .in("status", ["accepted", "declined"])
        .limit(1)
        .single();
      if (data) {
        // Stop polling — but don't navigate. User taps the button themselves.
        clearInterval(pollRef.current!);
      }
    }
    // Small delay before first poll so the insert has time to settle
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
          style={{ background:"rgba(245,240,232,0.1)", color:C.cream }}>✕</button>
        <div className="text-xs uppercase tracking-[1.5px] font-semibold" style={{ color:"rgba(245,240,232,0.45)" }}>Request sent</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[54px] mb-5" style={{ animation:"float 3s ease-in-out infinite" }}>⏳</div>
        <div className="text-[28px] leading-snug mb-3" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>
          Request sent to<br /><em style={{ color:C.accent }}>{firstName}</em>
        </div>
        <div className="text-[13px] leading-relaxed mb-6 max-w-[280px]" style={{ color:"rgba(245,240,232,0.55)" }}>
          Waiting for <strong style={{ color:"rgba(245,240,232,0.8)" }}>{firstName}</strong> to respond. You will be notified in your <strong style={{ color:"rgba(245,240,232,0.8)" }}>Requests</strong> tab if they accept.
        </div>

        {/* Animated waiting indicator */}
        <div className="flex gap-2 mb-6">
          {[0,1,2].map(i=>(
            <div key={i} className="w-2 h-2 rounded-full" style={{ background:C.accent, animation:`pulse 1.4s ${i*0.2}s ease-in-out infinite` }} />
          ))}
        </div>

        <div className="w-full p-4 rounded-[18px] mb-4 text-left" style={{ background:"rgba(196,120,58,0.08)", border:"1px solid rgba(196,120,58,0.2)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.accent }}>What happens next</div>
          <div className="text-[13px] leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>
            When {firstName} accepts, you will see a notification in your <strong style={{ color:"rgba(245,240,232,0.75)" }}>Requests</strong> tab. Open it to get the green light and go find them.
          </div>
        </div>

        <div className="text-xs leading-relaxed" style={{ color:"rgba(245,240,232,0.35)" }}>
          Location is never shared. This is an in-person introduction only.
        </div>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-2.5">
        <button onClick={()=>onNavigate("nearby")} className="w-full py-3.5 rounded-2xl text-[15px] font-semibold cursor-pointer border-0"
          style={{ background:C.accent, color:"white", fontFamily:"'DM Sans',sans-serif" }}>
          ← Back to Nearby
        </button>
        <button onClick={()=>onNavigate("inbox")} className="w-full py-3.5 rounded-2xl text-[14px] font-medium cursor-pointer border-0"
          style={{ background:"rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.55)", fontFamily:"'DM Sans',sans-serif" }}>
          View Meet Requests
        </button>
      </div>
    </div>
  );
}

// ── Inbox ──────────────────────────────────────────────────
function InboxScreen({
  requests, onNavigate, onDecline, onDismiss, acceptedSent, onViewMatch,
}: { requests:InboxRequest[]; onNavigate:(s:Screen,d?:unknown)=>void; onDecline:(id:number)=>void; onDismiss:(id:number)=>void; acceptedSent?: { person:UserProfile; recipientHint:string|null } | null; onViewMatch?:()=>void }) {

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-5 flex-shrink-0">
        <div className="text-[22px] mt-0.5" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Meet Requests</div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="pt-3">

          {/* ── Acceptance banner ── */}
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
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background:C.green, border:"2px solid #1a3a28" }}>✓</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold" style={{ color:"#e8f5ee", fontFamily:"'DM Serif Display',Georgia,serif" }}>
                      {acceptedSent.person.name.split(",")[0]} accepted
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color:"rgba(232,245,238,0.65)" }}>Tap to get the green light and go find them</div>
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {/* ── Incoming requests ── */}
          <div className="px-[22px] mb-2 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Incoming</div>
            {requests.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background:C.green, animation:"pulse 2s infinite" }} />
                <span className="text-[11px] font-semibold" style={{ color:C.green }}>{requests.length} new</span>
              </div>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color:C.warmMid }}>
              {acceptedSent ? "No other incoming requests" : "No requests yet"}
            </div>
          ) : requests.map(r=>(
            <div key={r.id} className="mx-5 mb-3 p-4 rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background:"rgba(196,120,58,0.04)", border:`1.5px solid ${C.accent}`, boxShadow:"0 2px 14px rgba(26,20,16,0.07)" }}
              onClick={()=>onNavigate("incoming",r.id)}>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:C.accent }} />
                <AvatarCircle user={{ photo_url:r.photo_url, bg:r.bg, name:r.name }} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color:C.ink }}>{r.name} <span className="text-[10px] font-semibold ml-1" style={{ color:C.green }}>✓ Verified</span></div>
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
      <BottomNav active="inbox" onNavigate={onNavigate} inboxCount={requests.length} />
    </div>
  );
}

// ── Incoming ───────────────────────────────────────────────
function IncomingScreen({
  request, onNavigate, inboxCount, onDecline,
}: { request:InboxRequest; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number; onDecline:(id:number)=>void }) {
  const [response,  setResponse]  = useState<IncResponse>("accept");
  const [areaHint,  setAreaHint]  = useState("");
  const [sending,   setSending]   = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error,     setError]     = useState("");
  const firstName                 = request.name.split(",")[0];

  const options: { id:IncResponse; label:string; sub:string }[] = [
    { id:"accept", label:"Accept — meet now",        sub:"Give them the green light to approach you" },
    { id:"15min",  label:"Accept — meet in 15 min",  sub:"I will be with you shortly"                },
    { id:"30min",  label:"Accept — meet in 30 min",  sub:"I will see you in a bit"                   },
  ];

  const showAreaHint = response === "15min" || response === "30min";

  async function confirm() {
    setSending(true); setError("");
    const { error: err } = await supabase
      .from("meet_requests")
      .update({
        status:           "accepted",
        recipient_hint:   areaHint.trim() || null,
        response_timing:  response,
      })
      .eq("id", request.id);
    setSending(false);
    if (err) { setError("Failed: " + err.message); return; }
    onNavigate("match", { request, response, fromIncoming: true, recipientHint: areaHint.trim() || null });
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
            <div className="text-[20px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>{request.name}</div>
            <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{request.meta}</div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">{request.tags.map(t=><InterestTag key={t} interest={t} />)}</div>
          </div>
        </div>

        {/* Interest notification */}
        <div className="mx-[22px] mt-3.5 p-[14px_18px] rounded-2xl" style={{ background:"rgba(74,124,89,0.08)", border:"1px solid rgba(74,124,89,0.25)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.green }}>Expressed interest in meeting you</div>
          <div className="text-[14px] leading-relaxed" style={{ color:C.inkSoft }}>{firstName} would like to meet you in person. Accept to give them the green light to approach you.</div>
        </div>

        {/* Response options */}
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

        {/* Area hint — only shown for 15min / 30min */}
        {showAreaHint && (
          <div className="px-[22px] pt-1 pb-1">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>
              Where will you be? <span className="normal-case font-normal" style={{ textTransform:"none", letterSpacing:0 }}>(optional)</span>
            </div>
            <input
              value={areaHint}
              onChange={e=>setAreaHint(e.target.value)}
              maxLength={80}
              placeholder="e.g. near the tube exit, by the bar…"
              className="w-full px-4 py-3 rounded-[14px] text-[13px] outline-none"
              style={{ border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", color:C.ink, background:"white" }}
            />
            <div className="text-[11px] text-right mt-1" style={{ color:C.warmMid }}>{areaHint.length} / 80</div>
          </div>
        )}

        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <button onClick={confirm} disabled={sending}
          className="mx-[22px] mt-3 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:C.green, width:"calc(100% - 44px)", opacity:sending?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
          {sending ? "Confirming…" : "Accept"}
        </button>
        <button onClick={handleDecline} disabled={declining}
          className="mx-[22px] mt-2.5 py-[13px] rounded-2xl text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.warmMid, width:"calc(100% - 44px)", fontFamily:"'DM Sans',sans-serif", opacity:declining?0.5:1 }}>
          {declining ? "Declining…" : "Decline"}
        </button>
        <div className="h-6" />
      </div>
      <BottomNav active="inbox" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ── Match ──────────────────────────────────────────────────
function MatchScreen({
  matchData, onNavigate, currentUser, onBlock, onDecline, onClearAccepted, onMetThem,
}: { matchData:{ person?:UserProfile; request?:InboxRequest; response?:IncResponse; fromIncoming?:boolean; recipientHint?:string }; onNavigate:(s:Screen,d?:unknown)=>void; currentUser:UserProfile; onBlock:(id:string)=>void; onDecline:(id:number)=>void; onClearAccepted:()=>void; onMetThem:(id:string)=>void }) {
  const person    = matchData.person || matchData.request;
  const firstName = person ? person.name.split(",")[0] : "They";
  const timerMins = matchData.response==="15min" ? 15 : 30;
  const reportedId = (matchData.person?.id) || ((matchData.request as any)?.from_id) || null;
  const fromIncoming = matchData.fromIncoming ?? false;

  const [secs,         setSecs]       = useState(timerMins*60);
  const [erased,       setErased]     = useState(false);
  const [showReport,   setShowReport] = useState(false);
  const [reportOpt,    setReportOpt]  = useState("");
  const [showToast,    setShowToast]  = useState(false);
  const [submitting,   setSubmitting] = useState(false);

  useEffect(()=>{
    if (erased) return;
    const t = setInterval(()=>setSecs(s=>{ if(s<=1){clearInterval(t);setErased(true);return 0;} return s-1; }),1000);
    return ()=>clearInterval(t);
  },[erased]);

  const mins = Math.floor(secs/60), sec = secs%60;

  return (
    <div className="flex flex-col h-full relative" style={{ background:C.ink }}>
      <div className="flex-1 flex flex-col items-center pt-7 px-6 overflow-y-auto" style={{ minHeight:0 }}>
        <div className="text-[52px] mb-3.5" style={{ animation:"float 3s ease-in-out infinite" }}>↑</div>
        <div className="text-[30px] text-center leading-snug" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>
          {fromIncoming ? "You accepted." : `${firstName} accepted.`}<br />
          <em style={{ color:C.green }}>Go find them.</em>
        </div>
        <div className="text-[13px] text-center mt-2.5 leading-relaxed px-2" style={{ color:"rgba(245,240,232,0.55)" }}>
          {fromIncoming
            ? `${firstName} will be looking out for you. Head over and introduce yourself.`
            : `${firstName} is expecting you. Go say hello in person.`}
        </div>

        {/* Person card */}
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
            {/* Area hint — shown if recipient provided one */}
            {matchData.recipientHint && (
              <div className="mt-2 text-[12px] leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>
                Near: <strong style={{ color:C.cream }}>{matchData.recipientHint}</strong>
              </div>
            )}
          </div>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:C.green, boxShadow:`0 0 10px ${C.green}` }} />
        </div>

        {/* Timer */}
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

      <div className="flex gap-3 px-6 pt-4">
        <button onClick={()=>setShowReport(true)} className="flex-1 py-3.5 rounded-[14px] text-[13px] cursor-pointer" style={{ border:"1px solid rgba(184,80,66,0.3)", background:"transparent", color:"rgba(245,240,232,0.6)", fontFamily:"'DM Sans',sans-serif" }}>Report</button>
        <button onClick={()=>{ if(reportedId) onMetThem(reportedId); onNavigate("events"); }} className="flex-[2] py-3.5 rounded-[14px] text-[13px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.green, fontFamily:"'DM Sans',sans-serif" }}>Met them</button>
      </div>
      <div className="h-7" />

      {/* Report modal */}
      {showReport && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background:"rgba(0,0,0,0.6)" }}>
          <div className="w-full rounded-[28px_28px_0_0] p-6 pb-9" style={{ background:C.cream }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background:C.border }} />
            <div className="text-[20px] mb-1" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Report this profile</div>
            <div className="text-[13px] mb-5" style={{ color:C.warmMid }}>What&apos;s the issue? Your report is anonymous.</div>
            {["Made me feel unsafe or uncomfortable","Inappropriate behaviour or messages","Fake or misleading profile","Other"].map(opt=>(
              <button key={opt} onClick={()=>setReportOpt(opt)}
                className="w-full p-3.5 rounded-[14px] text-[14px] text-left mb-2.5 cursor-pointer transition-all"
                style={{ border:`1.5px solid ${reportOpt===opt?C.ink:C.border}`, background:reportOpt===opt?C.ink:"white", color:reportOpt===opt?C.cream:C.ink, fontFamily:"'DM Sans',sans-serif" }}>
                {opt}
              </button>
            ))}
            {reportOpt && (
              <button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  // Write report to Supabase — include reported user's name/email via join
                  await supabase.from("reports").insert({
                    reporter_id:  currentUser.id,
                    reported_id:  reportedId,
                    reason:       reportOpt,
                    created_at:   new Date().toISOString(),
                  });
                  // Block the user
                  if (reportedId) {
                    await supabase.from("blocked_users").insert({
                      blocker_id:  currentUser.id,
                      blocked_id:  reportedId,
                      created_at:  new Date().toISOString(),
                    });
                    onBlock(reportedId);
                    // Remove the associated request from inbox state (both as receiver and as sender)
                    const requestId = (matchData.request as any)?.id;
                    if (requestId) onDecline(requestId);
                    // Clear the accepted-sent banner if it references this match
                    onClearAccepted();
                    // The blocked_users row is bidirectional — fetchUsers on both sides
                    // already excludes any user where either party is in the block list,
                    // so no further profile mutation is needed.
                  }
                  setSubmitting(false);
                  setShowReport(false);
                  setShowToast(true);
                  setTimeout(()=>{ setShowToast(false); onNavigate("inbox"); }, 3000);
                }}
                className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white border-0 cursor-pointer mb-2.5"
                style={{ background:C.ink, opacity:submitting?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            )}
            <button onClick={()=>setShowReport(false)} className="w-full py-3.5 rounded-[14px] text-[14px] cursor-pointer" style={{ border:`1px solid ${C.border}`, background:"transparent", color:C.warmMid, fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
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

// ── Profile ────────────────────────────────────────────────
function ProfileScreen({
  currentUser, onNavigate, onSignOut, inboxCount,
  locationGranted, setLocationGranted, autoOffTimer, setAutoOffTimer,
}: { currentUser:UserProfile; onNavigate:(s:Screen)=>void; onSignOut:()=>void; inboxCount:number;
     locationGranted:boolean; setLocationGranted:(v:boolean)=>void;
     autoOffTimer:string; setAutoOffTimer:(v:string)=>void }) {
  const [ageExpanded,  setAgeX]   = useState(false);
  const [privExpanded, setPrivX]  = useState(false);
  const [ageMin, setAgeMin]       = useState(18);
  const [ageMax, setAgeMax]       = useState(35);
  const [photoLoading, setPhotoL] = useState(false);
  const [profileActive, setProfileActive] = useState(true);
  const fileRef                   = useRef<HTMLInputElement>(null);
  // Interests editing
  const [editingInterests, setEditingInterests] = useState(false);
  const [draftInterests,   setDraftInterests]   = useState<string[]>(currentUser.interests);
  const [savingInterests,  setSavingInterests]  = useState(false);
  // Languages editing
  const [editingLanguages, setEditingLanguages] = useState(false);
  const [draftLanguages,   setDraftLanguages]   = useState<string[]>(currentUser.languages ?? []);
  const [langInput,        setLangInput]        = useState("");
  const [savingLanguages,  setSavingLanguages]  = useState(false);

  function toggleDraftLanguage(lang: string) {
    setDraftLanguages(prev => prev.includes(lang) ? prev.filter(x=>x!==lang) : [...prev, lang]);
  }
  const filteredLangs = LANGUAGES.filter(l =>
    l.toLowerCase().includes(langInput.toLowerCase()) && !draftLanguages.includes(l)
  );
  async function saveLanguages() {
    setSavingLanguages(true);
    await supabase.from("profiles").update({ languages: draftLanguages }).eq("id", currentUser.id);
    currentUser.languages = draftLanguages;
    setSavingLanguages(false);
    setEditingLanguages(false);
  }

  function toggleDraftInterest(id: string) {
    setDraftInterests(prev =>
      prev.includes(id) ? prev.filter(x=>x!==id) : prev.length < MAX_INTERESTS ? [...prev, id] : prev
    );
  }

  async function saveInterests() {
    setSavingInterests(true);
    await supabase.from("profiles").update({ interests: draftInterests }).eq("id", currentUser.id);
    currentUser.interests = draftInterests;
    setSavingInterests(false);
    setEditingInterests(false);
  }

  const total    = 50-18;
  const leftPct  = ((ageMin-18)/total)*100;
  const rightPct = ((50-ageMax)/total)*100;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size>5*1024*1024) { alert("Photo must be under 5 MB"); return; }
    setPhotoL(true);
    const ext  = file.name.split(".").pop()??"jpg";
    const path = `avatars/${currentUser.id}.${ext}`;
    const { error:upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert:true, contentType:file.type });
    if (upErr) { alert("Upload failed: "+upErr.message); setPhotoL(false); return; }
    const { data:urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl+`?v=${Date.now()}`;
    await supabase.from("profiles").update({ photo_url:url }).eq("id",currentUser.id);
    currentUser.photo_url = url;
    // Store today's date so we can show "selfie taken today" badge
    localStorage.setItem(`selfie_date_${currentUser.id}`, new Date().toDateString());
    setPhotoL(false);
  }

  const todaySelfieDate = typeof window !== "undefined" ? localStorage.getItem(`selfie_date_${currentUser.id}`) : null;
  const selfieIsToday = todaySelfieDate === new Date().toDateString();
  // photoIsToday alias for clarity in the UI
  const photoIsToday = selfieIsToday;

  async function handleSignOut() {
    await supabase.from("profiles").update({ open_to_meet:false, checked_in_event_id:null, checked_in_at:null }).eq("id",currentUser.id);
    await supabase.auth.signOut();
    onSignOut();
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-6 flex-shrink-0">
        <div className="text-[24px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Your Profile</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        {/* Profile card — tap to edit interests */}
        <div className="mx-[22px] mt-5 p-5 bg-white rounded-[20px] flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)", border:`1.5px solid ${editingInterests ? C.accent : "transparent"}` }}
          onClick={()=>{ setDraftInterests(currentUser.interests); setEditingInterests(true); }}>
          <div className="relative flex-shrink-0" onClick={e=>e.stopPropagation()}>
            <AvatarCircle user={currentUser} size={64} />
            {/* Green tick if photo taken today, red cross if not */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold"
              style={{ background: photoIsToday ? C.green : "#dc2626", color:"white", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
              {photoIsToday ? "✓" : "✕"}
            </div>
            {/* camera-only, no gallery */}
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[18px]" style={{ color:C.ink }}>{currentUser.name}, {currentUser.age}</div>
            <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{currentUser.occupation}</div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">{currentUser.interests.map(i=><InterestTag key={i} interest={i} />)}</div>
            {/* Daily photo nudge */}
            <button onClick={e=>{e.stopPropagation();fileRef.current?.click();}}
              className="mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer border-0"
              style={{ background: photoIsToday ? "rgba(74,124,89,0.1)" : "rgba(220,38,38,0.08)", color: photoIsToday ? C.green : "#dc2626", fontFamily:"'DM Sans',sans-serif" }}>
              {photoLoading ? "Uploading…" : photoIsToday ? "Today's photo taken" : "Update today's photo"}
            </button>
            <div className="text-[11px] mt-1" style={{ color:C.warmMid }}>Tap card to edit interests</div>
          </div>
        </div>

        {/* Interests edit modal */}
        {editingInterests && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background:"rgba(0,0,0,0.45)" }}
            onClick={()=>setEditingInterests(false)}>
            <div className="w-full rounded-[28px_28px_0_0] pb-8 pt-5 px-6" style={{ background:C.cream, maxWidth:430 }}
              onClick={e=>e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background:C.border }} />
              <div className="text-[20px] mb-1" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Edit your interests</div>
              <div className="text-xs mb-4" style={{ color:C.warmMid }}>Pick up to {MAX_INTERESTS} · {draftInterests.length}/{MAX_INTERESTS} selected</div>
              <div className="flex flex-wrap gap-2 mb-5">
                {INTERESTS.map(i=>{
                  const active = draftInterests.includes(i.id);
                  const disabled = !active && draftInterests.length >= MAX_INTERESTS;
                  return (
                    <button key={i.id}
                      onClick={()=>!disabled && toggleDraftInterest(i.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        border:`1px solid ${active ? C.ink : C.border}`,
                        background: active ? C.ink : "white",
                        color: active ? C.cream : disabled ? "rgba(139,115,85,0.35)" : C.inkSoft,
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontFamily:"'DM Sans',sans-serif",
                      }}>
                      {i.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={saveInterests} disabled={savingInterests || draftInterests.length === 0}
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
                style={{ background:C.accent, opacity:(savingInterests||draftInterests.length===0)?0.5:1, fontFamily:"'DM Sans',sans-serif" }}>
                {savingInterests ? "Saving…" : "Save interests"}
              </button>
              <button onClick={()=>setEditingInterests(false)}
                className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0"
                style={{ background:"transparent", color:C.warmMid, fontFamily:"'DM Sans',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Languages edit modal */}
        {editingLanguages && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background:"rgba(0,0,0,0.45)" }}
            onClick={()=>setEditingLanguages(false)}>
            <div className="w-full rounded-[28px_28px_0_0] pb-8 pt-5 px-6" style={{ background:C.cream, maxWidth:430 }}
              onClick={e=>e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background:C.border }} />
              <div className="text-[20px] mb-1" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Edit languages</div>
              <div className="text-xs mb-3" style={{ color:C.warmMid }}>Select all languages you speak</div>
              {draftLanguages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {draftLanguages.map(l=>(
                    <span key={l} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background:C.ink, color:C.cream, fontFamily:"'DM Sans',sans-serif" }}>
                      {l}
                      <button onClick={()=>toggleDraftLanguage(l)} className="border-0 bg-transparent cursor-pointer" style={{ color:"rgba(245,240,232,0.55)", fontSize:14, lineHeight:1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <input value={langInput} onChange={e=>setLangInput(e.target.value)}
                placeholder="Search languages…"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-2"
                style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'DM Sans',sans-serif" }} />
              <div className="rounded-2xl overflow-hidden mb-4" style={{ border:`1px solid ${C.border}`, maxHeight:200, overflowY:"auto" }}>
                {filteredLangs.slice(0,20).map((l,idx)=>(
                  <button key={l} onClick={()=>{ toggleDraftLanguage(l); setLangInput(""); }}
                    className="w-full px-4 py-2.5 text-left text-sm cursor-pointer border-0"
                    style={{ background:idx%2===0?"white":"rgba(245,240,232,0.5)", color:C.ink, fontFamily:"'DM Sans',sans-serif", borderBottom:`1px solid ${C.border}`, display:"block" }}>
                    {l}
                  </button>
                ))}
                {filteredLangs.length===0 && <div className="px-4 py-3 text-sm" style={{ color:C.warmMid }}>No matches</div>}
              </div>
              <button onClick={saveLanguages} disabled={savingLanguages}
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
                style={{ background:C.accent, opacity:savingLanguages?0.5:1, fontFamily:"'DM Sans',sans-serif" }}>
                {savingLanguages ? "Saving…" : "Save languages"}
              </button>
              <button onClick={()=>setEditingLanguages(false)}
                className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0"
                style={{ background:"transparent", color:C.warmMid, fontFamily:"'DM Sans',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mx-[22px] mt-4 bg-white rounded-[18px] overflow-hidden" style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)" }}>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div className="text-sm font-medium" style={{ color:C.ink }}>Profile visibility</div>
              <div className="text-[11px] mt-0.5" style={{ color: profileActive ? C.green : "#dc2626" }}>
                {profileActive ? "Your profile is visible to others" : "Your profile is hidden"}
              </div>
            </div>
            <button
              onClick={async () => {
                const next = !profileActive;
                setProfileActive(next);
                await supabase.from("profiles").update({ open_to_meet: false }).eq("id", currentUser.id);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-0 transition-all"
              style={{
                background: profileActive ? "rgba(220,38,38,0.08)" : "rgba(74,124,89,0.1)",
                color: profileActive ? "#dc2626" : C.green,
                fontFamily:"'DM Sans',sans-serif",
              }}>
              {profileActive ? "Deactivate" : "Activate"}
            </button>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <span className="text-sm font-medium" style={{ color:C.ink }}>here. Premium</span>
            <span className="text-xs font-semibold cursor-pointer" style={{ color:C.accent }}>Upgrade →</span>
          </div>

          {/* Languages row */}
          <div className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
            onClick={()=>{ setDraftLanguages(currentUser.languages ?? []); setLangInput(""); setEditingLanguages(true); }}>
            <div>
              <div className="text-sm font-medium" style={{ color:C.ink }}>Languages</div>
              <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>
                {(currentUser.languages ?? []).length > 0 ? (currentUser.languages ?? []).join(", ") : "Not set — tap to add"}
              </div>
            </div>
            <span style={{ color:C.warmMid }}>›</span>
          </div>
          <div className="px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }} onClick={()=>setAgeX(v=>!v)}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium" style={{ color:C.ink }}>Visible to age range</span>
                <div className="text-xs font-semibold mt-0.5" style={{ color:C.accent }}>Ages {ageMin} – {ageMax>=50?"50+":ageMax}</div>
              </div>
              <span style={{ color:C.warmMid, transform:ageExpanded?"rotate(90deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>›</span>
            </div>
            {ageExpanded && (
              <div className="pt-4" onClick={e=>e.stopPropagation()}>
                <div className="text-xs leading-relaxed mb-3.5" style={{ color:C.warmMid }}>Only people within this age range will see your profile in Nearby.</div>
                <div className="relative h-9 mx-1">
                  <div className="absolute top-1/2 left-0 right-0 h-1 rounded-sm -translate-y-1/2" style={{ background:"rgba(139,115,85,0.15)" }} />
                  <div className="absolute top-1/2 h-1 rounded-sm -translate-y-1/2" style={{ background:C.accent, left:`${leftPct}%`, right:`${rightPct}%` }} />
                  <input type="range" min={18} max={50} value={ageMin} onChange={e=>{const v=parseInt(e.target.value);if(v<ageMax)setAgeMin(v);}} className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer" style={{ WebkitAppearance:"none" }} />
                  <input type="range" min={18} max={50} value={ageMax} onChange={e=>{const v=parseInt(e.target.value);if(v>ageMin)setAgeMax(v);}} className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer" style={{ WebkitAppearance:"none" }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px]" style={{ color:C.warmMid }}>18</span>
                  <div className="text-center"><div className="text-[15px] font-bold" style={{ color:C.ink }}>{ageMin} – {ageMax>=50?"50+":ageMax}</div><div className="text-[11px]" style={{ color:C.warmMid }}>your visibility window</div></div>
                  <span className="text-[11px]" style={{ color:C.warmMid }}>50+</span>
                </div>
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }} onClick={()=>setPrivX(v=>!v)}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color:C.ink }}>Privacy settings</span>
              <span style={{ color:C.warmMid, transform:privExpanded?"rotate(90deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>›</span>
            </div>
            {privExpanded && (
              <div className="pt-4" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 rounded-xl mb-2.5" style={{ background:"rgba(139,115,85,0.06)" }}>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color:C.ink }}>📍 Location Access</div>
                    <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>Only visible when discoverability is on</div>
                  </div>
                  <button onClick={()=>setLocationGranted(!locationGranted)} className="ml-3 flex-shrink-0 w-[44px] h-[26px] rounded-full relative cursor-pointer border-0 transition-colors duration-200" style={{ background:locationGranted?C.green:"rgba(139,115,85,0.2)" }}>
                    <div className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all duration-200" style={{ left:locationGranted?"21px":"3px", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
                <div className="text-xs font-semibold mb-2" style={{ color:C.inkSoft }}>Discoverability auto-turns off after</div>
                <div className="flex gap-2 flex-wrap">
                  {[{id:"30min",label:"30 min"},{id:"60min",label:"1 hour"},{id:"120min",label:"2 hours"},{id:"never",label:"Never"}].map(t=>(
                    <Chip key={t.id} label={t.label} active={autoOffTimer===t.id} onClick={()=>setAutoOffTimer(t.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSignOut} className="w-full px-[18px] py-3.5 text-left text-sm font-medium cursor-pointer border-0 bg-transparent" style={{ color:"#B85042", fontFamily:"'DM Sans',sans-serif" }}>
            Sign out
          </button>
        </div>

        <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;border:2.5px solid #C4783A;box-shadow:0 2px 8px rgba(196,120,58,0.35);cursor:pointer;}`}</style>
        <div className="h-2" />
      </div>
      <BottomNav active="profile" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════
export default function App() {
  const [screen,          setScreen]  = useState<Screen>("splash");
  const [screenData,      setData]    = useState<unknown>(null);
  const [animKey,         setAnimKey] = useState(0);
  const [currentUser,     setUser]    = useState<UserProfile|null>(null);
  const currentUserRef = useRef<UserProfile|null>(null);
  function setUserAndRef(u: UserProfile|null) { currentUserRef.current = u; setUser(u); }
  const [inbox,           setInbox]   = useState<InboxRequest[]>([]);
  const [acceptedSent,    setAcceptedSent] = useState<{ requestId: number; person: UserProfile; recipientHint: string|null } | null>(null);
  const declinedIdsRef = useRef<Set<number>>(new Set());
  const sentPollRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [blockedIds,      setBlockedIds]       = useState<string[]>([]);
  const [autoOffTimer,    setAutoOffTimer]     = useState("never");
  const autoOffRef      = useRef<ReturnType<typeof setTimeout>|null>(null);
  const inboxPollRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const turnOffLiveRef  = useRef<(()=>void)|null>(null);
  // Lifted from NearbyScreen so Go Live persists across tab navigation
  const [isLive, setIsLiveState] = useState(() => {
    // Restore from localStorage — if user was live before closing, restore that state
    if (typeof window !== "undefined") {
      return localStorage.getItem("here_is_live") === "true";
    }
    return false;
  });
  function setIsLive(v: boolean) {
    setIsLiveState(v);
    if (typeof window !== "undefined") localStorage.setItem("here_is_live", String(v));
  }
  // Lifted so interacted profiles stay hidden after navigating away and back
  const [interactedIds,   setInteractedIds]    = useState<string[]>([]);

  // Poll Supabase for real incoming meet_requests
  const fetchInbox = useCallback(async (userId: string) => {
    const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data } = await supabase
      .from("meet_requests")
      .select("*, profiles!meet_requests_from_id_fkey(*)")
      .eq("to_id", userId)
      .eq("status", "pending")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!data) return;
    const mapped: InboxRequest[] = data.map((r: any) => {
      const sender = r.profiles as UserProfile;
      const ageMs  = Date.now() - new Date(r.created_at).getTime();
      const mins   = Math.floor(ageMs / 60_000);
      const timeLabel = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
      return {
        id:        r.id,
        name:      `${sender.name}, ${sender.age}`,
        photo_url: sender.photo_url,
        bg:        sender.bg,
        gender:    "m" as const,
        meta:      sender.occupation,
        tags:      sender.interests ?? [],
        reqLabel:  r.hint ? `👋 "${r.hint}"` : "👋 Spotted you — wants to say hi",
        time:      timeLabel,
        isNew:     true,
        from_id:   r.from_id,
        hint:      r.hint,
      };
    });
    setInbox(mapped.filter(r => !declinedIdsRef.current.has(r.id)));
  }, []);

  // Start polling when user is known
  useEffect(() => {
    if (!currentUser) return;
    fetchInbox(currentUser.id);
    inboxPollRef.current = setInterval(() => fetchInbox(currentUser.id), 10_000);
    return () => { if (inboxPollRef.current) clearInterval(inboxPollRef.current); };
  }, [currentUser, fetchInbox]);

  // Poll for sender's own outgoing requests that got accepted
  const seenAcceptedIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!currentUser) return;
    async function checkSentAccepted() {
      // Only surface accepted requests from the last 30 min — older ones are stale / hint-expired
      const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data } = await supabase
        .from("meet_requests")
        .select("*, profiles!meet_requests_to_id_fkey(*)")
        .eq("from_id", currentUser!.id)
        .eq("status", "accepted")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (
        data &&
        !declinedIdsRef.current.has(data.id) &&
        !seenAcceptedIdsRef.current.has(data.id)
      ) {
        seenAcceptedIdsRef.current.add(data.id);
        const recipient = data.profiles as UserProfile;
        setAcceptedSent({ requestId: data.id, person: recipient, recipientHint: data.recipient_hint ?? null });
        // Keep polling — don't clearInterval — so new matches surface without a page refresh
      }
    }
    checkSentAccepted();
    sentPollRef.current = setInterval(checkSentAccepted, 6_000);
    return () => { if (sentPollRef.current) clearInterval(sentPollRef.current); };
  }, [currentUser]);
  // Auto-turn-off location access timer
  useEffect(() => {
    if (autoOffRef.current) clearTimeout(autoOffRef.current);
    if (!locationGranted || autoOffTimer === "never") return;
    const ms = autoOffTimer === "30min" ? 30*60_000 : autoOffTimer === "60min" ? 60*60_000 : 120*60_000;
    autoOffRef.current = setTimeout(() => {
      setLocationGranted(false);
      setIsLive(false);
      if (turnOffLiveRef.current) turnOffLiveRef.current();
    }, ms);
    return () => { if (autoOffRef.current) clearTimeout(autoOffRef.current); };
  }, [locationGranted, autoOffTimer]);

  // GPS heartbeat — refresh our own coords in Supabase every 60 seconds while live.
  // Uses low-accuracy (cell/WiFi) to preserve battery. This keeps our position current
  // so the distance filter on other users' screens reflects our actual location.
  // We don't use this to filter others out — open_to_meet=false is the exit signal.
  const gpsHeartbeatRef = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(() => {
    if (gpsHeartbeatRef.current) clearInterval(gpsHeartbeatRef.current);
    if (!isLive || !currentUser) return;
    const refreshGps = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase.from("profiles").update({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            location_updated_at: new Date().toISOString(),
          }).eq("id", currentUser.id);
        },
        () => {}, // silently ignore — next tick will retry
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
      );
    };
    // Run once immediately on going live, then every 60 seconds
    refreshGps();
    gpsHeartbeatRef.current = setInterval(refreshGps, 60_000);
    return () => { if (gpsHeartbeatRef.current) clearInterval(gpsHeartbeatRef.current); };
  }, [isLive, currentUser]);

  const [selectedPersonProfile, setSelectedPersonProfile] = useState<UserProfile|null>(null);
  const newCount = inbox.filter(r=>r.isNew).length;

  // Restore session on mount — handles page refresh and link-based auth (magic link, confirm email)
  useEffect(()=>{
    // Safety timeout — if getSession hangs (e.g. flaky network), fall through to login
    const splashTimeout = setTimeout(() => navigate("login"), 6_000);

    supabase.auth.getSession().then(async({ data:{ session }, error: sessErr })=>{
      clearTimeout(splashTimeout);
      if (sessErr || !session?.user) { navigate("login"); return; }
      try {
        const { data:p, error: profErr } = await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        if (p) {
          setUserAndRef(p as UserProfile);
          const wasLive = localStorage.getItem("here_is_live") === "true";
          if (wasLive) {
            await supabase.from("profiles").update({ open_to_meet: true }).eq("id", session.user.id).catch(()=>{});
          }
          navigate("events");
        } else {
          navigate("onboarding");
        }
      } catch {
        navigate("login");
      }
    }).catch(() => {
      clearTimeout(splashTimeout);
      navigate("login");
    });

    // Listen for auth events triggered by link clicks only
    // (magic link, email confirmation, password reset)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("login");
        return;
      }
      // Only handle SIGNED_IN for link-based flows — not password logins
      // which are handled directly in LoginScreen to avoid a race condition
      if (event === "SIGNED_IN" && session?.user && !currentUserRef.current) {
        try {
          const { data:p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
          if (p) { setUserAndRef(p as UserProfile); navigate("events"); }
          else navigate("onboarding");
        } catch {
          navigate("login");
        }
      }
    });

    return () => { clearTimeout(splashTimeout); subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function navigate(to: Screen, data?: unknown) {
    setData(data??null); setScreen(to); setAnimKey(k=>k+1);
    // When navigating to request screen, fetch the real user profile by id
    if (to === "request" && typeof data === "string") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data).single();
      if (profile) setSelectedPersonProfile(profile as UserProfile);
    }
  }

  function declineRequest(id: number) {
    // Track locally so poll doesn't restore it before DB confirms
    declinedIdsRef.current.add(id);
    supabase.from("meet_requests").update({ status: "declined" }).eq("id", id).then(() => {
      declinedIdsRef.current.delete(id);
      if (currentUser) fetchInbox(currentUser.id);
    });
    // Remove immediately from state — declined requests disappear
    setInbox(prev => prev.filter(r => r.id !== id));
    setAcceptedSent(prev => (prev && (prev as any).requestId === id ? null : prev));
    if (screen === "incoming" || screen === "match") {
      navigate("inbox");
    }
  }
  function dismissRequest(id: number) {
    setInbox(prev=>prev.filter(r=>r.id!==id));
  }

  // Resolve per-screen data
  const selectedEvent    = EVENTS.find(e=>e.id===screenData) ?? EVENTS[0];
  const blankUser: UserProfile = { id:"", email:"", name:"User", age:25, occupation:"Professional", interests:[], languages:[], photo_url:null, bg:BG_OPTIONS[0], open_to_meet:true, checked_in_event_id:null, checked_in_at:null, lat:null, lng:null };
  const selectedPerson = selectedPersonProfile ?? blankUser;
  const selectedRequest  = inbox.find(r=>r.id===screenData) ?? inbox[0];
  const matchData        = (screen==="match" && screenData && typeof screenData==="object")
    ? screenData as { person?:UserProfile; request?:InboxRequest; response?:IncResponse; fromIncoming?:boolean; recipientHint?:string }
    : {};

  const darkScreens: Screen[] = ["splash","login","signup","match","pending"];
  const isDark = darkScreens.includes(screen);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        body{margin:0;font-family:'DM Sans',sans-serif;background:#1A1410;}
        ::-webkit-scrollbar{display:none;}
        @keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse  {0%{box-shadow:0 0 0 0 rgba(74,124,89,0.5)}70%{box-shadow:0 0 0 8px rgba(74,124,89,0)}100%{box-shadow:0 0 0 0 rgba(74,124,89,0)}}
        @keyframes spin   {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      `}</style>

      <div className="flex items-start justify-center min-h-screen" style={{ background:"#1A1410" }}>
        <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", position:"relative", background:isDark?C.ink:C.cream, overflow:"hidden" }}>
          <div key={animKey} style={{ animation:"slideIn 0.28s cubic-bezier(0.4,0,0.2,1) forwards", height:"100vh", display:"flex", flexDirection:"column" }}>

            {screen==="splash"      && <SplashScreen onDone={()=>navigate("login")} />}
            {screen==="login"       && <LoginScreen  onNavigate={navigate} onLogin={u=>{ setUserAndRef(u); navigate("events"); }} />}
            {screen==="signup"      && <SignupScreen onNavigate={navigate} />}
            {screen==="onboarding"  && <OnboardingScreen onDone={p=>{ setUserAndRef(p); navigate("events"); }} />}
            {screen==="events"      && currentUser && <EventsScreen onNavigate={navigate} inboxCount={newCount} />}

            {/* Event detail inline */}
            {screen==="eventdetail" && currentUser && (
              <div className="flex flex-col h-full" style={{ background:C.cream }}>
                <div className="h-48 relative flex items-center justify-center flex-shrink-0" style={{ background:`linear-gradient(160deg,${selectedEvent.gradientFrom},${selectedEvent.gradientTo})` }}>
                  <span className="text-[70px]" style={{ filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}>{selectedEvent.emoji}</span>
                  <div className="absolute top-4 left-4"><BackBtn onClick={()=>navigate("events")} dark /></div>
                  {selectedEvent.sponsored && <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ background:C.accent }}>⭐ Sponsored</div>}
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white" style={{ background:"rgba(74,124,89,0.88)" }}>✦ {selectedEvent.members} members here</div>
                </div>
                <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
                  <div className="px-[22px] pt-[18px]">
                    <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>{selectedEvent.category} · {selectedEvent.venue}</div>
                    <div className="text-[22px] mt-1 leading-snug" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>{selectedEvent.name}</div>
                    <div className="text-[13px] mt-1.5" style={{ color:C.warmMid }}>📅 {selectedEvent.meta}</div>
                    <div className="text-[13px] mt-2.5 leading-relaxed" style={{ color:C.inkSoft }}>{selectedEvent.desc}</div>
                  </div>
                  <div className="px-[22px] pt-4">
                    {selectedEvent.sponsored ? (
                      <div className="flex gap-2.5">
                        <button className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.accent }}>🎟 Buy Ticket</button>
                        <button className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold border-0 cursor-pointer" style={{ background:"rgba(139,115,85,0.12)", color:C.ink }}>📷 Scan QR</button>
                      </div>
                    ) : (
                      <button className="w-full py-3.5 rounded-2xl text-[15px] font-semibold border-0 cursor-pointer" style={{ background:"rgba(139,115,85,0.12)", color:C.ink }}>📷 Scan venue QR to check in</button>
                    )}
                  </div>
                  <div className="h-6" />
                </div>
                <BottomNav active="events" onNavigate={navigate} inboxCount={newCount} />
              </div>
            )}

            {screen==="nearby"   && currentUser && <NearbyScreen  currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} locationGranted={locationGranted} onForceTurnOff={(fn)=>{ turnOffLiveRef.current = fn; }} blockedIds={blockedIds} isLive={isLive} setIsLive={setIsLive} interactedIds={interactedIds} setInteractedIds={setInteractedIds} />}
            {screen==="request"  && currentUser && <RequestScreen  person={selectedPerson} currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} />}
            {screen==="inbox"    &&                <InboxScreen    requests={inbox} onNavigate={navigate} onDecline={declineRequest} onDismiss={dismissRequest} acceptedSent={acceptedSent} onViewMatch={()=>{ if(acceptedSent){ setAcceptedSent(null); navigate("match",{ person: acceptedSent.person, recipientHint: acceptedSent.recipientHint, fromIncoming: false }); }}} />}
            {screen==="incoming" && selectedRequest && <IncomingScreen request={selectedRequest} onNavigate={navigate} inboxCount={newCount} onDecline={declineRequest} />}
            {screen==="incoming" && !selectedRequest && (() => { navigate("inbox"); return null; })()}
            {screen==="match"    && currentUser && <MatchScreen    matchData={matchData} onNavigate={navigate} currentUser={currentUser} onBlock={(blockedId)=>setBlockedIds(prev=>[...prev,blockedId])} onDecline={declineRequest} onClearAccepted={()=>{ if(acceptedSent){ seenAcceptedIdsRef.current.add(acceptedSent.requestId); } setAcceptedSent(null); }} onMetThem={(id)=>setInteractedIds(prev=>[...prev,id])} />}
            {screen==="pending"  && currentUser && (() => { const pd = screenData as any; const pPerson = pd?.person ?? blankUser; const pSentAt = pd?.sentAt ?? new Date().toISOString(); return <PendingScreen person={pPerson} sentAt={pSentAt} onNavigate={navigate} inboxCount={newCount} currentUser={currentUser} />; })()}
            {screen==="profile"  && currentUser && <ProfileScreen  currentUser={currentUser} onNavigate={navigate} onSignOut={()=>{ setUserAndRef(null); navigate("login"); }} inboxCount={newCount} locationGranted={locationGranted} setLocationGranted={setLocationGranted} autoOffTimer={autoOffTimer} setAutoOffTimer={setAutoOffTimer} />}
          </div>
        </div>
      </div>
    </>
  );
}

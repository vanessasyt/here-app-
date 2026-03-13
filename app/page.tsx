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
  { id:0, emoji:"🎻", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"classical", name:"LSO — An Evening of Brahms", venue:"Barbican Centre", area:"Barbican", meta:"Tonight 7:30pm · from £35", members:34, time:"Starts 7:30pm", sponsored:true, buyTicket:true, section:"tonight", desc:"The LSO performs Brahms' Symphony No. 4 and Piano Concerto No. 1. One of London's great concert series." },
  { id:1, emoji:"🍷", gradientFrom:"#1a2535", gradientTo:"#243045", category:"wine",      name:"Terroirs Natural Wine Evening",      venue:"Terroirs Wine Bar",    area:"Strand",        meta:"Tonight · until 11pm · Free",     members:27, time:"Until 11pm",     section:"tonight", desc:"The best natural wine bar in London opens its doors for an evening of exceptional low-intervention wines." },
  { id:2, emoji:"🎨", gradientFrom:"#1e1a30", gradientTo:"#2d1e3a", category:"art",       name:"Tate Modern Late — After Hours",     venue:"Tate Modern",          area:"Bankside",      meta:"Tonight until 10pm · £12",        members:42, time:"Until 10pm",      section:"tonight", desc:"Private evening access to the galleries with a specially curated DJ set." },
  { id:3, emoji:"🎷", gradientFrom:"#182a1e", gradientTo:"#223828", category:"music",     name:"Jazz at Ronnie Scott's",             venue:"Ronnie Scott's",       area:"Soho",          meta:"Tonight 9:30pm · from £30",       members:38, time:"Starts 9:30pm",  buyTicket:true, section:"tonight", desc:"The world-famous jazz club presents a late set with some of London's finest jazz musicians." },
  { id:4, emoji:"💃", gradientFrom:"#2a1035", gradientTo:"#4a1060", category:"dance",     name:"Bachata Social Night",               venue:"Café Salsa",           area:"Covent Garden", meta:"Tonight 9pm–2am",                 members:31, time:"9pm–2am",         section:"tonight", desc:"A vibrant bachata social night in the heart of Covent Garden. All levels welcome." },
  { id:5, emoji:"🎭", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"classical", name:"ENO — La Traviata Opening Night",    venue:"London Coliseum",      area:"West End",      meta:"Friday 8pm · from £25",           members:25, time:"Fri 8pm",         sponsored:true, buyTicket:true, section:"week", desc:"English National Opera's new production of Verdi's La Traviata." },
  { id:6, emoji:"🖼️", gradientFrom:"#1a2535", gradientTo:"#243045", category:"art",       name:"National Portrait Gallery Members Evening", venue:"NPG",           area:"St Martin's Place", meta:"Thursday 6:30pm · Members free", members:29, time:"Thu",          section:"week", desc:"Exclusive after-hours access for members." },
  { id:7, emoji:"🌿", gradientFrom:"#182a1e", gradientTo:"#223828", category:"wine",      name:"Borough Market — After Dark",        venue:"Borough Market",       area:"Borough",       meta:"Saturday 6pm · Free",             members:46, time:"Sat",             section:"week", desc:"London's most iconic food market stays open late." },
];

// 20 interests — each user picks up to 4
const INTERESTS: { id: string; emoji: string; label: string }[] = [
  { id:"music",        emoji:"", label:"Music"        },
  { id:"art",          emoji:"", label:"Art"          },
  { id:"travel",       emoji:"", label:"Travel"       },
  { id:"food",         emoji:"", label:"Food"         },
  { id:"fitness",      emoji:"", label:"Fitness"      },
  { id:"sports",       emoji:"", label:"Sports"       },
  { id:"film",         emoji:"", label:"Film"         },
  { id:"wine",         emoji:"", label:"Wine"         },
  { id:"dance",        emoji:"", label:"Dance"        },
  { id:"reading",      emoji:"", label:"Reading"      },
  { id:"photography",  emoji:"", label:"Photography"  },
  { id:"cooking",      emoji:"", label:"Cooking"      },
  { id:"theatre",      emoji:"", label:"Theatre"      },
  { id:"gaming",       emoji:"", label:"Gaming"       },
  { id:"tech",         emoji:"", label:"Tech"         },
  { id:"fashion",      emoji:"", label:"Fashion"      },
  { id:"architecture", emoji:"", label:"Architecture" },
  { id:"comedy",       emoji:"", label:"Comedy"       },
  { id:"volunteering", emoji:"", label:"Volunteering" },
  { id:"podcasts",     emoji:"", label:"Podcasts"     },
];

const MAX_INTERESTS = 4;

const BG_OPTIONS = [
  "linear-gradient(160deg,#d4a5a5,#c47a6b)",
  "linear-gradient(160deg,#a5c4d4,#6b8fc4)",
  "linear-gradient(160deg,#a5d4b5,#6ba87c)",
  "linear-gradient(160deg,#d4c4a5,#c4a06b)",
  "linear-gradient(160deg,#c4a5d4,#8f6bc4)",
  "linear-gradient(160deg,#d4d4a5,#c4c46b)",
];

const INTEREST_STYLE: Record<string, { background: string; color: string }> = {
  music:        { background:"rgba(100,80,160,0.1)",   color:"#6450A0" },
  art:          { background:"rgba(60,120,160,0.1)",    color:"#3C78A0" },
  travel:       { background:"rgba(60,160,120,0.1)",    color:"#3CA078" },
  food:         { background:"rgba(196,120,58,0.12)",   color:"#C4783A" },
  fitness:      { background:"rgba(80,140,80,0.12)",    color:"#3a8a3a" },
  sports:       { background:"rgba(58,100,196,0.12)",   color:"#3a60c4" },
  film:         { background:"rgba(160,100,40,0.12)",   color:"#a06428" },
  wine:         { background:"rgba(160,60,80,0.1)",     color:"#A03C50" },
  dance:        { background:"rgba(196,58,160,0.1)",    color:"#c43aa0" },
  reading:      { background:"rgba(80,80,80,0.1)",      color:"#505050" },
  photography:  { background:"rgba(40,100,160,0.1)",    color:"#2864A0" },
  cooking:      { background:"rgba(196,140,40,0.12)",   color:"#c48c28" },
  theatre:      { background:"rgba(120,40,120,0.1)",    color:"#782878" },
  gaming:       { background:"rgba(40,140,180,0.1)",    color:"#288cb4" },
  tech:         { background:"rgba(60,80,180,0.1)",     color:"#3c50b4" },
  fashion:      { background:"rgba(200,80,120,0.1)",    color:"#c85078" },
  architecture: { background:"rgba(100,80,60,0.1)",     color:"#64503c" },
  comedy:       { background:"rgba(220,160,40,0.12)",   color:"#dca028" },
  volunteering: { background:"rgba(60,160,100,0.1)",    color:"#3ca064" },
  podcasts:     { background:"rgba(140,60,200,0.1)",    color:"#8c3cc8" },
  // legacy aliases so old profiles still render
  gym:          { background:"rgba(80,140,80,0.12)",    color:"#3a8a3a" },
  movies:       { background:"rgba(160,100,40,0.12)",   color:"#a06428" },
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
  if (mins < 1)  return "Just arrived";
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
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (!profile) onNavigate("onboarding"); else onLogin(profile as UserProfile);
    setLoading(false);
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'DM Sans',sans-serif" };

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div className="text-[36px] mb-2" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>here.</div>
        <div className="text-sm mb-10" style={{ color:"rgba(245,240,232,0.45)" }}>Meet in the moment</div>
        <div className="w-full space-y-3">
          <input value={email}    onChange={e=>setEmail(e.target.value)}    type="email"    placeholder="Email address" className={inp} style={inpStyle} />
          <input value={password} onChange={e=>setPass(e.target.value)}     type="password" placeholder="Password"       className={inp} style={inpStyle} onKeyDown={e=>e.key==="Enter"&&handle()} />
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </div>
        <div className="mt-6 text-sm" style={{ color:"rgba(245,240,232,0.45)" }}>
          New here?{" "}
          <button onClick={()=>onNavigate("signup")} className="border-0 bg-transparent cursor-pointer font-semibold" style={{ color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>Create account</button>
        </div>
      </div>
    </div>
  );
}

// ── Sign-up ────────────────────────────────────────────────
function SignupScreen({ onNavigate }: { onNavigate:(s:Screen)=>void }) {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!email||!pass)          { setError("Please fill in all fields"); return; }
    if (pass!==confirm)         { setError("Passwords don't match"); return; }
    if (pass.length<6)          { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const { error:err } = await supabase.auth.signUp({ email, password:pass });
    if (err) { setError(err.message); setLoading(false); return; }
    // Sign in immediately so session is active before onboarding saves profile
    const { error:signInErr } = await supabase.auth.signInWithPassword({ email, password:pass });
    if (signInErr) { setError("Account created — please sign in."); setLoading(false); onNavigate("login"); return; }
    setLoading(false); onNavigate("onboarding");
  }

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm outline-none";
  const inpStyle = { background:"rgba(245,240,232,0.08)", border:"1px solid rgba(245,240,232,0.15)", color:C.cream, fontFamily:"'DM Sans',sans-serif" };

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.ink }}>
      <div className="flex-1 flex flex-col px-8 pt-14 pb-8">
        <div className="mb-8">
          <div className="text-[28px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>Create account</div>
          <div className="text-sm mt-1.5" style={{ color:"rgba(245,240,232,0.45)" }}>Join here. and meet people around you</div>
        </div>
        <div className="space-y-3">
          <input value={email}   onChange={e=>setEmail(e.target.value)}   type="email"    placeholder="Email address"          className={inp} style={inpStyle} />
          <input value={pass}    onChange={e=>setPass(e.target.value)}    type="password" placeholder="Password (min 6 chars)"  className={inp} style={inpStyle} />
          <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirm password"        className={inp} style={inpStyle} onKeyDown={e=>e.key==="Enter"&&handle()} />
          {error && <div className="text-xs text-center" style={{ color:"#f87171" }}>{error}</div>}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity" style={{ background:C.accent, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
            {loading ? "Creating account…" : "Create account →"}
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

// ── Onboarding — 3 steps with photo upload ─────────────────
function OnboardingScreen({ onDone }: { onDone:(p:UserProfile)=>void }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState("");
  const [age,  setAge]            = useState("");
  const [occ,  setOcc]            = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [photoPreview, setPreview]= useState<string|null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef                   = useRef<HTMLInputElement>(null);
  const bg = BG_OPTIONS[Math.floor(Math.random() * BG_OPTIONS.length)];

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(x=>x!==id) : prev.length<MAX_INTERESTS ? [...prev,id] : prev);
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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

    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    // Upload photo → get public URL
    let photo_url: string|null = null;
    if (photoFile) {
      const ext  = photoFile.name.split(".").pop() ?? "jpg";
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (upErr) { setError("Photo upload failed: " + upErr.message); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      photo_url = urlData.publicUrl + `?v=${Date.now()}`;
    }

    const profile: UserProfile = {
      id: user.id, email: user.email ?? "", name, age: parseInt(age),
      occupation: occ, interests, photo_url, bg,
      open_to_meet: false, checked_in_event_id: null, checked_in_at: null, lat: null, lng: null,
    };
    const { error: dbErr } = await supabase.from("profiles").upsert(profile);
    if (dbErr) { setError(dbErr.message); setLoading(false); return; }
    setLoading(false);
    onDone(profile);
  }

  const canStep1 = name.trim() && age && parseInt(age)>=18 && occ.trim();

  return (
    <div className="flex-1 flex flex-col" style={{ background: C.cream }}>
      {/* Progress bar */}
      <div className="px-6 pt-12">
        <div className="flex gap-1.5 mb-6">
          {[1,2,3].map(s=>(
            <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: s<=step ? C.accent : "rgba(139,115,85,0.2)" }} />
          ))}
        </div>
      </div>

      {/* ─── Step 1: Photo + basic info ─── */}
      {step===1 && (
        <div className="flex-1 flex flex-col px-6 pb-8 overflow-y-auto">
          <div className="mb-5">
            <div className="text-[26px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Tell us about you</div>
            <div className="text-sm mt-1" style={{ color:C.warmMid }}>This is what others will see</div>
          </div>

          {/* Photo upload */}
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-3" style={{ color:C.warmMid }}>Profile photo</div>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: photoPreview ? "transparent" : "rgba(139,115,85,0.1)", border:`2px dashed ${photoPreview ? C.green : C.border}` }}>
                {photoPreview
                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                  : <span className="text-2xl opacity-40">📷</span>}
              </div>
              <div className="flex-1">
                <button onClick={()=>fileRef.current?.click()}
                  className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer border-0"
                  style={{ background: photoPreview ? "rgba(74,124,89,0.12)" : C.ink, color: photoPreview ? C.green : C.cream, fontFamily:"'DM Sans',sans-serif" }}>
                  {photoPreview ? "✓ Change photo" : "Upload photo"}
                </button>
                <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color:C.warmMid }}>
                  {photoPreview ? "Looking good! You can change it later in Profile." : "JPG or PNG · Max 5 MB · Optional — you can add one later"}
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label:"First name",  val:name, set:setName, placeholder:"e.g. Sophie", type:"text"   },
              { label:"Age",         val:age,  set:setAge,  placeholder:"e.g. 26",     type:"number" },
              { label:"Occupation",  val:occ,  set:setOcc,  placeholder:"e.g. Architect", type:"text" },
            ].map(({ label,val,set,placeholder,type }) => (
              <div key={label}>
                <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.warmMid }}>{label}</div>
                <input value={val} onChange={e=>set(e.target.value)} type={type} placeholder={placeholder} min={type==="number"?"18":undefined}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'DM Sans',sans-serif" }} />
              </div>
            ))}
          </div>

          {error && <div className="text-xs mb-3 text-center" style={{ color:"#ef4444" }}>{error}</div>}
          <button onClick={()=>canStep1&&setStep(2)} disabled={!canStep1}
            className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer mt-auto transition-opacity"
            style={{ background:C.accent, opacity:canStep1?1:0.4, fontFamily:"'DM Sans',sans-serif" }}>
            Next →
          </button>
        </div>
      )}

      {/* ─── Step 2: Interests ─── */}
      {step===2 && (
        <div className="flex-1 flex flex-col px-6 pb-8" style={{ minHeight:0 }}>
          <div className="mb-3 flex-shrink-0">
            <div className="text-[26px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Your interests</div>
            <div className="text-sm mt-1" style={{ color:C.warmMid }}>Pick up to {MAX_INTERESTS} — shown as conversation starters on your card</div>
          </div>

          {/* Fairness notice */}
          <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(196,120,58,0.07)", color:C.inkSoft, border:`1px solid rgba(196,120,58,0.15)` }}>
            💬 These tags <strong>never</strong> affect who sees you or in what order — purely for starting conversations.
          </div>

          {/* Counter + clear */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="text-xs font-semibold" style={{ color:C.inkSoft }}>
              {interests.length === MAX_INTERESTS
                ? <span style={{ color:C.green }}>✓ {MAX_INTERESTS} selected</span>
                : <span style={{ color:C.warmMid }}>{interests.length} / {MAX_INTERESTS} selected</span>}
            </div>
            {interests.length > 0 && (
              <button onClick={()=>setInterests([])} className="text-xs border-0 bg-transparent cursor-pointer" style={{ color:C.warmMid, fontFamily:"'DM Sans',sans-serif" }}>Clear all</button>
            )}
          </div>

          {/* Interest pills — scrollable */}
          <div className="flex flex-wrap gap-2 mb-4 overflow-y-auto flex-1" style={{ minHeight:0 }}>
            {INTERESTS.map(item => {
              const on     = interests.includes(item.id);
              const maxed  = !on && interests.length >= MAX_INTERESTS;
              return (
                <button key={item.id}
                  onClick={()=>{ if (!maxed) toggleInterest(item.id); }}
                  className="flex items-center gap-1.5 px-3 py-[7px] rounded-full text-sm font-medium transition-all duration-150 border"
                  style={{
                    background:  on ? C.ink : maxed ? "rgba(139,115,85,0.04)" : "white",
                    borderColor: on ? C.ink : maxed ? "rgba(139,115,85,0.1)"  : C.border,
                    color:       on ? C.cream : maxed ? "rgba(139,115,85,0.28)" : C.inkSoft,
                    cursor:      maxed ? "not-allowed" : "pointer",
                    fontFamily:  "'DM Sans',sans-serif",
                    opacity:     maxed ? 0.55 : 1,
                    alignSelf:   "flex-start",
                  }}>
                  <span style={{ fontSize:13, lineHeight:1 }}>{item.emoji}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {error && <div className="text-xs mb-2 text-center flex-shrink-0" style={{ color:"#ef4444" }}>{error}</div>}

          <div className="flex gap-3 flex-shrink-0">
            <button onClick={()=>setStep(1)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
            <button onClick={()=>interests.length>0&&setStep(3)} disabled={!interests.length}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.accent, opacity:interests.length?1:0.4, fontFamily:"'DM Sans',sans-serif" }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Preview ─── */}
      {step===3 && (
        <div className="flex-1 flex flex-col px-6 pb-8 overflow-y-auto">
          <div className="mb-5">
            <div className="text-[26px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>You&apos;re all set</div>
            <div className="text-sm mt-1" style={{ color:C.warmMid }}>Here&apos;s how others will see your card</div>
          </div>

          {/* Card preview — mirrors NearbyCard hierarchy */}
          <div className="rounded-[20px] overflow-hidden mb-5" style={{ boxShadow:"0 4px 24px rgba(26,20,16,0.12)", border:`2px solid ${C.green}`, maxWidth:180, alignSelf:"center", width:"100%" }}>
            {/* Photo / avatar */}
            <div className="h-44 relative overflow-hidden">
              {photoPreview
                ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                : <div className="w-full h-full flex items-center justify-center font-bold text-white text-6xl" style={{ background:bg }}>{name[0]?.toUpperCase()}</div>}
              {/* (1) Open to meet */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background:C.green }}>✦ Open</div>
              <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px]" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}>✓</div>
              {/* (2) Time at event */}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] font-semibold text-white text-center"
                style={{ background:"linear-gradient(to top,rgba(26,20,16,0.75),transparent)" }}>
                Just arrived
              </div>
            </div>
            {/* (3) Brief info */}
            <div className="px-3 pt-2 pb-1 bg-white">
              <div className="font-semibold text-sm" style={{ color:C.ink }}>{name||"Your name"}, {age||"??"}</div>
              <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>{occ||"Occupation"}</div>
            </div>
            {/* (4) Interest tags */}
            <div className="px-3 pb-3 bg-white flex flex-wrap gap-1">
              {interests.map(i=><InterestTag key={i} interest={i} />)}
            </div>
          </div>

          {error && <div className="text-xs mb-3 text-center" style={{ color:"#ef4444" }}>{error}</div>}
          <div className="flex gap-3 mt-auto">
            <button onClick={()=>setStep(2)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
            <button onClick={finish} disabled={loading}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.green, opacity:loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
              {loading ? "Saving…" : "Enter here. ✦"}
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
  const cats = ["all","classical","wine","art","music","dance"];
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
        {cats.map(c=><Chip key={c} label={c==="all"?"All":c==="wine"?"Wine & Food":c==="music"?"Live Music":c.charAt(0).toUpperCase()+c.slice(1)} active={cat===c} onClick={()=>setCat(c)} />)}
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
          Open
        </div>
        {/* Verified tick */}
        <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px]" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}>✓</div>

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
      <div className="px-2.5 pb-1.5 flex flex-wrap gap-1 min-h-[20px]">
        {user.interests.slice(0,3).map(i=><InterestTag key={i} interest={i} />)}
      </div>

      <div className="flex gap-1.5 px-2.5 pb-2.5">
        <button onClick={onSayHi}   className="flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.green }}>Say hi →</button>
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
  currentUser, onNavigate, inboxCount, locationGranted, onForceTurnOff, blockedIds,
}: { currentUser:UserProfile; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number; locationGranted:boolean; onForceTurnOff:(fn:()=>void)=>void; blockedIds:string[] }) {
  const [locOn,     setLocOn]     = useState(false);
  const [rawUsers,  setRawUsers]  = useState<UserProfile[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [offset,    setOffset]    = useState(0);   // round-robin pointer
  const [myLat,     setMyLat]     = useState<number|null>(currentUser.lat ?? null);
  const [myLng,     setMyLng]     = useState<number|null>(currentUser.lng ?? null);
  const [locError,  setLocError]  = useState<string|null>(null);

  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const fetchUsers = useCallback(async () => {
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
    // Also exclude client-side blockedIds
    blockedIds.forEach(id => excludeIds.add(id));

    let q = supabase.from("profiles").select("*").eq("open_to_meet",true).neq("id",currentUser.id);
    if (currentUser.checked_in_event_id !== null) {
      q = q.eq("checked_in_event_id", currentUser.checked_in_event_id);
    }
    const { data } = await q;
    const filtered = ((data as UserProfile[]) ?? []).filter(u => !excludeIds.has(u.id));
    setRawUsers(filtered);
  }, [currentUser.id, currentUser.checked_in_event_id, blockedIds]);

  async function toggleLoc() {
    if (locOn) {
      // Turn OFF
      setLocOn(false);
      await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null }).eq("id",currentUser.id);
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

        await supabase.from("profiles")
          .update({ open_to_meet:true, lat, lng })
          .eq("id", currentUser.id);

        await fetchUsers();
        setLoading(false);
        setLocOn(true);

        pollRef.current = setInterval(fetchUsers, 15_000);
        rotationRef.current = setInterval(()=>setOffset(o=>o+1), ROTATION_MS);

        // Register callback so App-level timer can force turn off
        onForceTurnOff(async () => {
          setLocOn(false);
          await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null }).eq("id", currentUser.id);
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
      supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null }).eq("id", currentUser.id);
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

  // Round-robin all open users (no distance filter — page ranks by proximity already)
  const ordered = applyRoundRobin(rawUsers, offset);
  const visible = ordered.filter(u=>!dismissed.includes(u.id) && !blockedIds.includes(u.id));

  const eventName = currentUser.checked_in_event_id !== null
    ? (EVENTS.find(e=>e.id===currentUser.checked_in_event_id)?.name ?? "this event")
    : null;

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      {/* Header — discoverability pill lives in top-right */}
      <div className="flex justify-between items-center px-5 pt-5 pb-0 flex-shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>
            {eventName ? `At ${eventName}` : "General mode"}
          </div>
          <div className="text-[22px] mt-0.5" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Nearby</div>
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
          <span>🔄</span>
          <span>Cards rotate every 5 minutes — <strong>no scores, no popularity metrics, no persistent rankings.</strong> Everyone gets equal exposure.</span>
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
              <div className="text-[14px] font-semibold mb-1.5" style={{ color:C.ink }}>No one else is open to meet yet</div>
              <div className="text-xs leading-relaxed" style={{ color:C.warmMid }}>Be the first — others will appear as they turn on discoverability</div>
            </div>
          ) : (
            <div className="px-5 pt-3 grid grid-cols-2 gap-3">
              {visible.map(u=>(
                <NearbyCard
                  key={u.id}
                  user={u}
                  onSayHi={()=>onNavigate("request",u.id)}
                  onDismiss={()=>setDismissed(prev=>[...prev,u.id])}
                />
              ))}
            </div>
          )}

          <div className="mx-5 mt-3.5 mb-2 p-3 rounded-xl text-xs leading-relaxed flex gap-2" style={{ background:"rgba(139,115,85,0.08)", color:C.warmMid }}>
            <span>🔒</span><span>Others only see your approximate area, never your exact location. Visibility ends when the event does.</span>
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
  const [hint, setHint] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const firstName = person.name.split(",")[0];

  async function sendRequest() {
    setSending(true); setError("");
    const sentAt = new Date().toISOString();
    const { error: err } = await supabase.from("meet_requests").insert({
      from_id:    currentUser.id,
      to_id:      person.id,
      hint:       hint.trim() || null,
      status:     "pending",
      created_at: sentAt,
    });
    setSending(false);
    if (err) { setError("Failed to send: " + err.message); return; }
    onNavigate("pending", { person, sentAt });
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-5 flex items-center gap-3.5 flex-shrink-0">
        <BackBtn onClick={()=>onNavigate("nearby")} />
        <AvatarCircle user={person} size={52} />
        <div>
          <div className="text-[19px]" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>{person.name}, {person.age}</div>
          <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{person.occupation} · Verified · Open to meet</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="px-[22px] pt-[18px]">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2.5" style={{ color:C.warmMid }}>Say hi to {firstName}</div>
          <div className="p-3.5 rounded-[14px] text-[13px] leading-relaxed" style={{ background:"rgba(196,120,58,0.07)", border:"1px solid rgba(196,120,58,0.2)", color:C.inkSoft }}>
            👋 Sending a <strong style={{ color:C.ink }}>Say Hi</strong> request lets them know you&apos;d like to meet.
          </div>
        </div>
        <div className="px-[22px] pt-3.5">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>
            Your identifying hint <span className="normal-case text-[10px] font-normal">(so they can spot you)</span>
          </div>
          <textarea value={hint} onChange={e=>setHint(e.target.value)} maxLength={120}
            placeholder="e.g. I'm wearing a red jacket near the bar…"
            className="w-full p-3 rounded-[14px] text-[13px] resize-none outline-none leading-relaxed"
            style={{ border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", color:C.ink, background:"white", height:72 }} />
          <div className="text-[11px] text-right mt-1" style={{ color:C.warmMid }}>{hint.length} / 120</div>
        </div>
        <div className="mx-[22px] mt-3 p-3 rounded-xl text-xs leading-relaxed flex gap-2" style={{ background:"rgba(139,115,85,0.08)", color:C.warmMid }}>
          <span>⚡</span><span>You have <strong>2 of 3</strong> daily requests remaining · max 1 per person per day</span>
        </div>
        <button onClick={sendRequest} disabled={sending}
          className="mx-[22px] mt-3.5 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:C.ink, width:"calc(100% - 44px)", opacity:sending?0.6:1 }}>
          {sending ? "Sending…" : "Send meet request →"}
        </button>
        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <div className="text-xs text-center mt-2 px-[22px] leading-relaxed" style={{ color:C.warmMid }}>
          {firstName} is only notified if they also marked you as open to meet. Two-step consent.
        </div>
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
          Waiting for <strong style={{ color:"rgba(245,240,232,0.8)" }}>{firstName}</strong> to respond. If they accept, you&apos;ll see it in your <strong style={{ color:"rgba(245,240,232,0.8)" }}>Meet Requests</strong> inbox — tap it to see the match screen.
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
            When {firstName} accepts, their request will appear in your <strong style={{ color:"rgba(245,240,232,0.75)" }}>Meet Requests</strong> inbox. Open it to see the mutual match screen and their identifying hint.
          </div>
        </div>

        <div className="text-xs leading-relaxed" style={{ color:"rgba(245,240,232,0.35)" }}>
          🔒 Hints auto-erase after 30 min · location never shared
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
  const newReqs = requests.filter(r=>r.isNew);
  const oldReqs = requests.filter(r=>!r.isNew);

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-5 flex-shrink-0">
        <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Incoming</div>
        <div className="text-[22px] mt-0.5" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.ink }}>Meet Requests</div>
      </div>

      {/* Accepted sent request banner — shown to the sender */}
      {acceptedSent && (
        <div className="mx-[22px] mt-3 px-4 py-3 rounded-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:"rgba(74,124,89,0.12)", border:"1.5px solid rgba(74,124,89,0.4)", boxShadow:"0 2px 14px rgba(74,124,89,0.12)" }}
          onClick={onViewMatch}>
          <div className="flex items-center gap-3">
            <AvatarCircle user={acceptedSent.person} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color:C.ink }}>✨ It&apos;s a match with {acceptedSent.person.name.split(",")[0]}!</div>
              <div className="text-xs mt-0.5" style={{ color:C.green }}>They accepted your request — tap to see the match</div>
            </div>
            <span style={{ color:C.green, fontSize:18 }}>→</span>
          </div>
        </div>
      )}
      {newReqs.length>0 && (
        <div className="mx-[22px] mt-3 px-4 py-3 rounded-[14px] flex items-center gap-2.5" style={{ background:"rgba(74,124,89,0.12)", border:"1px solid rgba(74,124,89,0.25)" }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ background:C.green, animation:"pulse 2s infinite" }} />
          <div className="text-[13px] font-semibold" style={{ color:C.green }}>{newReqs.length} new request{newReqs.length>1?"s":""} right now</div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="pt-3.5">
          {newReqs.map(r=>(
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
          {oldReqs.length>0 && (<>
            <div className="px-5 pb-2 text-[11px] uppercase tracking-[1.2px] font-semibold" style={{ color:C.warmMid }}>Earlier</div>
            {oldReqs.map(r=>(
              <div key={r.id} className="mx-5 mb-3 p-4 rounded-[18px]" style={{ background:"white", border:`1.5px solid ${C.border}`, boxShadow:"0 2px 14px rgba(26,20,16,0.07)", opacity:0.65 }}>
                <div className="flex items-center gap-3">
                  <div className="w-2" />
                  <AvatarCircle user={{ photo_url:r.photo_url, bg:r.bg, name:r.name }} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color:C.ink }}>{r.name}</div>
                    <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{r.meta}</div>
                    <div className="text-[11px] mt-1" style={{ color:C.warmMid }}>{r.reqLabel}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="text-[11px]" style={{ color:C.warmMid }}>{r.time}</div>
                    <button onClick={()=>onDismiss(r.id)} className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs cursor-pointer" style={{ border:`1px solid ${C.border}`, background:"white", color:C.warmMid }}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </>)}
          {!requests.length && <div className="px-5 py-8 text-center text-[13px]" style={{ color:C.warmMid }}>No requests yet</div>}
          <div className="mx-5 mt-2 p-3.5 rounded-[14px] text-xs leading-relaxed" style={{ background:"rgba(139,115,85,0.07)", color:C.warmMid }}>
            🔒 You&apos;re only notified when both parties are open to meet. Requests expire in 30 min.
          </div>
        </div>
        <div className="h-2" />
      </div>
      <BottomNav active="inbox" onNavigate={onNavigate} inboxCount={newReqs.length} />
    </div>
  );
}

// ── Incoming ───────────────────────────────────────────────
function IncomingScreen({
  request, onNavigate, inboxCount, onDecline,
}: { request:InboxRequest; onNavigate:(s:Screen,d?:unknown)=>void; inboxCount:number; onDecline:(id:number)=>void }) {
  const [response, setResponse] = useState<IncResponse>("accept");
  const [hint, setHint]         = useState("");
  const [sending, setSending]   = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError]       = useState("");
  const firstName               = request.name.split(",")[0];
  const options: { id:IncResponse; icon:string; label:string; sub:string }[] = [
    { id:"accept", icon:"✅", label:"Accept — meet now",  sub:"I'll come find you"       },
    { id:"15min",  icon:"⏱️", label:"Meet in 15 min",     sub:"I'll be with you shortly" },
    { id:"30min",  icon:"🕐", label:"Meet in 30 min",     sub:"See you in a bit"         },
  ];

  async function confirm() {
    setSending(true); setError("");
    const { error: err } = await supabase
      .from("meet_requests")
      .update({ status: "accepted", recipient_hint: hint.trim() || null, response_timing: response })
      .eq("id", request.id);
    setSending(false);
    if (err) { setError("Failed: " + err.message); return; }
    onNavigate("match", { request, response, fromIncoming: true, recipientHint: hint.trim() });
  }

  async function handleDecline() {
    setDeclining(true);
    await supabase.from("meet_requests").update({ status: "declined" }).eq("id", request.id);
    onDecline(request.id);
    // onDecline already navigates away to inbox, so no need to set local declined state
    setDeclining(false);
  }

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-[22px] flex items-center gap-3 flex-shrink-0">
        <BackBtn onClick={()=>onNavigate("inbox")} />
        <div className="text-xs uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>Meet request</div>
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
        {/* Show sender's hint */}
        <div className="mx-[22px] mt-3.5 p-[14px_18px] rounded-2xl" style={{ background:"rgba(196,120,58,0.15)", border:"1px solid rgba(196,120,58,0.3)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.accent }}>Their identifying hint</div>
          {request.hint
            ? <div className="text-[15px] font-semibold" style={{ color:C.ink }}>👋 &ldquo;{request.hint}&rdquo;</div>
            : <div className="text-[14px]" style={{ color:C.inkSoft }}>👋 {firstName} wants to meet — no hint provided</div>
          }
          <div className="text-xs mt-1 leading-relaxed" style={{ color:C.inkSoft }}>Accepting will share your hint with {firstName}.</div>
        </div>
        <div className="px-[22px] pt-3.5">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2.5" style={{ color:C.warmMid }}>Your response</div>
          {options.map(opt=>(
            <div key={opt.id} onClick={()=>setResponse(opt.id)}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl mb-2.5 cursor-pointer transition-all duration-200"
              style={{ border:`1.5px solid ${response===opt.id?C.accent:C.border}`, background:response===opt.id?"rgba(196,120,58,0.15)":"transparent" }}>
              <span className="text-[22px] w-[34px] text-center">{opt.icon}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color:C.ink }}>{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ color:C.warmMid }}>{opt.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-[22px] pt-1">
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>
            Your identifying hint <span className="normal-case text-[10px] font-normal">(so they can spot you)</span>
          </div>
          <textarea value={hint} onChange={e=>setHint(e.target.value)} maxLength={120}
            placeholder="e.g. I'm in a green top near the entrance…"
            className="w-full p-3 rounded-[14px] text-[13px] resize-none outline-none leading-relaxed"
            style={{ border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", color:C.ink, background:"white", height:72 }} />
          <div className="text-[11px] text-right mt-1" style={{ color:C.warmMid }}>{hint.length} / 120</div>
        </div>
        {error && <div className="text-xs text-center mt-2 px-[22px]" style={{ color:"#ef4444" }}>{error}</div>}
        <button onClick={confirm} disabled={sending}
          className="mx-[22px] mt-3 py-[15px] rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:C.green, width:"calc(100% - 44px)", opacity:sending?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
          {sending ? "Confirming…" : "Confirm response →"}
        </button>
        {/* Decline button */}
        <button onClick={handleDecline} disabled={declining}
          className="mx-[22px] mt-2.5 py-[13px] rounded-2xl text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.warmMid, width:"calc(100% - 44px)", fontFamily:"'DM Sans',sans-serif", opacity:declining?0.5:1 }}>
          {declining ? "Declining…" : "Decline request"}
        </button>
        <div className="h-6" />
      </div>
      <BottomNav active="inbox" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

// ── Match ──────────────────────────────────────────────────
function MatchScreen({
  matchData, onNavigate, currentUser, onBlock,
}: { matchData:{ person?:UserProfile; request?:InboxRequest; response?:IncResponse; fromIncoming?:boolean; recipientHint?:string }; onNavigate:(s:Screen,d?:unknown)=>void; currentUser:UserProfile; onBlock:(id:string)=>void }) {
  const person    = matchData.person || matchData.request;
  const firstName = person ? person.name.split(",")[0] : "They";
  const timerMins = matchData.response==="15min" ? 15 : 30;
  const reportedId = (matchData.person?.id) || ((matchData.request as any)?.from_id) || null;
  const fromIncoming = matchData.fromIncoming ?? false;

  // The hint to show depends on perspective:
  // - If recipient (fromIncoming=true): show sender's hint (from request.hint)
  // - If sender (fromIncoming=false): show recipient's hint (recipientHint)
  const hintToShow = fromIncoming
    ? (matchData.request?.hint ?? null)
    : (matchData.recipientHint ?? null);

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
        <div className="text-[52px] mb-3.5" style={{ animation:"float 3s ease-in-out infinite" }}>✨</div>
        <div className="text-[30px] text-center leading-snug" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>
          It&apos;s a<br /><em style={{ color:C.accent }}>mutual match</em>
        </div>
        <div className="text-[13px] text-center mt-2.5 leading-relaxed" style={{ color:"rgba(245,240,232,0.6)" }}>
          {fromIncoming
            ? `You accepted ${firstName}'s request. Here's their hint so you can find them.`
            : `${firstName} accepted your request. Here's their hint so you can find them.`}
        </div>
        <div className="w-full mt-4 p-[18px_20px] rounded-[20px]" style={{ background:"rgba(196,120,58,0.12)", border:"1px solid rgba(196,120,58,0.3)" }}>
          <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.accent }}>
            {fromIncoming ? `${firstName}'s identifying hint` : `${firstName}'s identifying hint`}
          </div>
          {erased
            ? <div className="text-[14px]" style={{ color:"rgba(245,240,232,0.3)" }}>Hint auto-erased</div>
            : hintToShow
              ? <div className="text-[18px] leading-snug" style={{ fontFamily:"'DM Serif Display',Georgia,serif", color:C.cream }}>
                  &ldquo;{hintToShow}&rdquo;
                </div>
              : <div className="text-[14px] leading-relaxed" style={{ color:"rgba(245,240,232,0.55)" }}>
                  {firstName} didn&apos;t leave a hint — look around and wave! 👋
                </div>
          }
        </div>
        {!erased && (
          <button onClick={()=>setErased(true)} className="w-full mt-3 p-3 rounded-[13px] text-[13px] text-left cursor-pointer"
            style={{ border:"1px solid rgba(245,240,232,0.15)", background:"rgba(245,240,232,0.06)", color:"rgba(245,240,232,0.55)", fontFamily:"'DM Sans',sans-serif" }}>
            <div className="font-semibold">🚫 Remove interest to meet</div>
            <div className="text-[11px] mt-0.5" style={{ color:"rgba(245,240,232,0.35)" }}>Your identifier will also be deleted</div>
          </button>
        )}
        <div className="mt-4 text-center">
          <div className="w-[68px] h-[68px] rounded-full border-[3px] mx-auto flex items-center justify-center relative"
            style={{ borderColor:"rgba(245,240,232,0.12)", borderTopColor:erased?"rgba(245,240,232,0.12)":C.accent, animation:erased?"none":"spin 30s linear infinite" }}>
            <div className="text-[17px] font-semibold absolute" style={{ color:C.cream }}>
              {erased ? "—" : `${mins}:${String(sec).padStart(2,"0")}`}
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color:"rgba(245,240,232,0.4)" }}>
            {erased ? "Interest withdrawn" : `Hint auto-erases after ${timerMins} min`}
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-6 pt-4">
        <button onClick={()=>setShowReport(true)} className="flex-1 py-3.5 rounded-[14px] text-[13px] cursor-pointer" style={{ border:"1px solid rgba(184,80,66,0.3)", background:"transparent", color:"rgba(245,240,232,0.6)", fontFamily:"'DM Sans',sans-serif" }}>Report</button>
        <button onClick={()=>onNavigate("events")} className="flex-[2] py-3.5 rounded-[14px] text-[13px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.accent, fontFamily:"'DM Sans',sans-serif" }}>✓ Met them!</button>
      </div>
      <div className="mx-6 mt-3 mb-6 p-3 rounded-[14px] text-center text-xs leading-relaxed" style={{ background:"rgba(245,240,232,0.04)", border:"1px solid rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.4)" }}>
        🔒 Auto-erases after {timerMins} min · location never shared
      </div>

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
                    // Set reported user's open_to_meet to false so they can't see reporter
                    await supabase.from("profiles").update({ open_to_meet: false }).eq("id", reportedId);
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
  const fileRef                   = useRef<HTMLInputElement>(null);

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
    setPhotoL(false);
  }

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
        {/* Profile card */}
        <div className="mx-[22px] mt-5 p-5 bg-white rounded-[20px] flex items-center gap-4" style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)" }}>
          <div className="relative flex-shrink-0">
            <AvatarCircle user={currentUser} size={64} />
            <button onClick={()=>fileRef.current?.click()} disabled={photoLoading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center cursor-pointer text-[10px]"
              style={{ background:C.accent, color:"white" }}>
              {photoLoading ? "⟳" : "✎"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <div className="font-semibold text-[18px]" style={{ color:C.ink }}>{currentUser.name}, {currentUser.age}</div>
            <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{currentUser.occupation}</div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">{currentUser.interests.map(i=><InterestTag key={i} interest={i} />)}</div>
          </div>
        </div>

        <div className="mx-[22px] mt-4 bg-white rounded-[18px] overflow-hidden" style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)" }}>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <span className="text-sm font-medium" style={{ color:C.ink }}>✓ Verified profile</span>
            <span className="text-xs font-semibold" style={{ color:C.green }}>Active</span>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <span className="text-sm font-medium" style={{ color:C.ink }}>⚡ here. Premium</span>
            <span className="text-xs font-semibold cursor-pointer" style={{ color:C.accent }}>Upgrade →</span>
          </div>

          {/* Age range */}
          <div className="px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }} onClick={()=>setAgeX(v=>!v)}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium" style={{ color:C.ink }}>👁 Visible to age range</span>
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
              <span className="text-sm font-medium" style={{ color:C.ink }}>🔒 Privacy settings</span>
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

  // Poll Supabase for real incoming meet_requests
  const fetchInbox = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("meet_requests")
      .select("*, profiles!meet_requests_from_id_fkey(*)")
      .eq("to_id", userId)
      .in("status", ["pending"])
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
  useEffect(() => {
    if (!currentUser) return;
    async function checkSentAccepted() {
      const { data } = await supabase
        .from("meet_requests")
        .select("*, profiles!meet_requests_to_id_fkey(*)")
        .eq("from_id", currentUser!.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data && !declinedIdsRef.current.has(data.id)) {
        const recipient = data.profiles as UserProfile;
        setAcceptedSent({ requestId: data.id, person: recipient, recipientHint: data.recipient_hint ?? null });
        clearInterval(sentPollRef.current!);
      }
    }
    checkSentAccepted();
    sentPollRef.current = setInterval(checkSentAccepted, 8_000);
    return () => { if (sentPollRef.current) clearInterval(sentPollRef.current); };
  }, [currentUser]);
  // Auto-turn-off location access timer
  useEffect(() => {
    if (autoOffRef.current) clearTimeout(autoOffRef.current);
    if (!locationGranted || autoOffTimer === "never") return;
    const ms = autoOffTimer === "30min" ? 30*60_000 : autoOffTimer === "60min" ? 60*60_000 : 120*60_000;
    autoOffRef.current = setTimeout(() => {
      setLocationGranted(false);
      // Also turn off Go live in NearbyScreen if it is active
      if (turnOffLiveRef.current) turnOffLiveRef.current();
    }, ms);
    return () => { if (autoOffRef.current) clearTimeout(autoOffRef.current); };
  }, [locationGranted, autoOffTimer]);

  const [selectedPersonProfile, setSelectedPersonProfile] = useState<UserProfile|null>(null);
  const newCount = inbox.filter(r=>r.isNew).length;

  // Restore session on mount
  useEffect(()=>{
    supabase.auth.getSession().then(async({ data:{ session } })=>{
      if (session?.user) {
        const { data:p } = await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        if (p) { setUser(p as UserProfile); navigate("events"); }
        else     navigate("onboarding");
      } else navigate("login");
    });
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
    // Mark declined in DB — this overwrites any previous status (including accepted)
    supabase.from("meet_requests").update({ status: "declined" }).eq("id", id).then(() => {
      // Safe to remove from ref now — DB is confirmed declined
      declinedIdsRef.current.delete(id);
      if (currentUser) fetchInbox(currentUser.id);
    });
    setInbox(prev => prev.filter(r => r.id !== id));
    // Clear any accepted banner that might reference this request
    setAcceptedSent(prev => (prev && (prev as any).requestId === id ? null : prev));
    // If currently viewing this request or on match/incoming screen for it, go back to inbox
    if (screen === "incoming" || screen === "match") {
      navigate("inbox");
    }
  }
  function dismissRequest(id: number) {
    setInbox(prev=>prev.filter(r=>r.id!==id));
  }

  // Resolve per-screen data
  const selectedEvent    = EVENTS.find(e=>e.id===screenData) ?? EVENTS[0];
  const blankUser: UserProfile = { id:"", email:"", name:"User", age:25, occupation:"Professional", interests:[], photo_url:null, bg:BG_OPTIONS[0], open_to_meet:true, checked_in_event_id:null, checked_in_at:null, lat:null, lng:null };
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
            {screen==="login"       && <LoginScreen  onNavigate={navigate} onLogin={u=>{ setUser(u); navigate("events"); }} />}
            {screen==="signup"      && <SignupScreen onNavigate={navigate} />}
            {screen==="onboarding"  && <OnboardingScreen onDone={p=>{ setUser(p); navigate("events"); }} />}
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

            {screen==="nearby"   && currentUser && <NearbyScreen  currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} locationGranted={locationGranted} onForceTurnOff={(fn)=>{ turnOffLiveRef.current = fn; }} blockedIds={blockedIds} />}
            {screen==="request"  && currentUser && <RequestScreen  person={selectedPerson} currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} />}
            {screen==="inbox"    &&                <InboxScreen    requests={inbox} onNavigate={navigate} onDecline={declineRequest} onDismiss={dismissRequest} acceptedSent={acceptedSent} onViewMatch={()=>{ if(acceptedSent){ setAcceptedSent(null); navigate("match",{ person: acceptedSent.person, recipientHint: acceptedSent.recipientHint, fromIncoming: false }); }}} />}
            {screen==="incoming" && selectedRequest && <IncomingScreen request={selectedRequest} onNavigate={navigate} inboxCount={newCount} onDecline={declineRequest} />}
            {screen==="incoming" && !selectedRequest && (() => { navigate("inbox"); return null; })()}
            {screen==="match"    && currentUser && <MatchScreen    matchData={matchData} onNavigate={navigate} currentUser={currentUser} onBlock={(blockedId)=>setBlockedIds(prev=>[...prev,blockedId])} />}
            {screen==="pending"  && currentUser && (() => { const pd = screenData as any; const pPerson = pd?.person ?? blankUser; const pSentAt = pd?.sentAt ?? new Date().toISOString(); return <PendingScreen person={pPerson} sentAt={pSentAt} onNavigate={navigate} inboxCount={newCount} currentUser={currentUser} />; })()}
            {screen==="profile"  && currentUser && <ProfileScreen  currentUser={currentUser} onNavigate={navigate} onSignOut={()=>{ setUser(null); navigate("login"); }} inboxCount={newCount} locationGranted={locationGranted} setLocationGranted={setLocationGranted} autoOffTimer={autoOffTimer} setAutoOffTimer={setAutoOffTimer} />}
          </div>
        </div>
      </div>
    </>
  );
}

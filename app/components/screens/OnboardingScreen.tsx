"use client";

import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { C, INTERESTS, LANGUAGES, BG_OPTIONS, MAX_INTERESTS } from "../../lib/constants";
import type { UserProfile } from "../../lib/types";
import { Icon } from "../ui/Icon";
import { InterestTag } from "../ui/InterestTag";

export function OnboardingScreen({ onDone }: { onDone: (p: UserProfile) => void }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState("");
  const [age,  setAge]            = useState("");
  const [occ,  setOcc]            = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [langInput,  setLangInput] = useState("");
  const [pronouns,   setPronouns] = useState<"he/him"|"she/her"|"they/them">("she/her");
  const [askMePrompts, setAskMePrompts] = useState<string[]>(["", "", ""]);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [photoPreview, setPreview]= useState<string|null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef                   = useRef<HTMLInputElement>(null);
  const bgRef = useRef(BG_OPTIONS[Math.floor(Math.random() * BG_OPTIONS.length)]);
  const bg = bgRef.current;

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
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Saving is taking too long. Please check your connection and try again.");
    }, 12_000);
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { clearTimeout(timeout); setError("Not logged in. Please go back and sign in again."); setLoading(false); return; }
      let photo_url: string|null = null;
      if (photoFile) {
        const ext  = photoFile.name.split(".").pop() ?? "jpg";
        const path = `avatars/${user.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) { clearTimeout(timeout); setError("Photo upload failed: " + upErr.message); setLoading(false); return; }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        photo_url = urlData.publicUrl + `?v=${Date.now()}`;
      }
      const profile: UserProfile = {
        id: user.id, email: user.email ?? "", name, age: parseInt(age),
        occupation: occ, interests, languages: languages ?? [], photo_url, bg,
        pronouns, ask_me_prompts: askMePrompts.filter(p => p.trim()),
        open_to_meet: false, checked_in_event_id: null, checked_in_at: null, lat: null, lng: null,
      };
      const { error: dbErr } = await supabase.from("profiles").upsert(profile);
      clearTimeout(timeout);
      if (dbErr) { setError("Could not save profile: " + dbErr.message); setLoading(false); return; }
      setLoading(false);
      onDone(profile);
    } catch {
      clearTimeout(timeout);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
  const canStep1 = name.trim() && age && parseInt(age)>=18 && occ.trim();

  return (
    <div className="flex flex-col" style={{ background: C.cream, height:"100vh", overflow:"hidden" }}>
      <div className="px-6 pt-10 flex-shrink-0">
        <div className="flex gap-1.5 mb-1">
          {[1,2,3,4,5].map(s=>(
            <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: s<=step ? C.accent : "rgba(139,115,85,0.2)" }} />
          ))}
        </div>
        <div className="text-[11px] mt-2 mb-3" style={{ color:C.warmMid }}>Step {step} of 5</div>
      </div>

      {step===1 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-3 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>About you</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>This is what others will see</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>Your Photo</div>
              <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed" style={{ background:"rgba(196,120,58,0.07)", border:`1px solid rgba(196,120,58,0.18)`, color:C.inkSoft }}>
                Your photo is how people find you in person, so please use a clear, unedited photo that looks like you today.
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center relative"
                  style={{ background: photoPreview ? "transparent" : "rgba(139,115,85,0.1)", border:`2px solid ${photoPreview ? C.green : C.border}` }}>
                  {photoPreview
                    ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                    : <span style={{ color:C.warmMid, opacity:0.5 }}><Icon name="camera" size={26} /></span>}
                  {photoPreview && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background:C.green, color:"white", border:"2px solid white" }}><Icon name="check" size={11} stroke={2.8} /></div>
                  )}
                </div>
                <div className="flex-1">
                  <button onClick={()=>fileRef.current?.click()}
                    className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer border-0"
                    style={{ background: photoPreview ? "rgba(74,124,89,0.12)" : C.ink, color: photoPreview ? C.green : C.cream, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                    {photoPreview ? "Retake photo" : "Take photo now"}
                  </button>
                  <div className="text-[11px] mt-1.5" style={{ color:C.warmMid }}>
                    {photoPreview ? "Looks good, retake if needed" : "Camera or gallery"}
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
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
                    style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
                </div>
              ))}
            </div>
            {error && <div className="text-xs mb-3 text-center" style={{ color:"#ef4444" }}>{error}</div>}
            <div style={{ height:8 }} />
          </div>
          <button onClick={()=>canStep1&&setStep(2)} disabled={!canStep1}
            className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity flex-shrink-0"
            style={{ background:C.accent, opacity:canStep1?1:0.4, fontFamily:"'Hanken Grotesk',sans-serif", marginTop:12 }}>
            Next
          </button>
        </div>
      )}

      {step===2 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-2 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Your interests</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Pick up to {MAX_INTERESTS}, shown as conversation starters</div>
          </div>
          <div className="mb-2 p-3 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(196,120,58,0.07)", color:C.inkSoft, border:`1px solid rgba(196,120,58,0.15)` }}>
            These tags don't affect who sees you or in what order, they're purely for starting conversations.
          </div>
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <div className="text-xs font-semibold" style={{ color:C.inkSoft }}>
              {interests.length === MAX_INTERESTS
                ? <span style={{ color:C.green }}>{MAX_INTERESTS} selected</span>
                : <span style={{ color:C.warmMid }}>{interests.length} / {MAX_INTERESTS}</span>}
            </div>
            {interests.length > 0 && (
              <button onClick={()=>setInterests([])} className="text-xs border-0 bg-transparent cursor-pointer" style={{ color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 overflow-y-auto flex-1" style={{ minHeight:0 }}>
            {INTERESTS.map(item => {
              const on = interests.includes(item.id);
              const maxed = !on && interests.length >= MAX_INTERESTS;
              return (
                <button key={item.id} onClick={()=>{ if (!maxed) toggleInterest(item.id); }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border"
                  style={{ background:on?C.ink:maxed?"rgba(139,115,85,0.04)":"white", borderColor:on?C.ink:maxed?"rgba(139,115,85,0.1)":C.border, color:on?C.cream:maxed?"rgba(139,115,85,0.28)":C.inkSoft, cursor:maxed?"not-allowed":"pointer", fontFamily:"'Hanken Grotesk',sans-serif", opacity:maxed?0.55:1, alignSelf:"flex-start" }}>
                  {item.label}
                </button>
              );
            })}
          </div>
          {error && <div className="text-xs mt-2 text-center flex-shrink-0" style={{ color:"#ef4444" }}>{error}</div>}
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(1)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>Back</button>
            <button onClick={()=>interests.length>0&&setStep(3)} disabled={!interests.length}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.accent, opacity:interests.length?1:0.4, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {step===3 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-2 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Languages you speak</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Helps others know they can approach you</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {languages.map(l => (
                  <span key={l} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background:C.ink, color:C.cream, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                    {l}
                    <button onClick={()=>toggleLanguage(l)} className="border-0 bg-transparent cursor-pointer" style={{ color:"rgba(245,240,232,0.55)", fontSize:14, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <input value={langInput} onChange={e=>setLangInput(e.target.value)} placeholder="Search languages…"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-2"
              style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
            <div className="rounded-2xl overflow-hidden" style={{ border:`1px solid ${C.border}`, maxHeight:300, overflowY:"auto" }}>
              {filteredLangs.slice(0,25).map((l,idx) => (
                <button key={l} onClick={()=>{ toggleLanguage(l); setLangInput(""); }}
                  className="w-full px-4 py-3 text-left text-sm cursor-pointer border-0"
                  style={{ background:idx%2===0?"white":"rgba(245,240,232,0.5)", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif", borderBottom:`1px solid ${C.border}`, display:"block" }}>
                  {l}
                </button>
              ))}
              {filteredLangs.length===0 && <div className="px-4 py-3 text-sm" style={{ color:C.warmMid }}>No matches</div>}
            </div>
            <div style={{ height:8 }} />
          </div>
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(2)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>Back</button>
            <button onClick={()=>setStep(4)} className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>Next</button>
          </div>
        </div>
      )}

      {step===4 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div className="mb-2 flex-shrink-0">
            <div className="text-[22px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Ask me about…</div>
            <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>3 topics others can use to start a conversation with you</div>
          </div>
          <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(196,120,58,0.07)", color:C.inkSoft, border:`1px solid rgba(196,120,58,0.15)` }}>
            These appear on the match screen when someone meets you, so they have a natural way in.
          </div>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            {[0,1,2].map(i => (
              <div key={i} className="mb-3">
                <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.warmMid }}>Prompt {i+1}</div>
                <input value={askMePrompts[i]} onChange={e => { const next = [...askMePrompts]; next[i] = e.target.value; setAskMePrompts(next); }}
                  maxLength={60} placeholder={["e.g. my pottery hobby","e.g. the best spots in Hackney","e.g. why I left finance"][i]}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
                <div className="text-[10px] text-right mt-0.5" style={{ color:"rgba(139,115,85,0.5)" }}>{askMePrompts[i].length}/60</div>
              </div>
            ))}
            <div className="mt-2 mb-3">
              <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color:C.warmMid }}>Your pronouns</div>
              <div className="flex gap-2">
                {(["she/her","he/him","they/them"] as const).map(p => (
                  <button key={p} onClick={()=>setPronouns(p)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    style={{ border:`1.5px solid ${pronouns===p ? C.ink : C.border}`, background: pronouns===p ? C.ink : "white", color: pronouns===p ? C.cream : C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height:8 }} />
          </div>
          <div className="flex gap-3 flex-shrink-0 mt-3">
            <button onClick={()=>setStep(3)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>Back</button>
            <button onClick={()=>setStep(5)} className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer" style={{ background:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>Next</button>
          </div>
        </div>
      )}

      {step===5 && (
        <div className="flex flex-col px-6 pb-6" style={{ flex:1, overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
            <div className="mb-4">
              <div className="text-[22px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>You're all set</div>
              <div className="text-sm mt-0.5" style={{ color:C.warmMid }}>Here's how others will see your card</div>
            </div>
            <div className="rounded-[20px] overflow-hidden mb-4" style={{ boxShadow:"0 4px 24px rgba(26,20,16,0.12)", border:`2px solid ${C.green}`, maxWidth:180, alignSelf:"center", width:"100%" }}>
              <div className="h-44 relative overflow-hidden">
                {photoPreview
                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-white text-6xl" style={{ background:bg }}>{name[0]?.toUpperCase()}</div>}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background:C.green }}>Active</div>
                {photoPreview && <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold" style={{ color:C.green, boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}><Icon name="check" size={11} stroke={2.8} /></div>}
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
            <button onClick={()=>setStep(4)} className="flex-1 py-4 rounded-2xl text-[15px] font-medium cursor-pointer border" style={{ background:"transparent", borderColor:C.border, color:C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>Back</button>
            <button onClick={finish} disabled={loading}
              className="flex-[2] py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer transition-opacity"
              style={{ background:C.green, opacity:loading?0.6:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {loading ? "Saving…" : "Enter here."}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

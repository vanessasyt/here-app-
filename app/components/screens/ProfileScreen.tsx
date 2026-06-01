"use client";

import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { C, INTERESTS, LANGUAGES, MAX_INTERESTS } from "../../lib/constants";
import type { UserProfile, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import { BottomNav } from "../ui/BottomNav";

export function ProfileScreen({
  currentUser, onNavigate, onSignOut, inboxCount, msgCount,
  locationGranted, setLocationGranted, autoOffTimer, setAutoOffTimer, onUpdateUser,
}: {
  currentUser: UserProfile; onNavigate: (s: Screen) => void; onSignOut: () => void;
  inboxCount: number; msgCount: number;
  locationGranted: boolean; setLocationGranted: (v: boolean) => void;
  autoOffTimer: string; setAutoOffTimer: (v: string) => void;
  onUpdateUser: (u: UserProfile) => void;
}) {
  const [ageExpanded,  setAgeX]   = useState(false);
  const [privExpanded, setPrivX]  = useState(false);
  const [ageMin, setAgeMin]       = useState(18);
  const [ageMax, setAgeMax]       = useState(35);
  const [photoLoading, setPhotoL] = useState(false);
  const [profileActive, setProfileActive] = useState(true);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const [editingInterests, setEditingInterests] = useState(false);
  const [draftInterests,   setDraftInterests]   = useState<string[]>(currentUser.interests);
  const [savingInterests,  setSavingInterests]  = useState(false);
  const [editingLanguages, setEditingLanguages] = useState(false);
  const [draftLanguages,   setDraftLanguages]   = useState<string[]>(currentUser.languages ?? []);
  const [langInput,        setLangInput]        = useState("");
  const [savingLanguages,  setSavingLanguages]  = useState(false);
  const [editingPronouns, setEditingPronouns]   = useState(false);
  const [draftPronouns,   setDraftPronouns]     = useState<"he/him"|"she/her"|"they/them">(currentUser.pronouns ?? "she/her");
  const [savingPronouns,  setSavingPronouns]    = useState(false);
  const [editingAskMe,   setEditingAskMe]   = useState(false);
  const [draftAskMe,     setDraftAskMe]     = useState<string[]>(currentUser.ask_me_prompts ?? ["", "", ""]);
  const [savingAskMe,    setSavingAskMe]    = useState(false);
  const [editingOccupation, setEditingOccupation] = useState(false);
  const [draftOccupation,   setDraftOccupation]   = useState(currentUser.occupation ?? "");
  const [savingOccupation,  setSavingOccupation]  = useState(false);

  async function savePronouns() { setSavingPronouns(true); await supabase.from("profiles").update({ pronouns: draftPronouns }).eq("id", currentUser.id); onUpdateUser({ ...currentUser, pronouns: draftPronouns }); setSavingPronouns(false); setEditingPronouns(false); }
  async function saveAskMe() { setSavingAskMe(true); const filtered = draftAskMe.map(p => p.trim()); await supabase.from("profiles").update({ ask_me_prompts: filtered }).eq("id", currentUser.id); onUpdateUser({ ...currentUser, ask_me_prompts: filtered }); setSavingAskMe(false); setEditingAskMe(false); }
  async function saveOccupation() { setSavingOccupation(true); const trimmed = draftOccupation.trim(); await supabase.from("profiles").update({ occupation: trimmed }).eq("id", currentUser.id); onUpdateUser({ ...currentUser, occupation: trimmed }); setSavingOccupation(false); setEditingOccupation(false); }
  function toggleDraftLanguage(lang: string) { setDraftLanguages(prev => prev.includes(lang) ? prev.filter(x=>x!==lang) : [...prev, lang]); }
  const filteredLangs = LANGUAGES.filter(l => l.toLowerCase().includes(langInput.toLowerCase()) && !draftLanguages.includes(l));
  async function saveLanguages() { setSavingLanguages(true); await supabase.from("profiles").update({ languages: draftLanguages }).eq("id", currentUser.id); onUpdateUser({ ...currentUser, languages: draftLanguages }); setSavingLanguages(false); setEditingLanguages(false); }
  function toggleDraftInterest(id: string) { setDraftInterests(prev => prev.includes(id) ? prev.filter(x=>x!==id) : prev.length < MAX_INTERESTS ? [...prev, id] : prev); }
  async function saveInterests() { setSavingInterests(true); await supabase.from("profiles").update({ interests: draftInterests }).eq("id", currentUser.id); onUpdateUser({ ...currentUser, interests: draftInterests }); setSavingInterests(false); setEditingInterests(false); }

  const total    = 50-18;
  const leftPct  = ((ageMin-18)/total)*100;
  const rightPct = ((50-ageMax)/total)*100;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size>5*1024*1024) { alert("Photo must be under 5 MB"); return; }
    setPhotoL(true);
    const ext = file.name.split(".").pop()??"jpg";
    const path = `avatars/${currentUser.id}.${ext}`;
    const { error:upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert:true, contentType:file.type });
    if (upErr) { alert("Upload failed: "+upErr.message); setPhotoL(false); return; }
    const { data:urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl+`?v=${Date.now()}`;
    await supabase.from("profiles").update({ photo_url:url }).eq("id",currentUser.id);
    onUpdateUser({ ...currentUser, photo_url: url });
    setPhotoL(false);
  }

  async function handleSignOut() {
    await supabase.from("profiles").update({ open_to_meet:false, checked_in_event_id:null, checked_in_at:null }).eq("id",currentUser.id);
    await supabase.auth.signOut();
    onSignOut();
  }

  const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background:"rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full rounded-[28px_28px_0_0] pb-8 pt-5 px-6" style={{ background:C.cream, maxWidth:430 }} onClick={e=>e.stopPropagation()}>
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background:C.border }} />
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="px-[22px] pt-6 flex-shrink-0">
        <div className="text-[24px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Your Profile</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
        <div className="mx-[22px] mt-5 p-5 bg-white rounded-[20px] flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)", border:`1.5px solid ${editingInterests ? C.accent : "transparent"}` }}
          onClick={()=>{ setDraftInterests(currentUser.interests); setEditingInterests(true); }}>
          <div className="relative flex-shrink-0" onClick={e=>e.stopPropagation()}>
            <AvatarCircle user={currentUser} size={64} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[11px]"
              style={{ background: C.accent, color:"white", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
              <Icon name="camera" size={13} stroke={2} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[18px]" style={{ color:C.ink }}>{currentUser.name}, {currentUser.age}</div>
            <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{currentUser.occupation}</div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">{currentUser.interests.map(i=><InterestTag key={i} interest={i} />)}</div>
            <button onClick={e=>{e.stopPropagation();fileRef.current?.click();}}
              className="mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer border-0"
              style={{ background:"rgba(196,120,58,0.08)", color:C.accent, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {photoLoading ? "Uploading…" : currentUser.photo_url ? "Update photo" : "Add photo"}
            </button>
            <div className="text-[11px] mt-1" style={{ color:C.warmMid }}>Tap card to edit interests</div>
          </div>
        </div>

        {editingInterests && (
          <Modal onClose={()=>setEditingInterests(false)}>
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Edit your interests</div>
            <div className="text-xs mb-4" style={{ color:C.warmMid }}>Pick up to {MAX_INTERESTS} · {draftInterests.length}/{MAX_INTERESTS} selected</div>
            <div className="flex flex-wrap gap-2 mb-5">
              {INTERESTS.map(i=>{
                const active = draftInterests.includes(i.id);
                const disabled = !active && draftInterests.length >= MAX_INTERESTS;
                return (
                  <button key={i.id} onClick={()=>!disabled && toggleDraftInterest(i.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                    style={{ border:`1px solid ${active ? C.ink : C.border}`, background: active ? C.ink : "white", color: active ? C.cream : disabled ? "rgba(139,115,85,0.35)" : C.inkSoft, cursor: disabled ? "not-allowed" : "pointer", fontFamily:"'Hanken Grotesk',sans-serif" }}>
                    {i.label}
                  </button>
                );
              })}
            </div>
            <button onClick={saveInterests} disabled={savingInterests || draftInterests.length === 0}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
              style={{ background:C.accent, opacity:(savingInterests||draftInterests.length===0)?0.5:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingInterests ? "Saving…" : "Save interests"}
            </button>
            <button onClick={()=>setEditingInterests(false)} className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0" style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </Modal>
        )}

        {editingLanguages && (
          <Modal onClose={()=>setEditingLanguages(false)}>
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Edit languages</div>
            <div className="text-xs mb-3" style={{ color:C.warmMid }}>Select all languages you speak</div>
            {draftLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {draftLanguages.map(l=>(
                  <span key={l} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background:C.ink, color:C.cream, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                    {l}<button onClick={()=>toggleDraftLanguage(l)} className="border-0 bg-transparent cursor-pointer" style={{ color:"rgba(245,240,232,0.55)", fontSize:14, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <input value={langInput} onChange={e=>setLangInput(e.target.value)} placeholder="Search languages…"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-2"
              style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
            <div className="rounded-2xl overflow-hidden mb-4" style={{ border:`1px solid ${C.border}`, maxHeight:200, overflowY:"auto" }}>
              {filteredLangs.slice(0,20).map((l,idx)=>(
                <button key={l} onClick={()=>{ toggleDraftLanguage(l); setLangInput(""); }}
                  className="w-full px-4 py-2.5 text-left text-sm cursor-pointer border-0"
                  style={{ background:idx%2===0?"white":"rgba(245,240,232,0.5)", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif", borderBottom:`1px solid ${C.border}`, display:"block" }}>
                  {l}
                </button>
              ))}
              {filteredLangs.length===0 && <div className="px-4 py-3 text-sm" style={{ color:C.warmMid }}>No matches</div>}
            </div>
            <button onClick={saveLanguages} disabled={savingLanguages}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
              style={{ background:C.accent, opacity:savingLanguages?0.5:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingLanguages ? "Saving…" : "Save languages"}
            </button>
            <button onClick={()=>setEditingLanguages(false)} className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0" style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </Modal>
        )}

        {editingPronouns && (
          <Modal onClose={()=>setEditingPronouns(false)}>
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Your pronouns</div>
            <div className="text-xs mb-5" style={{ color:C.warmMid }}>Used when others are matched with you</div>
            <div className="flex flex-col gap-3 mb-5">
              {(["she/her", "he/him", "they/them"] as const).map(p => (
                <button key={p} onClick={()=>setDraftPronouns(p)}
                  className="w-full py-4 rounded-2xl text-[15px] font-semibold cursor-pointer transition-all"
                  style={{ border: `1.5px solid ${draftPronouns===p ? C.ink : C.border}`, background: draftPronouns===p ? C.ink : "white", color: draftPronouns===p ? C.cream : C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={savePronouns} disabled={savingPronouns}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
              style={{ background:C.accent, opacity:savingPronouns?0.5:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingPronouns ? "Saving…" : "Save pronouns"}
            </button>
            <button onClick={()=>setEditingPronouns(false)} className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0" style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </Modal>
        )}

        {editingAskMe && (
          <Modal onClose={()=>setEditingAskMe(false)}>
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Ask me about…</div>
            <div className="text-xs mb-4" style={{ color:C.warmMid }}>3 topics shown to people when you're matched</div>
            {[0,1,2].map(i => (
              <div key={i} className="mb-3">
                <div className="text-[11px] uppercase tracking-[1.5px] font-semibold mb-1.5" style={{ color:C.warmMid }}>Prompt {i+1}</div>
                <input value={draftAskMe[i] ?? ""} onChange={e => { const next = [...draftAskMe]; next[i] = e.target.value; setDraftAskMe(next); }}
                  maxLength={60} placeholder={["e.g. my pottery hobby", "e.g. the best spots in Hackney", "e.g. why I left finance"][i]}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
                <div className="text-[10px] text-right mt-0.5" style={{ color:"rgba(139,115,85,0.4)" }}>{(draftAskMe[i]??'').length}/60</div>
              </div>
            ))}
            <button onClick={saveAskMe} disabled={savingAskMe}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer mt-1"
              style={{ background:C.accent, opacity:savingAskMe?0.5:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingAskMe ? "Saving…" : "Save prompts"}
            </button>
            <button onClick={()=>setEditingAskMe(false)} className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0" style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </Modal>
        )}

        {editingOccupation && (
          <Modal onClose={()=>setEditingOccupation(false)}>
            <div className="text-[20px] mb-1" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Your job role</div>
            <div className="text-xs mb-5" style={{ color:C.warmMid }}>Shown on your profile when you're matched with someone</div>
            <input value={draftOccupation} onChange={e => setDraftOccupation(e.target.value)} maxLength={60}
              placeholder="e.g. Product Designer at Monzo" autoFocus
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-1"
              style={{ border:`1.5px solid ${C.border}`, background:"white", color:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }} />
            <div className="text-[10px] text-right mb-5" style={{ color:"rgba(139,115,85,0.4)" }}>{draftOccupation.length}/60</div>
            <button onClick={saveOccupation} disabled={savingOccupation || !draftOccupation.trim()}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer"
              style={{ background:C.accent, opacity:(savingOccupation || !draftOccupation.trim())?0.5:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {savingOccupation ? "Saving…" : "Save job role"}
            </button>
            <button onClick={()=>setEditingOccupation(false)} className="w-full mt-2 py-3 rounded-2xl text-[14px] cursor-pointer border-0" style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cancel</button>
          </Modal>
        )}

        <div className="mx-[22px] mt-4 bg-white rounded-[18px] overflow-hidden" style={{ boxShadow:"0 2px 16px rgba(26,20,16,0.07)" }}>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div className="text-sm font-medium" style={{ color:C.ink }}>Profile visibility</div>
              <div className="text-[11px] mt-0.5" style={{ color: profileActive ? C.green : "#dc2626" }}>
                {profileActive ? "Your profile is visible to others" : "Your profile is hidden"}
              </div>
            </div>
            <button onClick={async () => { const next = !profileActive; setProfileActive(next); if (!next) await supabase.from("profiles").update({ open_to_meet: false }).eq("id", currentUser.id); }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-0 transition-all"
              style={{ background: profileActive ? "rgba(220,38,38,0.08)" : "rgba(74,124,89,0.1)", color: profileActive ? "#dc2626" : C.green, fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {profileActive ? "Deactivate" : "Activate"}
            </button>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5" style={{ borderBottom:`1px solid ${C.border}` }}>
            <span className="text-sm font-medium" style={{ color:C.ink }}>here. Premium</span>
            <span className="text-xs font-semibold cursor-pointer" style={{ color:C.accent }}>Upgrade →</span>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
            onClick={()=>{ setDraftLanguages(currentUser.languages ?? []); setLangInput(""); setEditingLanguages(true); }}>
            <div>
              <div className="text-sm font-medium" style={{ color:C.ink }}>Languages</div>
              <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>{(currentUser.languages ?? []).length > 0 ? (currentUser.languages ?? []).join(", ") : "Not set — tap to add"}</div>
            </div>
            <span style={{ color:C.warmMid }}>›</span>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
            onClick={()=>{ setDraftPronouns(currentUser.pronouns ?? "she/her"); setEditingPronouns(true); }}>
            <div>
              <div className="text-sm font-medium" style={{ color:C.ink }}>Pronouns</div>
              <div className="text-[11px] mt-0.5" style={{ color:C.warmMid }}>{currentUser.pronouns ?? "Not set — tap to choose"}</div>
            </div>
            <span style={{ color:C.warmMid }}>›</span>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
            onClick={()=>{ setDraftOccupation(currentUser.occupation ?? ""); setEditingOccupation(true); }}>
            <div className="flex-1 min-w-0 pr-3">
              <div className="text-sm font-medium" style={{ color:C.ink }}>Job role</div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color:C.warmMid }}>{currentUser.occupation || "Not set — tap to add"}</div>
            </div>
            <span style={{ color:C.warmMid }}>›</span>
          </div>
          <div className="flex justify-between items-center px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
            onClick={()=>{ setDraftAskMe(currentUser.ask_me_prompts?.length ? [...currentUser.ask_me_prompts, ...Array(3).fill("")].slice(0,3) : ["","",""]); setEditingAskMe(true); }}>
            <div className="flex-1 min-w-0 pr-3">
              <div className="text-sm font-medium" style={{ color:C.ink }}>Ask me about…</div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color:C.warmMid }}>
                {(currentUser.ask_me_prompts ?? []).filter(p=>p.trim()).length > 0
                  ? (currentUser.ask_me_prompts ?? []).filter(p=>p.trim()).join(" · ")
                  : "Not set — tap to add conversation starters"}
              </div>
            </div>
            <span style={{ color:C.warmMid, flexShrink:0 }}>›</span>
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
          <div className="px-[18px] py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }} onClick={()=>setPrivX(v=>!v)}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color:C.ink }}>Privacy settings</span>
              <span style={{ color:C.warmMid, transform:privExpanded?"rotate(90deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>›</span>
            </div>
            {privExpanded && (
              <div className="pt-4" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 rounded-xl mb-2.5" style={{ background:"rgba(139,115,85,0.06)" }}>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color:C.ink }}><Icon name="pin" size={15} stroke={2} /> Location Access</div>
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
          <button onClick={handleSignOut} className="w-full px-[18px] py-3.5 text-left text-sm font-medium cursor-pointer border-0 bg-transparent" style={{ color:"#B85042", fontFamily:"'Hanken Grotesk',sans-serif" }}>Sign out</button>
        </div>
        <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;border:2.5px solid #C4783A;box-shadow:0 2px 8px rgba(196,120,58,0.35);cursor:pointer;}`}</style>
        <div className="h-2" />
      </div>
      <BottomNav messagesCount={msgCount} active="profile" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

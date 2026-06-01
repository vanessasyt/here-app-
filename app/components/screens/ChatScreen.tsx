"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/constants";
import type { UserProfile, ChatMessage, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { BackBtn } from "../ui/BackBtn";
import { Icon } from "../ui/Icon";

export function ChatScreen({
  person, requestId, currentUser, onNavigate, inboxCount, unlockedAt,
}: { person: UserProfile; requestId: string | null; currentUser: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; unlockedAt?: string }) {
  const firstName = person.name.split(",")[0];
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [draft,     setDraft]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notesText, setNotesText] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`here_note_${currentUser.id}_${person.id}`) ?? "";
    return "";
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (requestId && typeof window !== "undefined") {
      localStorage.setItem(`here_read_${currentUser.id}_${requestId}`, new Date().toISOString());
    }
  }, [requestId, currentUser.id]);

  useEffect(() => {
    if (requestId && typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(`here_read_${currentUser.id}_${requestId}`, new Date().toISOString());
    }
  }, [messages, requestId, currentUser.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!requestId) { setLoading(false); return; }
    supabase.from("messages").select("*").eq("request_id", requestId).order("created_at", { ascending: true }).then(({ data }) => {
      if (data) setMessages(data as ChatMessage[]);
      setLoading(false);
    });
    const channel = supabase.channel(`chat:${requestId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages(prev => {
            if (incoming.sender_id === currentUser.id) return prev;
            if (prev.some(m => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [requestId]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !requestId || sending) return;
    setSending(true); setDraft("");
    const optimistic: ChatMessage = { id: `optimistic-${Date.now()}`, request_id: requestId, sender_id: currentUser.id, content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    const { error } = await supabase.from("messages").insert({ request_id: requestId, sender_id: currentUser.id, content: text });
    if (error) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setDraft(text); }
    setSending(false);
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
  function formatDayLabel(iso: string) {
    const d = new Date(iso), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });
  }
  function isSameDay(a: string, b: string) { return new Date(a).toDateString() === new Date(b).toDateString(); }

  const unlockedLabel = unlockedAt ? new Date(unlockedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : null;

  return (
    <div className="flex flex-col h-full" style={{ background: C.cream }}>
      <div className="px-[22px] pt-4 pb-3 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <BackBtn onClick={() => onNavigate("messages")} />
        <div className="flex items-center gap-2.5 flex-1 cursor-pointer" onClick={() => setShowNotes(true)}>
          <div onClick={e => { e.stopPropagation(); setShowProfile(true); }}>
            <AvatarCircle user={person} size={38} />
          </div>
          <div>
            <div className="font-semibold text-[14px]" style={{ color: C.ink }}>{firstName}</div>
            <div className="text-[11px]" style={{ color: C.green }}>Chat unlocked{unlockedLabel ? ` · ${unlockedLabel}` : ""}</div>
          </div>
        </div>
        <button onClick={() => setShowNotes(true)}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer"
          style={{ borderColor: C.border, color: C.warmMid, background: "transparent", fontFamily:"'Hanken Grotesk',sans-serif" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Icon name="note" size={13} stroke={2} /> Notes</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[18px] py-3 flex flex-col gap-1.5" style={{ minHeight: 0 }}>
        {loading && <div className="flex-1 flex items-center justify-center py-8"><div className="text-[24px]" style={{ animation: "spin 1s linear infinite" }}>⟳</div></div>}
        {!loading && messages.length === 0 && <div className="py-6 text-center text-[12px] leading-relaxed px-4" style={{ color: C.warmMid }}>Chat unlocked — you both wanted to meet again!</div>}
        {!loading && messages.map((msg, i) => {
          const isMine = msg.sender_id === currentUser.id;
          const prevMsg = messages[i - 1];
          const showDayLabel = !prevMsg || !isSameDay(msg.created_at, prevMsg.created_at);
          const showTime = !showDayLabel && (!prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60_000);
          return (
            <div key={msg.id}>
              {showDayLabel && <div className="text-[11px] text-center py-2 my-1 font-medium" style={{ color: C.warmMid }}>{formatDayLabel(msg.created_at)}</div>}
              {showTime && !showDayLabel && <div className="text-[10px] text-center py-1.5" style={{ color: C.warmMid }}>{formatTime(msg.created_at)}</div>}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2.5 text-[13px] max-w-[80%] leading-relaxed ${isMine ? "rounded-[14px_14px_4px_14px]" : "rounded-[14px_14px_14px_4px]"}`}
                  style={isMine ? { background: C.ink, color: C.cream } : { background: "white", color: C.ink, border: `0.5px solid rgba(139,115,85,0.15)` }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-[18px] pb-6 pt-2 flex-shrink-0 flex gap-2 items-end" style={{ borderTop: `1px solid ${C.border}` }}>
        <textarea value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`Message ${firstName}…`} rows={1}
          className="flex-1 px-4 py-3 rounded-3xl text-[13px] outline-none resize-none"
          style={{ background: "white", border: `1px solid ${C.border}`, color: C.ink, fontFamily:"'Hanken Grotesk',sans-serif", maxHeight: 100, overflowY: "auto" }} />
        <button onClick={sendMessage} disabled={!draft.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-0 cursor-pointer transition-opacity"
          style={{ background: draft.trim() ? C.green : "rgba(139,115,85,0.15)", opacity: sending ? 0.5 : 1 }}>
          <span style={{ color: draft.trim() ? "white" : C.warmMid, display:"flex" }}><Icon name="send" size={18} stroke={2.2} /></span>
        </button>
      </div>

      {showNotes && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background:"rgba(0,0,0,0.45)" }}>
          <div className="w-full rounded-[28px_28px_0_0] p-6 pb-9" style={{ background:C.cream }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background:C.border }} />
            <div className="flex items-center gap-3 mb-1">
              <AvatarCircle user={person} size={36} />
              <div>
                <div className="text-[17px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>{firstName}, your notes</div>
                <div className="text-[11px]" style={{ color:C.warmMid }}>Private · {firstName} cannot see this</div>
              </div>
            </div>
            <div className="text-xs mt-3 mb-3 leading-relaxed" style={{ color:C.warmMid }}>
              Keep a record of your impressions, things they mentioned, or anything you want to remember if you meet again.
            </div>
            <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={6}
              placeholder={`Your notes about ${firstName}…`}
              className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none resize-none mb-4"
              style={{ border:`1.5px solid ${C.border}`, background:"white", fontFamily:"'Hanken Grotesk',sans-serif", color:C.ink }} />
            <button onClick={()=>{ localStorage.setItem(`here_note_${currentUser.id}_${person.id}`, notesText); setShowNotes(false); }}
              className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white border-0 cursor-pointer mb-2"
              style={{ background:C.ink, fontFamily:"'Hanken Grotesk',sans-serif" }}>Save notes</button>
            <button onClick={()=>setShowNotes(false)} className="w-full py-3 rounded-2xl text-[14px] cursor-pointer border-0"
              style={{ background:"transparent", color:C.warmMid, fontFamily:"'Hanken Grotesk',sans-serif" }}>Close</button>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="absolute inset-0 flex items-end justify-center z-50" style={{ background:"rgba(0,0,0,0.45)" }} onClick={() => setShowProfile(false)}>
          <div className="w-full rounded-[28px_28px_0_0] pb-9 pt-5 px-6 overflow-y-auto" style={{ background:C.cream, maxWidth:430, maxHeight:"85vh" }} onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background:C.border }} />
            <div className="flex items-center gap-4 mb-5">
              <AvatarCircle user={person} size={60} />
              <div>
                <div className="text-[22px] leading-tight" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>{person.name}{person.age ? `, ${person.age}` : ""}</div>
                {person.occupation && <div className="text-[13px] mt-0.5" style={{ color:C.warmMid }}>{person.occupation}</div>}
              </div>
            </div>
            {unlockedLabel && (
              <div className="flex items-center gap-2 mb-4 px-3.5 py-3 rounded-xl" style={{ background:"rgba(74,124,89,0.08)", border:"1px solid rgba(74,124,89,0.15)" }}>
                <span style={{ color:C.green }}><Icon name="spark" size={15} /></span>
                <div className="text-[13px] font-medium" style={{ color:C.green }}>You met on {unlockedLabel}</div>
              </div>
            )}
            {person.interests && person.interests.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-[1.4px] font-semibold mb-2" style={{ color:C.warmMid }}>Interests</div>
                <div className="flex flex-wrap gap-1.5">
                  {person.interests.map((interest: string) => <InterestTag key={interest} interest={interest} />)}
                </div>
              </div>
            )}
            {(person.ask_me_prompts ?? []).filter((p: string) => p.trim()).length > 0 && (
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[1.4px] font-semibold mb-2" style={{ color:C.warmMid }}>Ask {firstName} about…</div>
                <div className="flex flex-col gap-2">
                  {(person.ask_me_prompts ?? []).filter((p: string) => p.trim()).map((prompt: string, i: number) => (
                    <div key={i} className="flex gap-2.5 items-start px-3.5 py-3 rounded-xl" style={{ background:"white", border:`1px solid ${C.border}` }}>
                      <span className="text-[12px] font-bold flex-shrink-0 mt-0.5" style={{ color:C.accent }}>{i + 1}</span>
                      <span className="text-[13px] leading-relaxed" style={{ color:C.inkSoft }}>{prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowProfile(false)} className="w-full py-3.5 rounded-2xl text-[14px] cursor-pointer border-0"
              style={{ background:"rgba(139,115,85,0.1)", color:C.inkSoft, fontFamily:"'Hanken Grotesk',sans-serif" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { C, PROFILE_FIELDS } from "../../lib/constants";
import type { UserProfile, ChatThread, Screen } from "../../lib/types";
import { AvatarCircle } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { BottomNav } from "../ui/BottomNav";

export function MessagesScreen({
  currentUser, onNavigate, inboxCount, msgCount, onUnreadCount, refreshKey,
}: { currentUser: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number; onUnreadCount: (n: number) => void; refreshKey?: number }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: reqs } = await supabase.from("meet_requests").select("id, from_id, to_id, created_at").or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`).eq("status", "accepted").order("created_at", { ascending: false });
      if (!reqs) { setLoading(false); return; }
      const reqIds = (reqs as { id: string }[]).map(r => r.id);
      const { data: meetAgainRows } = await supabase.from("meet_again").select("user_id, request_id").in("request_id", reqIds.length > 0 ? reqIds : ["__none__"]);
      const mutualYesIds = new Set<string>();
      const yesMap: Record<string, string[]> = {};
      for (const row of (meetAgainRows ?? []) as { user_id: string; request_id: string }[]) {
        if (!yesMap[row.request_id]) yesMap[row.request_id] = [];
        yesMap[row.request_id].push(row.user_id);
      }
      for (const [reqId, users] of Object.entries(yesMap)) {
        if (users.length >= 2) mutualYesIds.add(reqId);
      }
      const mutualReqs = (reqs as { id: string; from_id: string; to_id: string; created_at: string }[]).filter(r => mutualYesIds.has(r.id));
      const seenPersonIds = new Set<string>();
      const dedupedReqs: { id: string; from_id: string; to_id: string; created_at: string }[] = [];
      for (const r of mutualReqs) {
        const otherId = r.from_id === currentUser.id ? r.to_id : r.from_id;
        if (!seenPersonIds.has(otherId)) { seenPersonIds.add(otherId); dedupedReqs.push(r); }
      }
      const built: ChatThread[] = [];
      for (const r of dedupedReqs) {
        const otherId = r.from_id === currentUser.id ? r.to_id : r.from_id;
        const { data: other } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", otherId).single();
        if (!other) continue;
        const { data: msgs } = await supabase.from("messages").select("content, created_at, sender_id").eq("request_id", r.id).order("created_at", { ascending: false }).limit(1);
        const lastMsg = msgs?.[0] as { content: string; created_at: string; sender_id: string } | undefined;
        const lastReadKey = `here_read_${currentUser.id}_${r.id}`;
        const lastRead = typeof window !== "undefined" ? localStorage.getItem(lastReadKey) : null;
        const isNew = !lastMsg && !lastRead;
        const unread = !!lastMsg && lastMsg.sender_id !== currentUser.id && (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead));
        built.push({ requestId: r.id, person: other as UserProfile, lastMessage: lastMsg?.content ?? "Chat unlocked — say hello", lastAt: lastMsg?.created_at ?? r.created_at, unread, isNew, unlockedAt: r.created_at });
      }
      built.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
      setThreads(built);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, refreshKey]);

  function formatThreadTime(iso: string) {
    const d = new Date(iso), now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (diffMins < 1)  return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24)    return `${diffH}h ago`;
    return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.cream }}>
      <div className="px-[22px] pt-6 pb-2 flex-shrink-0">
        <div className="text-[24px]" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Messages</div>
        <div className="text-[12px] mt-0.5" style={{ color:C.warmMid }}>Chats with people you've met</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight: 0 }}>
        {loading && <div className="flex items-center justify-center py-16"><div className="text-[28px]" style={{ animation:"spin 1s linear infinite" }}>⟳</div></div>}
        {!loading && threads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="mb-3" style={{ color:C.warmMid, opacity:0.4 }}><Icon name="message" size={42} stroke={1.4} /></div>
            <div className="text-[14px] font-semibold mb-1.5" style={{ color:C.ink }}>No messages yet</div>
            <div className="text-[12px] leading-relaxed" style={{ color:C.warmMid }}>
              When both you and someone you met say you'd meet again, a chat unlocks here.
            </div>
          </div>
        )}
        {!loading && threads.map(t => {
          const firstName = t.person.name.split(",")[0];
          const note = typeof window !== "undefined" ? localStorage.getItem(`here_note_${currentUser.id}_${t.person.id}`) : null;
          const borderColor = t.isNew ? C.green : t.unread ? C.accent : C.border;
          const boxShadow = t.isNew ? "0 2px 12px rgba(74,124,89,0.2)" : t.unread ? "0 2px 12px rgba(196,120,58,0.15)" : "0 1px 8px rgba(26,20,16,0.06)";
          return (
            <div key={t.requestId}
              className="mx-[22px] mb-2.5 p-4 rounded-[18px] bg-white cursor-pointer active:scale-[0.98] transition-transform"
              style={{ boxShadow, border:`1.5px solid ${borderColor}` }}
              onClick={() => onNavigate("chat", { person: t.person, requestId: t.requestId, unlockedAt: t.unlockedAt })}>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <AvatarCircle user={t.person} size={46} />
                  {t.isNew && <span className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: C.green }} />}
                  {!t.isNew && t.unread && <span className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: C.accent }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <div className="font-semibold text-[14px]" style={{ color: C.ink }}>{firstName}</div>
                    <div className="text-[10px] flex-shrink-0 ml-2" style={{ color: (t.isNew || t.unread) ? C.green : C.warmMid }}>{formatThreadTime(t.lastAt)}</div>
                  </div>
                  {t.isNew ? (
                    <div className="text-[11px] mt-0.5 font-medium" style={{ color: C.green }}>New chat unlocked</div>
                  ) : (
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: t.unread ? C.ink : C.warmMid, fontWeight: t.unread ? 600 : 400 }}>{t.lastMessage}</div>
                  )}
                  {note && (
                    <div className="text-[10px] mt-1 truncate" style={{ color:"rgba(139,115,85,0.55)", fontStyle:"italic" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Icon name="note" size={12} stroke={2} /> {note}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div className="h-2" />
      </div>
      <BottomNav messagesCount={msgCount} active="messages" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

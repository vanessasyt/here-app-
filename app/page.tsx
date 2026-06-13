"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { C, EVENTS, BG_OPTIONS } from "./lib/constants";
import type { Screen, UserProfile, InboxRequest, IncResponse } from "./lib/types";

import { SplashScreen }      from "./components/screens/SplashScreen";
import { LoginScreen }       from "./components/screens/LoginScreen";
import { SignupScreen }      from "./components/screens/SignupScreen";
import { OnboardingScreen }  from "./components/screens/OnboardingScreen";
import { EventsScreen }      from "./components/screens/EventsScreen";
import { EventDetailScreen } from "./components/screens/EventDetailScreen";
import { NearbyScreen }      from "./components/screens/NearbyScreen";
import { RequestScreen }     from "./components/screens/RequestScreen";
import { PendingScreen }     from "./components/screens/PendingScreen";
import { InboxScreen }       from "./components/screens/InboxScreen";
import { IncomingScreen }    from "./components/screens/IncomingScreen";
import { MatchScreen }       from "./components/screens/MatchScreen";
import { FollowUpScreen }    from "./components/screens/FollowUpScreen";
import { MessagesScreen }    from "./components/screens/MessagesScreen";
import { ChatScreen }        from "./components/screens/ChatScreen";
import { ProfileScreen }     from "./components/screens/ProfileScreen";

export default function App() {
  const [screen,          setScreen]  = useState<Screen>("splash");
  const [screenData,      setData]    = useState<unknown>(null);
  const [animKey,         setAnimKey] = useState(0);
  const [currentUser,     setUser]    = useState<UserProfile|null>(null);
  const currentUserRef = useRef<UserProfile|null>(null);
  function setUserAndRef(u: UserProfile|null) { currentUserRef.current = u; setUser(u); }

  const [inbox,           setInbox]   = useState<InboxRequest[]>([]);
  const [acceptedSent,    setAcceptedSent] = useState<{ requestId: string; person: UserProfile; recipientHint: string|null } | null>(null);
  const declinedIdsRef = useRef<Set<string>>(new Set());
  const sentPollRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [blockedIds,      setBlockedIds]       = useState<string[]>([]);
  const [autoOffTimer,    setAutoOffTimer]     = useState("never");
  const autoOffRef      = useRef<ReturnType<typeof setTimeout>|null>(null);
  const inboxPollRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const turnOffLiveRef  = useRef<(()=>void)|null>(null);
  const [isLive, setIsLiveState] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("here_is_live") === "true";
    return false;
  });
  function setIsLive(v: boolean) {
    setIsLiveState(v);
    if (typeof window !== "undefined") localStorage.setItem("here_is_live", String(v));
  }
  const [interactedIds,   setInteractedIds]  = useState<string[]>([]);
  const [chatPerson,      setChatPerson]      = useState<UserProfile|null>(null);
  const [chatRequestId,   setChatRequestId]   = useState<string|null>(null);
  const [chatUnlockedAt,  setChatUnlockedAt]  = useState<string|null>(null);
  const [messagesCount,   setMessagesCount]   = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);
  const [followUpPerson,  setFollowUpPerson]  = useState<UserProfile|null>(null);
  const [followUpRequestId, setFollowUpRequestId] = useState<string|null>(null);
  const realtimeChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const fetchInboxInFlightRef = useRef(false);
  const fetchInbox = useCallback(async (userId: string) => {
    if (fetchInboxInFlightRef.current) return;
    fetchInboxInFlightRef.current = true;
    const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data } = await supabase.from("meet_requests").select("*, profiles!meet_requests_from_id_fkey(*)").eq("to_id", userId).eq("status", "pending").gte("created_at", cutoff).order("created_at", { ascending: false });
    fetchInboxInFlightRef.current = false;
    if (!data) return;
    const seenSenders = new Set<string>();
    const mapped: InboxRequest[] = [];
    for (const r of data) {
      if (seenSenders.has(r.from_id)) continue;
      seenSenders.add(r.from_id);
      const sender = r.profiles as UserProfile;
      const ageMs = Date.now() - new Date(r.created_at).getTime();
      const mins  = Math.floor(ageMs / 60_000);
      const timeLabel = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
      mapped.push({
        id: r.id, name: `${sender.name}, ${sender.age}`,
        photo_url: sender.photo_url, bg: sender.bg, gender: "m" as const,
        meta: sender.occupation, tags: sender.interests ?? [],
        reqLabel: r.hint ? `"${r.hint}"` : "Spotted you — wants to say hi",
        time: timeLabel, isNew: true, from_id: r.from_id, hint: r.hint,
      });
    }
    setInbox(mapped.filter(r => !declinedIdsRef.current.has(r.id)));
  }, []);

  const msgCountInFlightRef = useRef(false);
  const fetchMessagesCount = useCallback(async (userId: string) => {
    if (msgCountInFlightRef.current) return;
    msgCountInFlightRef.current = true;
    try {
      const { data: myYes } = await supabase.from("meet_again").select("request_id").eq("user_id", userId);
      if (!myYes || myYes.length === 0) { setMessagesCount(0); return; }
      const myReqIds = myYes.map((r: any) => r.request_id as string);
      const { data: partnerYes } = await supabase.from("meet_again").select("request_id").in("request_id", myReqIds).neq("user_id", userId);
      const mutualIds = new Set((partnerYes ?? []).map((r: any) => r.request_id as string));
      if (mutualIds.size === 0) { setMessagesCount(0); return; }
      let count = 0;
      for (const reqId of mutualIds) {
        const lastReadKey = `here_read_${userId}_${reqId}`;
        const lastRead = typeof window !== "undefined" ? localStorage.getItem(lastReadKey) : null;
        const { data: msgs } = await supabase.from("messages").select("created_at, sender_id").eq("request_id", reqId).neq("sender_id", userId).order("created_at", { ascending: false }).limit(1);
        if (!msgs || msgs.length === 0) continue;
        if (!lastRead || new Date(msgs[0].created_at) > new Date(lastRead)) count++;
      }
      setMessagesCount(count);
    } finally {
      msgCountInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchInbox(currentUser.id);
    fetchMessagesCount(currentUser.id);
    inboxPollRef.current = setInterval(() => fetchInbox(currentUser.id), 30_000);
    const msgPollInterval = setInterval(() => fetchMessagesCount(currentUser.id), 30_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchInbox(currentUser!.id); fetchMessagesCount(currentUser!.id); checkSentAccepted();
        realtimeChannelsRef.current.forEach(ch => { try { ch.subscribe(); } catch { /* ignore */ } });
      }
    }
    function handleFocus() { fetchInbox(currentUser!.id); fetchMessagesCount(currentUser!.id); checkSentAccepted(); }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    const inboxChannel = supabase.channel(`inbox:${currentUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "meet_requests" }, (payload) => { const row = payload.new as any; if (row.to_id === currentUser.id) fetchInbox(currentUser.id); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meet_requests" }, (payload) => { const row = payload.new as any; if (row.to_id === currentUser.id) fetchInbox(currentUser.id); })
      .subscribe();
    const messagesChannel = supabase.channel(`msg_badge:${currentUser.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchMessagesCount(currentUser.id)).subscribe();
    const meetAgainChannel = supabase.channel(`meet_again:${currentUser.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "meet_again" }, () => { fetchMessagesCount(currentUser.id); setMessagesRefreshKey(k => k + 1); }).subscribe();
    const acceptedChannel = supabase.channel(`accepted:${currentUser.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "meet_requests" }, (payload) => { const row = payload.new as any; if (row.from_id === currentUser.id && row.status === "accepted") checkSentAccepted(); }).subscribe();
    realtimeChannelsRef.current = [inboxChannel, messagesChannel, meetAgainChannel, acceptedChannel];

    return () => {
      if (inboxPollRef.current) clearInterval(inboxPollRef.current);
      clearInterval(msgPollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      realtimeChannelsRef.current.forEach(ch => ch.unsubscribe());
      realtimeChannelsRef.current = [];
    };
  }, [currentUser, fetchInbox, fetchMessagesCount]);

  const seenAcceptedIdsRef = useRef<Set<string>>(new Set());
  async function checkSentAccepted() {
    if (!currentUser) return;
    const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data } = await supabase.from("meet_requests").select("*, profiles!meet_requests_to_id_fkey(*)").eq("from_id", currentUser.id).eq("status", "accepted").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data && !declinedIdsRef.current.has(data.id) && !seenAcceptedIdsRef.current.has(data.id)) {
      seenAcceptedIdsRef.current.add(data.id);
      setAcceptedSent({ requestId: data.id, person: data.profiles as UserProfile, recipientHint: data.recipient_hint ?? null });
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    checkSentAccepted();
    sentPollRef.current = setInterval(checkSentAccepted, 5_000);
    return () => { if (sentPollRef.current) clearInterval(sentPollRef.current); };
  }, [currentUser]);

  useEffect(() => {
    if (autoOffRef.current) clearTimeout(autoOffRef.current);
    if (!locationGranted || autoOffTimer === "never") return;
    const ms = autoOffTimer === "30min" ? 30*60_000 : autoOffTimer === "60min" ? 60*60_000 : 120*60_000;
    autoOffRef.current = setTimeout(() => { setLocationGranted(false); setIsLive(false); if (turnOffLiveRef.current) turnOffLiveRef.current(); }, ms);
    return () => { if (autoOffRef.current) clearTimeout(autoOffRef.current); };
  }, [locationGranted, autoOffTimer]);

  const gpsHeartbeatRef = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(() => {
    if (gpsHeartbeatRef.current) clearInterval(gpsHeartbeatRef.current);
    if (!isLive || !currentUser) return;
    const refreshGps = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => { await supabase.from("profiles").update({ lat: pos.coords.latitude, lng: pos.coords.longitude, location_updated_at: new Date().toISOString() }).eq("id", currentUser.id); },
        () => {},
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
      );
    };
    refreshGps();
    gpsHeartbeatRef.current = setInterval(refreshGps, 60_000);
    return () => { if (gpsHeartbeatRef.current) clearInterval(gpsHeartbeatRef.current); };
  }, [isLive, currentUser]);

  const [selectedPersonProfile, setSelectedPersonProfile] = useState<UserProfile|null>(null);
  const [matchPersonProfile,    setMatchPersonProfile]    = useState<UserProfile|null>(null);

  const pendingMetIds: Set<string> = (() => {
    if (!currentUser || typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(`here_met_${currentUser.id}`);
      if (!raw) return new Set();
      return new Set((JSON.parse(raw) as any[]).filter((e:any) => !e.answered).map((e:any) => e.personId as string));
    } catch { return new Set(); }
  })();
  const newCount = inbox.filter(r => r.isNew && (!r.from_id || !pendingMetIds.has(r.from_id))).length + (acceptedSent ? 1 : 0);

  useEffect(()=>{
    let sessionHandled = false;
    (window as any).__hereAuthInProgress = false;
    const SPLASH_MIN_MS = 1800;
    const splashStart = Date.now();
    function navigateAfterSplash(to: Screen, data?: unknown) {
      const elapsed = Date.now() - splashStart;
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
      setTimeout(() => navigate(to, data), remaining);
    }
    const splashTimeout = setTimeout(() => { if (!sessionHandled) navigate("login"); }, 6_000);
    supabase.auth.getSession().then(async({ data:{ session }, error: sessErr })=>{
      clearTimeout(splashTimeout);
      sessionHandled = true;
      if (sessErr || !session?.user) { navigateAfterSplash("login"); return; }
      try {
        const { data:p } = await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        if (p) {
          setUserAndRef(p as UserProfile);
          const wasLive = localStorage.getItem("here_is_live") === "true";
          if (wasLive) { try { await supabase.from("profiles").update({ open_to_meet: true }).eq("id", session.user.id); } catch { /* ignore */ } }
          const metKey = `here_met_${session.user.id}`;
          const metRaw = localStorage.getItem(metKey);
          if (metRaw) {
            try {
              const metList = JSON.parse(metRaw) as { personId:string; person:UserProfile; requestId:string|null; metAt:string; answered:boolean }[];
              const overdue = metList.find(e => !e.answered && (Date.now() - new Date(e.metAt).getTime()) >= 3 * 3_600_000);
              if (overdue) { setFollowUpPerson(overdue.person); navigateAfterSplash("followup", { person: overdue.person, requestId: overdue.requestId ?? null }); return; }
            } catch { /* ignore */ }
          }
          navigateAfterSplash("events");
        } else {
          navigateAfterSplash("onboarding");
        }
      } catch {
        navigateAfterSplash("login");
      }
    }).catch(() => { clearTimeout(splashTimeout); navigateAfterSplash("login"); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((window as any).__hereAuthInProgress || sessionHandled || currentUserRef.current || !session?.user || event !== "SIGNED_IN") return;
      try {
        const { data:p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (p) { setUserAndRef(p as UserProfile); navigate("events"); }
        else navigate("onboarding");
      } catch { navigate("login"); }
    });
    return () => { clearTimeout(splashTimeout); subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function navigate(to: Screen, data?: unknown) {
    setData(data??null); setScreen(to); setAnimKey(k=>k+1);
    if (typeof window !== "undefined") (window as any).__hereScreen = to;
    if (to === "request" && typeof data === "string") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data).single();
      if (profile) setSelectedPersonProfile(profile as UserProfile);
    }
    if (to === "match") {
      const d = data as any;
      if (d?.person?.id) setMatchPersonProfile(d.person as UserProfile);
      else if (d?.request?.from_id) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", d.request.from_id).single();
        if (profile) setMatchPersonProfile(profile as UserProfile);
      }
    }
    if (to === "chat" && data && typeof data === "object") {
      const pd = data as any;
      if (pd.person)     setChatPerson(pd.person as UserProfile);
      if (pd.requestId)  setChatRequestId(pd.requestId as string);
      if (pd.unlockedAt) setChatUnlockedAt(pd.unlockedAt as string);
    }
    if (to === "followup" && data && typeof data === "object") {
      const pd = data as any;
      if (pd.person)            setFollowUpPerson(pd.person as UserProfile);
      if (pd.requestId !== undefined) setFollowUpRequestId(pd.requestId as string | null);
    }
    if ((to === "messages" || to === "inbox" || to === "events" || to === "nearby" || to === "profile") && currentUser) {
      setTimeout(() => fetchMessagesCount(currentUser.id), 500);
    }
  }

  function declineRequest(id: string) {
    declinedIdsRef.current.add(id);
    supabase.from("meet_requests").update({ status: "declined" }).eq("id", id).then(() => {
      declinedIdsRef.current.delete(id);
      if (currentUser) fetchInbox(currentUser.id);
    });
    setInbox(prev => prev.filter(r => r.id !== id));
    setAcceptedSent(prev => (prev && (prev as any).requestId === id ? null : prev));
    if (screen === "incoming" || screen === "match") navigate("inbox");
  }
  function dismissRequest(id: string) { setInbox(prev=>prev.filter(r=>r.id!==id)); }

  const selectedEvent   = EVENTS.find(e=>e.id===screenData) ?? EVENTS[0];
  const blankUser: UserProfile = { id:"", email:"", name:"User", age:25, occupation:"Professional", interests:[], languages:[], photo_url:null, bg:BG_OPTIONS[0], open_to_meet:true, checked_in_event_id:null, checked_in_at:null, lat:null, lng:null };
  const selectedPerson  = selectedPersonProfile ?? blankUser;
  const selectedRequest = inbox.find(r=>r.id===screenData) ?? null;
  const matchData       = (screen==="match" && screenData && typeof screenData==="object")
    ? screenData as { person?:UserProfile; request?:InboxRequest; response?:IncResponse; fromIncoming?:boolean; recipientHint?:string }
    : {};

  const darkScreens: Screen[] = ["splash","login","signup","match","pending","followup"];
  const isDark = darkScreens.includes(screen);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        body{margin:0;font-family:'Hanken Grotesk',sans-serif;background:#15110E;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
        ::selection{background:rgba(194,90,51,0.22);}
        ::-webkit-scrollbar{display:none;}
        input,textarea,button{font-family:'Hanken Grotesk',sans-serif;}
        input:focus,textarea:focus{box-shadow:0 0 0 3px rgba(194,90,51,0.14);border-color:rgba(194,90,51,0.5)!important;}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse  {0%{box-shadow:0 0 0 0 rgba(63,115,85,0.55)}70%{box-shadow:0 0 0 7px rgba(63,115,85,0)}100%{box-shadow:0 0 0 0 rgba(63,115,85,0)}}
        @keyframes spin   {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes popIn  {0%{opacity:0;transform:scale(0.92)}60%{opacity:1;transform:scale(1.01)}100%{transform:scale(1)}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      `}</style>

      <div className="flex items-start justify-center min-h-screen" style={{ background:"#15110E" }}>
        <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", position:"relative", background:isDark?C.ink:C.cream, overflow:"hidden", boxShadow:"0 0 80px rgba(0,0,0,0.35)" }}>
          <div key={animKey} style={{ animation:"slideIn 0.28s cubic-bezier(0.4,0,0.2,1) forwards", height:"100vh", display:"flex", flexDirection:"column" }}>

            {screen==="splash"     && <SplashScreen onDone={()=>navigate("login")} />}
            {screen==="login"      && <LoginScreen  onNavigate={navigate} onLogin={u=>{ setUserAndRef(u); navigate("events"); }} />}
            {screen==="signup"     && <SignupScreen onNavigate={navigate} />}
            {screen==="onboarding" && <OnboardingScreen onDone={p=>{ setUserAndRef(p); navigate("events"); }} />}
            {screen==="events"     && currentUser && <EventsScreen onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} />}
            {screen==="eventdetail"&& currentUser && <EventDetailScreen event={selectedEvent} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} />}
            {screen==="nearby"     && currentUser && <NearbyScreen currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} locationGranted={locationGranted} onForceTurnOff={(fn)=>{ turnOffLiveRef.current = fn; }} blockedIds={blockedIds} isLive={isLive} setIsLive={setIsLive} interactedIds={interactedIds} setInteractedIds={setInteractedIds} />}
            {screen==="request"    && currentUser && <RequestScreen person={selectedPerson} currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} />}
            {screen==="inbox"      && currentUser && <InboxScreen requests={inbox} onNavigate={navigate} onDecline={declineRequest} onDismiss={dismissRequest} msgCount={messagesCount} currentUser={currentUser} acceptedSent={acceptedSent} onViewMatch={()=>{ if(acceptedSent){ setAcceptedSent(null); navigate("match",{ person: acceptedSent.person, recipientHint: acceptedSent.recipientHint, requestId: acceptedSent.requestId, fromIncoming: false }); }}} />}
            {screen==="incoming"   && selectedRequest && <IncomingScreen request={selectedRequest} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} onDecline={declineRequest} />}
            {screen==="incoming"   && !selectedRequest && (() => { navigate("inbox"); return null; })()}
            {screen==="match"      && currentUser && <MatchScreen matchData={matchData} onNavigate={navigate} currentUser={currentUser} matchPersonProfile={matchPersonProfile} onBlock={(id)=>setBlockedIds(prev=>[...prev,id])} onDecline={declineRequest} onClearAccepted={()=>{ if(acceptedSent){ seenAcceptedIdsRef.current.add(acceptedSent.requestId); } setAcceptedSent(null); }} onMetThem={(id)=>{ setInteractedIds(prev=>[...prev,id]); setInbox(prev => prev.filter(r => r.from_id !== id)); }} />}
            {screen==="pending"    && currentUser && (() => { const pd = screenData as any; return <PendingScreen person={pd?.person ?? blankUser} sentAt={pd?.sentAt ?? new Date().toISOString()} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} currentUser={currentUser} />; })()}
            {screen==="followup"   && followUpPerson && currentUser && <FollowUpScreen person={followUpPerson} requestId={followUpRequestId} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} currentUser={currentUser} />}
            {screen==="messages"   && currentUser && <MessagesScreen currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} msgCount={messagesCount} onUnreadCount={setMessagesCount} refreshKey={messagesRefreshKey} />}
            {screen==="chat"       && chatPerson && currentUser && <ChatScreen person={chatPerson} requestId={chatRequestId} currentUser={currentUser} onNavigate={navigate} inboxCount={newCount} unlockedAt={chatUnlockedAt ?? undefined} />}
            {screen==="profile"    && currentUser && <ProfileScreen currentUser={currentUser} onNavigate={navigate} onSignOut={()=>{ setUserAndRef(null); navigate("login"); }} inboxCount={newCount} msgCount={messagesCount} locationGranted={locationGranted} setLocationGranted={setLocationGranted} autoOffTimer={autoOffTimer} setAutoOffTimer={setAutoOffTimer} onUpdateUser={(u)=>setUserAndRef(u)} />}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { C, EVENTS, ROTATION_MS } from "../../lib/constants";
import type { NearbyUser, UserProfile, Screen } from "../../lib/types";
import { applyRoundRobin, timeAtEventLabel, haversineMetres } from "../../lib/utils";
import { Icon } from "../ui/Icon";
import { AvatarFill } from "../ui/Avatar";
import { InterestTag } from "../ui/InterestTag";
import { BottomNav } from "../ui/BottomNav";

function visibleToViewer(profile: UserProfile, viewer: UserProfile): boolean {
  const pref = profile.visible_to ?? "everyone";
  if (pref === "everyone") return true;
  if (viewer.pronouns === "he/him")  return pref === "men";
  if (viewer.pronouns === "she/her") return pref === "women";
  return false; // they/them or no pronouns only see profiles open to everyone
}

function NearbyCard({ user, onSayHi, onDismiss }: { user: NearbyUser; onSayHi: () => void; onDismiss: () => void }) {
  const timeLabel = timeAtEventLabel(user.minutes_at_event);
  const langs = (user.languages ?? []).slice(0, 3);
  return (
    <div className="rounded-[22px] overflow-hidden flex flex-col"
      style={{ background:C.surface, boxShadow:C.shadowCard, border:`1px solid ${C.border}` }}>
      <div className="relative overflow-hidden" style={{ aspectRatio:"1 / 1.12" }}>
        <AvatarFill user={user} />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-[10.5px] font-bold text-white"
          style={{ background:"rgba(28,23,20,0.42)", backdropFilter:"blur(8px)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background:"#6FD08C", animation:"pulse 2s infinite" }} />
          Active
        </div>
        {user.photo_url && (
          <div className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-white"
            style={{ background:C.green, boxShadow:"0 2px 6px rgba(0,0,0,0.25)" }}>
            <Icon name="check" size={13} stroke={2.6} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5"
          style={{ background:"linear-gradient(to top,rgba(20,16,12,0.82) 0%,rgba(20,16,12,0.32) 55%,transparent 100%)" }}>
          <div className="text-white text-[16px] leading-tight" style={{ fontWeight:700, letterSpacing:"-0.02em" }}>
            {user.name} <span style={{ fontWeight:500, opacity:0.92 }}>{user.age}</span>
          </div>
          {timeLabel && <div className="text-[11px] mt-0.5" style={{ color:"rgba(255,255,255,0.75)" }}>{timeLabel}</div>}
        </div>
      </div>
      <div className="px-3 pt-2.5 flex-1 flex flex-col">
        <div className="text-[12.5px] truncate" style={{ color:C.inkSoft, fontWeight:500 }}>{user.occupation}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {user.interests.slice(0,3).map(i=><InterestTag key={i} interest={i} />)}
        </div>
        {langs.length > 0 && (
          <div className="text-[11px] mt-2 truncate" style={{ color:C.warmMid }}>Speaks {langs.join(", ")}</div>
        )}
        <div className="flex gap-2 mt-auto pt-3 pb-3">
          <button onClick={onSayHi}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-[13px] text-[13px] font-bold text-white border-0 cursor-pointer transition-transform active:scale-[0.97]"
            style={{ background:C.accent }}>
            <Icon name="heart" size={15} /> Say hi
          </button>
          <button onClick={onDismiss}
            className="w-10 rounded-[13px] cursor-pointer flex items-center justify-center transition-colors"
            style={{ border:`1.5px solid ${C.border}`, background:C.surface, color:C.warmMid }} aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NearbyScreen({
  currentUser, onNavigate, inboxCount, msgCount, locationGranted, onForceTurnOff, blockedIds, isLive, setIsLive, interactedIds, setInteractedIds,
}: {
  currentUser: UserProfile; onNavigate: (s: Screen, d?: unknown) => void; inboxCount: number; msgCount: number;
  locationGranted: boolean; onForceTurnOff: (fn: () => void) => void; blockedIds: string[];
  isLive: boolean; setIsLive: (v: boolean) => void;
  interactedIds: string[]; setInteractedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
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
  const myLatRef    = useRef<number|null>(currentUser.lat ?? null);
  const myLngRef    = useRef<number|null>(currentUser.lng ?? null);
  const RADIUS_M    = 500;

  function refreshMyCoords(): Promise<void> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          myLatRef.current = lat; myLngRef.current = lng;
          setMyLat(lat); setMyLng(lng);
          await supabase.from("profiles").update({ lat, lng, location_updated_at: new Date().toISOString() }).eq("id", currentUser.id);
          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 10_000 }
      );
    });
  }

  const fetchUsers = useCallback(async () => {
    await refreshMyCoords();
    const { data: blocksData } = await supabase.from("blocked_users").select("blocker_id, blocked_id").or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`);
    const excludeIds = new Set<string>();
    (blocksData ?? []).forEach((b: any) => {
      if (b.blocker_id === currentUser.id) excludeIds.add(b.blocked_id);
      if (b.blocked_id === currentUser.id) excludeIds.add(b.blocker_id);
    });
    blockedIds.forEach(id => excludeIds.add(id));
    let q = supabase.from("profiles").select("*").eq("open_to_meet",true).neq("id",currentUser.id);
    if (currentUser.checked_in_event_id !== null) q = q.eq("checked_in_event_id", currentUser.checked_in_event_id);
    const { data } = await q;
    let candidates = ((data as UserProfile[]) ?? []).filter(u => !excludeIds.has(u.id) && visibleToViewer(u, currentUser));
    const myLatVal = myLatRef.current, myLngVal = myLngRef.current;
    if (myLatVal !== null && myLngVal !== null) {
      candidates = candidates.filter(u => {
        if (u.lat === null || u.lng === null) return false;
        return haversineMetres(myLatVal, myLngVal, u.lat, u.lng) <= RADIUS_M;
      });
    } else {
      candidates = [];
    }
    setRawUsers(candidates);
  }, [currentUser.id, currentUser.checked_in_event_id, blockedIds]);

  async function toggleLoc() {
    if (locOn) {
      setLocOn(false); setIsLive(false); localStorage.removeItem("here_is_live");
      await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id",currentUser.id);
      setRawUsers([]);
      if (pollRef.current) clearInterval(pollRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
      return;
    }
    setLoading(true); setLocError(null);
    if (!navigator.geolocation) { setLocError("Your browser doesn't support location services."); setLoading(false); return; }
    const geoOptions = locationGranted
      ? { enableHighAccuracy:false, timeout:5_000, maximumAge:600_000 }
      : { enableHighAccuracy:false, timeout:20_000, maximumAge:300_000 };
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setMyLat(lat); setMyLng(lng); myLatRef.current = lat; myLngRef.current = lng;
        await supabase.from("profiles").update({ open_to_meet:true, lat, lng, location_updated_at: new Date().toISOString() }).eq("id", currentUser.id);
        await fetchUsers();
        setLoading(false); setLocOn(true); setIsLive(true);
        pollRef.current = setInterval(fetchUsers, 15_000);
        rotationRef.current = setInterval(()=>setOffset(o=>o+1), ROTATION_MS);
        onForceTurnOff(async () => {
          setLocOn(false); setIsLive(false); localStorage.removeItem("here_is_live");
          await supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id", currentUser.id);
          setRawUsers([]);
          if (pollRef.current) clearInterval(pollRef.current);
          if (rotationRef.current) clearInterval(rotationRef.current);
        });
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) setLocError("Location denied. On iPhone: Settings → Safari → Location → set to Allow. Then reload the page.");
        else if (err.code === err.POSITION_UNAVAILABLE) setLocError("Location unavailable. Make sure Location Services is on in iPhone Settings → Privacy → Location Services.");
        else if (err.code === err.TIMEOUT) setLocError("Location timed out. Please try again.");
        else setLocError(`Location error (code ${err.code}). Please try again.`);
      },
      geoOptions
    );
  }

  useEffect(() => {
    if (!locationGranted && locOn) {
      setLocOn(false); setIsLive(false);
      supabase.from("profiles").update({ open_to_meet:false, lat:null, lng:null, location_updated_at:null }).eq("id", currentUser.id);
      setRawUsers([]);
      if (pollRef.current) clearInterval(pollRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
    }
  }, [locationGranted]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (rotationRef.current) clearInterval(rotationRef.current);
  }, []);

  useEffect(() => {
    if (isLive && locationGranted) {
      fetchUsers();
      if (!pollRef.current) pollRef.current = setInterval(fetchUsers, 15_000);
      if (!rotationRef.current) rotationRef.current = setInterval(()=>setOffset(o=>o+1), ROTATION_MS);
    } else if (locationGranted && !isLive) {
      toggleLoc();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordered = applyRoundRobin(rawUsers, offset);
  const visible = ordered.filter(u=>!dismissed.includes(u.id) && !blockedIds.includes(u.id) && !interactedIds.includes(u.id));
  const eventName = currentUser.checked_in_event_id !== null
    ? (EVENTS.find(e=>e.id===currentUser.checked_in_event_id)?.name ?? "this event")
    : null;

  return (
    <div className="flex flex-col h-full" style={{ background:C.cream }}>
      <div className="flex justify-between items-center px-5 pt-5 pb-0 flex-shrink-0">
        <div>
          {eventName && <div className="text-[11px] uppercase tracking-[1.5px] font-semibold" style={{ color:C.warmMid }}>At {eventName}</div>}
          <div className="text-[22px] mt-0.5" style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:800,letterSpacing:"-0.03em", color:C.ink }}>Nearby</div>
          {locOn && <div className="text-[11px] mt-0.5 font-medium" style={{ color:C.warmMid }}>Within <strong style={{ color:C.ink }}>500 m</strong></div>}
        </div>
        <button onClick={locationGranted ? toggleLoc : undefined} disabled={loading || !locationGranted}
          title={!locationGranted ? "Enable Location Access in Profile first" : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-0 transition-all duration-300 flex-shrink-0"
          style={{ background: locOn ? "rgba(74,124,89,0.12)" : locationGranted ? "rgba(139,115,85,0.10)" : "rgba(139,115,85,0.05)", border: `1.5px solid ${locOn ? "rgba(74,124,89,0.35)" : locationGranted ? C.border : "rgba(139,115,85,0.1)"}`, cursor: locationGranted ? "pointer" : "not-allowed", opacity: locationGranted ? 1 : 0.45 }}>
          {loading
            ? <span style={{ fontSize:11, animation:"spin 1s linear infinite", display:"inline-block", color:C.warmMid }}>⟳</span>
            : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: locOn ? C.green : C.warmMid, animation: locOn ? "pulse 2s infinite" : "none", display:"inline-block" }} />}
          <span className="text-[11px] font-semibold" style={{ color: locOn ? C.green : C.warmMid }}>
            {loading ? "Locating…" : locOn ? "Live" : "Go live"}
          </span>
        </button>
      </div>
      {!locationGranted && (
        <div className="mx-5 mt-2 text-center text-[11px]" style={{ color:C.warmMid }}>
          Enable <strong>Location Access</strong> in Profile — Nearby activates automatically
        </div>
      )}
      {locError && (
        <div className="mx-5 mt-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed flex-shrink-0" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#dc2626" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Icon name="pin" size={14} stroke={2} /> {locError}</span>
        </div>
      )}
      {locOn ? (
        <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight:0 }}>
          <div className="px-5 pt-3 flex justify-between items-center">
            <div className="text-[13px] font-semibold" style={{ color:C.ink }}>
              {loading ? "Finding people…" : `${visible.length} members open to meet`}
            </div>
            {eventName && <div className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color:C.accent }}><Icon name="ticket" size={13} stroke={2} /> Same event</div>}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-3xl" style={{ animation:"spin 1s linear infinite" }}>⟳</div>
            </div>
          ) : visible.length===0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
              <div className="mb-3" style={{ color:C.warmMid, opacity:0.45 }}><Icon name="search" size={40} stroke={1.5} /></div>
              <div className="text-[14px] font-semibold" style={{ color:C.ink }}>No one else is open to meet yet</div>
            </div>
          ) : (
            <div className="px-5 pt-3 grid grid-cols-2 gap-3">
              {visible.map(u=>(
                <NearbyCard key={u.id} user={u}
                  onSayHi={()=>{ setInteractedIds(prev=>[...prev,u.id]); onNavigate("request",u.id); }}
                  onDismiss={()=>{ setDismissed(prev=>[...prev,u.id]); setInteractedIds(prev=>[...prev,u.id]); }} />
              ))}
            </div>
          )}
          <div className="mx-5 mt-3.5 mb-2 p-3 rounded-xl text-xs leading-relaxed" style={{ background:"rgba(139,115,85,0.08)", color:C.warmMid }}>
            You're visible to others nearby. Turn off Location Access in Profile to go invisible, or tap Live above.
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
          <div className="mb-4" style={{ color:C.warmMid, opacity:0.4 }}><Icon name="radar" size={52} stroke={1.4} /></div>
          <div className="text-[15px] font-semibold mb-2" style={{ color:C.ink }}>Discover people around you</div>
          <div className="text-[13px] leading-relaxed" style={{ color:C.warmMid }}>Enable <strong>Location Access</strong> in Profile — you'll appear to others and see who's nearby automatically.</div>
        </div>
      )}
      <BottomNav messagesCount={msgCount} active="nearby" onNavigate={onNavigate} inboxCount={inboxCount} />
    </div>
  );
}

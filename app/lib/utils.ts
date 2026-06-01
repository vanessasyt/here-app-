import type { NearbyUser, UserProfile } from "./types";
import { ROTATION_MS } from "./constants";

export function applyRoundRobin(users: UserProfile[], offset: number): NearbyUser[] {
  if (!users.length) return [];
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

export function timeAtEventLabel(mins: number) {
  if (mins < 1)  return "";
  if (mins < 60) return `${mins}m here`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m here` : `${h}h here`;
}

export function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getPronouns(person?: UserProfile | null) {
  const p: string = person?.pronouns ?? ((person as any)?.gender === "m" ? "he/him" : "she/her");
  if (p === "he/him")    return { sub: "He",   obj: "him",  goFind: "Go find him"  };
  if (p === "they/them") return { sub: "They", obj: "them", goFind: "Go find them" };
  return                         { sub: "She",  obj: "her",  goFind: "Go find her"  };
}

export { ROTATION_MS };

"use client";

import { C } from "../../lib/constants";
import { Icon, type IconName } from "./Icon";
import type { NavTab, Screen } from "../../lib/types";

export function BottomNav({
  active, onNavigate, dark, inboxCount, messagesCount,
}: { active: NavTab; onNavigate: (s: Screen) => void; dark?: boolean; inboxCount?: number; messagesCount?: number }) {
  const items: { id: NavTab; dest: Screen; icon: IconName; label: string }[] = [
    { id:"events",   dest:"events",   icon:"calendar", label:"Events"   },
    { id:"nearby",   dest:"nearby",   icon:"radar",    label:"Nearby"   },
    { id:"inbox",    dest:"inbox",    icon:"heart",    label:"Requests" },
    { id:"messages", dest:"messages", icon:"message",  label:"Messages" },
    { id:"profile",  dest:"profile",  icon:"user",     label:"Profile"  },
  ];
  const idle = dark ? "rgba(246,241,233,0.5)" : C.warmMid;
  const onColor = dark ? C.cream : C.ink;
  return (
    <div
      className="flex items-center justify-around px-2 pt-2 pb-3 flex-shrink-0"
      style={{ background: dark ? C.ink : C.surface, borderTop: `1px solid ${dark ? "rgba(246,241,233,0.08)" : C.border}` }}
    >
      {items.map((item) => {
        const on = active === item.id;
        const badge = item.id === "inbox" ? (inboxCount ?? 0) : item.id === "messages" ? (messagesCount ?? 0) : 0;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.dest)}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 border-0 bg-transparent cursor-pointer relative transition-all"
            style={{ color: on ? onColor : idle }}
          >
            <span className="relative">
              <Icon name={item.icon} size={23} stroke={on ? 2 : 1.75} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: C.accent, boxShadow: `0 0 0 2px ${dark ? C.ink : C.surface}` }}>
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[10px]" style={{ fontWeight: on ? 700 : 500, letterSpacing: "0.01em" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

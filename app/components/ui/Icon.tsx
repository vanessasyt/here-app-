export type IconName =
  | "back" | "search" | "close" | "check" | "chevron" | "pin" | "ticket"
  | "calendar" | "camera" | "clock" | "mail" | "spark" | "heart" | "message"
  | "user" | "radar" | "star" | "send" | "shield" | "compass"
  | "music" | "art" | "food" | "comedy" | "fitness" | "film" | "note" | "qr";

const ICON_PATHS: Record<IconName, { d: string; fill?: boolean; extra?: string }> = {
  back:     { d: "M19 12H5 M12 19l-7-7 7-7" },
  search:   { d: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16.5 16.5L21 21" },
  close:    { d: "M6 6l12 12 M18 6L6 18" },
  check:    { d: "M4 12.5l5 5L20 6" },
  chevron:  { d: "M9 5l7 7-7 7" },
  pin:      { d: "M12 21s-6.5-6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15 12 21 12 21z", extra: "M12 8.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z" },
  ticket:   { d: "M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a2 2 0 0 0 0 3v2A1.5 1.5 0 0 1 18.5 17h-13A1.5 1.5 0 0 1 4 15.5v-2a2 2 0 0 0 0-3v-2z", extra: "M13 7.5v9" },
  calendar: { d: "M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11z", extra: "M5 9.5h14 M9 3.5v3 M15 3.5v3" },
  camera:   { d: "M4.5 8.5A1.5 1.5 0 0 1 6 7h1.6l1.2-1.7a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4L16.4 7H18a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 18H6a1.5 1.5 0 0 1-1.5-1.5v-8z", extra: "M12 9.8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  clock:    { d: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", extra: "M12 8v4.2l2.8 1.8" },
  mail:     { d: "M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9z", extra: "M4.5 8l7.5 5 7.5-5" },
  spark:    { d: "M12 2.5c.7 4.8 3 7.1 7.5 7.5-4.5.5-6.8 2.8-7.5 7.5-.7-4.7-3-7-7.5-7.5C9 9.6 11.3 7.3 12 2.5z", fill: true },
  heart:    { d: "M12 20.3l-1.3-1.2C5.5 14.4 2.2 11.4 2.2 7.8 2.2 5.2 4.2 3.2 6.7 3.2c1.6 0 3.2.9 4 2.2l1.3 1.9 1.3-1.9c.8-1.3 2.4-2.2 4-2.2 2.5 0 4.5 2 4.5 4.6 0 3.6-3.3 6.6-8.5 11.3L12 20.3z", fill: true },
  message:  { d: "M20.5 11.5a8 8 0 0 1-11.5 7.2L4 20.5l1.4-4.6A8 8 0 1 1 20.5 11.5z" },
  user:     { d: "M12 4.5a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z", extra: "M5.5 19.5c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" },
  radar:    { d: "M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z", fill: true, extra: "M8.8 8.8a4.5 4.5 0 0 0 0 6.4 M15.2 8.8a4.5 4.5 0 0 1 0 6.4 M6 6a8 8 0 0 0 0 12 M18 6a8 8 0 0 1 0 12" },
  star:     { d: "M12 3.6l2.5 5.1 5.6.8-4 3.9 1 5.6L12 16.4 6.9 19l1-5.6-4-3.9 5.6-.8L12 3.6z", fill: true },
  send:     { d: "M12 20V5 M5.5 11.5L12 5l6.5 6.5" },
  shield:   { d: "M12 3l7 2.8v5.4c0 4.4-3 7.8-7 8.8-4-1-7-4.4-7-8.8V5.8L12 3z", extra: "M9 12l2 2 4-4" },
  compass:  { d: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", extra: "M15.2 8.8l-1.7 4.7-4.7 1.7 1.7-4.7 4.7-1.7z" },
  music:    { d: "M9 17V6l9-1.8V15", extra: "M9 17a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0z M18 15a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0z" },
  art:      { d: "M4.5 5.5h15v13h-15z", extra: "M8.3 10.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z M4.5 16l4.3-3.6L13 16l3-2.2 2.5 2.2" },
  food:     { d: "M6 4v6a2 2 0 0 0 4 0V4 M8 10v10", extra: "M16 4c-1.4 1-2 3-2 5s.6 3.2 2 4.2V20" },
  comedy:   { d: "M12 4a2.6 2.6 0 0 1 2.6 2.6V11a2.6 2.6 0 0 1-5.2 0V6.6A2.6 2.6 0 0 1 12 4z", extra: "M6.5 11a5.5 5.5 0 0 0 11 0 M12 16.5V20 M9 20h6" },
  fitness:  { d: "M3 12h3.5l2 5.5L12 6l2 6h7" },
  film:     { d: "M4.5 5.5h15v13h-15z", extra: "M8 5.5v13 M16 5.5v13 M4.5 9.2h3.5 M16 9.2h3.5 M4.5 14.8h3.5 M16 14.8h3.5" },
  note:     { d: "M16.5 4.5l3 3-9.5 9.5-3.8.8.8-3.8 9.5-9.5z", extra: "M14.5 6.5l3 3" },
  qr:       { d: "M5 5h5v5H5z M14 5h5v5h-5z M5 14h5v5H5z", extra: "M14 14h2v2h-2z M18 14h1 M14 18v1 M18 18h1" },
};

const CATEGORY_ICON: Record<string, IconName> = {
  music: "music", art: "art", food: "food", comedy: "comedy",
  fitness: "fitness", dance: "music", film: "film", theatre: "comedy",
};

export function categoryIcon(cat: string): IconName { return CATEGORY_ICON[cat] ?? "spark"; }

export function Icon({ name, size = 22, stroke = 1.75, className, style }:
  { name: IconName; size?: number; stroke?: number; className?: string; style?: React.CSSProperties }) {
  const ic = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={className} style={{ display: "block", flexShrink: 0, ...style }}>
      <path d={ic.d}
        fill={ic.fill ? "currentColor" : "none"}
        stroke={ic.fill && !ic.extra ? "none" : "currentColor"}
        strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      {ic.extra && <path d={ic.extra} fill="none" stroke="currentColor"
        strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

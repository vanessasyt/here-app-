// ───────────────────────────────────────────────────────────────────────────
// THIS IS A "SERVER COMPONENT".
//
// Notice there is NO  "use client"  line at the top. That one difference means
// this page is built on the SERVER and sent to the phone as ready-made HTML.
// The list below ships with ZERO app JavaScript — the browser just displays it.
//
// Compare with app/page.tsx, which DOES start with "use client": that entire app
// is built inside the browser instead, after downloading all the screen code.
//
// Open this page in the app (/events-server) and use "View Source": you'll see
// the events are already in the HTML. Nothing has to run to show them.
// ───────────────────────────────────────────────────────────────────────────

import { EVENTS } from "../lib/constants";

export const metadata = {
  title: "Events (server-rendered) · here.",
};

export default function EventsServerPage() {
  // In a real migration, this is where you'd load data ON THE SERVER, e.g.
  //
  //   const supabase = await createServerSupabase();   // server-side client
  //   const { data: events } = await supabase.from("events").select("*");
  //
  // For this proof of concept we reuse the existing hardcoded list, so the only
  // thing being demonstrated is *where* the rendering happens (the server).
  const events = EVENTS;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 12, color: "#3F7355", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        Rendered on the server
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 8px" }}>Events</h1>
      <p style={{ color: "#666", fontSize: 14, lineHeight: 1.5 }}>
        This whole list arrived as finished HTML from the server. No app
        JavaScript runs to show it — that&apos;s the difference from the current
        browser-only app.
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {events.map((e) => (
          <li key={e.id} style={{ padding: "12px 0", borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 600 }}>{e.name}</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
              {e.venue} · {e.area} · {e.time}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

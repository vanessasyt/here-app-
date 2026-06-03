// ───────────────────────────────────────────────────────────────────────────
// THIS IS A "ROUTE HANDLER" — a small API that runs on the SERVER.
//
// Visit /api/events in the browser (or `curl` it) and the SERVER answers with
// JSON. The important idea: the phone asks YOUR server for data, instead of the
// phone talking straight to the database.
//
// That matters because the server is a place the user can't tamper with. It's
// where you put the things the browser can't be trusted with:
//   • checking who is actually logged in,
//   • keeping secret keys,
//   • rate-limiting, validation, and the "both people agreed" rules.
//
// See docs/nextjs-migration.md for how this same shape is used for the real,
// logged-in actions (send message / accept request / report) with a server-side
// Supabase client.
// ───────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { EVENTS } from "../../lib/constants";

export async function GET() {
  // In a real migration you'd fetch from the database here. For this proof of
  // concept we just return the existing hardcoded list so you can see the shape.
  return NextResponse.json({ events: EVENTS });
}

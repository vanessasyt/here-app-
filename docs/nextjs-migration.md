# Using Next.js properly — a simple plan

This is a sketch of how to move `here.` from a "everything runs in the browser"
app to one that uses Next.js the way it's meant to be used. Plain language, no
big-bang rewrite required.

---

## 1. The whole idea, in one picture

**Today** — everything happens in the phone's browser, and the browser talks
straight to the database:

```
[ phone browser ] ───────talks straight to──────> [ Supabase database ]
   (all the screens AND all the rules live here)
```

The problem: a browser is the user's turf. Anyone can open the dev tools and poke
at it. So any rule you only enforce in the browser can be worked around.

**Proper Next.js** — put a small, trusted helper in the middle that runs on a
server *you* control:

```
[ phone browser ] ──> [ your Next.js server ] ──> [ Supabase database ]
   (just the screens)    (the rules + secrets live here)
```

The server can't be tampered with by the user, so that's where the important
decisions and any secrets belong.

---

## 2. The three kinds of files (this is the key idea)

In a "proper" Next.js app, code lives in one of three buckets:

| Bucket | What it is | Use it for | Ships JavaScript to the phone? |
|---|---|---|---|
| **Server Component** (the default — no special line at the top) | A page built on the server and sent as finished HTML | Things that just need to be *shown*: the events list, a profile you're viewing | No (or very little) → faster |
| **Client Component** (`"use client"` at the top) | The interactive bits that run in the browser | Typing a message, the live "Nearby" refresh, buttons, anything using taps/timers | Yes |
| **Route Handler / Server Action** | A small server function the browser calls to *do* something | Send a message, accept a request, block someone — the trusted stuff | It runs on the server, not the phone |

Today the app uses **only the middle bucket** — almost every file starts with
`"use client"`. The plan is to move the right things into the other two buckets.

---

## 3. What the app looks like today

- One file, `app/page.tsx`, is basically the whole app — and it's a Client Component.
- The "pages" (Events, Nearby, Chat…) are a `screen` variable, not real web addresses.
- **Every** database call is made directly from the browser with the public key.

---

## 4. What it could look like after

A folder sketch (real web addresses, work split across the three buckets):

```
app/
  layout.tsx                # shared shell — already fine as-is
  page.tsx                  # splash / home (small client component)

  events/page.tsx           # SERVER  — list of events (no JS needed to show it)
  nearby/page.tsx           # CLIENT  — live list (needs location + auto-refresh)
  messages/page.tsx         # SERVER shell + a small CLIENT list inside
  messages/[id]/page.tsx    # one chat — a REAL address you can deep-link to
  profile/page.tsx          # mostly SERVER; the "edit" popups stay CLIENT

  api/
    nearby/route.ts         # SERVER — "who's near me?" (asks the DB safely)
    requests/route.ts       # SERVER — send / accept / decline a request
    messages/route.ts       # SERVER — send a message (checks it's really you)
    report/route.ts         # SERVER — report + block

  lib/
    supabase-client.ts      # browser client — for login + realtime chat only
    supabase-server.ts      # server client — used by everything in api/
```

Plain-words mapping of today's screens:

| Today (a `screen` value) | Becomes | Why |
|---|---|---|
| Events / Event detail | **Server Component** | It's basically static — no reason to build it in the browser |
| Nearby | **Client** page, data from `api/nearby` | Needs the live refresh, but the DB call moves to the server |
| Requests / Incoming | **Client** page, actions via `api/requests` | The accept/decline decision is enforced on the server |
| Match / Pending / Follow-up | **Client** pages, unlock via `api/...` | The "both said yes → open chat" rule lives on the server |
| Messages list / Chat | **Server** list + **Client** chat box | Reading is server work; live typing stays in the browser |
| Profile | **Server** view + **Client** edit popups | Showing it is server work; editing is interactive |

---

## 5. How to get there (no scary rewrite)

Each step ships on its own and can be undone:

1. **Add the server-side Supabase helper** (`lib/supabase-server.ts`). Nothing
   changes for users yet.
2. **Move ONE action to the server.** Pick "send a message": the chat screen
   calls `POST /api/messages` instead of writing to the DB directly. Test it.
3. **Repeat** for accept/decline, report/block, and the follow-up "meet again"
   unlock — the rules that matter most for safety and fairness.
4. **Turn the static screens into Server Components** (Events first, then the
   read-only profile view). Instant smaller download.
5. **Switch login to cookie-based auth** (`@supabase/ssr`) so the server knows
   who is logged in. This is what makes the `api/` routes able to trust the user.
6. **Give screens real web addresses** one at a time, keeping the old
   screen-switcher working until each one is moved over.

---

## 6. What's in THIS pull request (a tiny taste)

Two small, self-contained examples that **do not touch the existing app** — they
just prove the two patterns work:

1. **`/events-server`** — the Events list as a **Server Component**
   (`app/events-server/page.tsx`). Open it and "View Source": the events are
   already in the HTML, with no app JavaScript needed to show them.
2. **`/api/events`** — a **Route Handler** (`app/api/events/route.ts`). Visit it
   or `curl` it and the **server** replies with JSON. This is the exact shape
   every "do it on the server" call would take.

---

## 7. The pattern for the real, logged-in server calls

This is what steps 1–3 above look like in code. Not wired into the app yet (it
needs the `@supabase/ssr` package and cookie login from step 5), shown here so
the shape is clear.

**The server-side Supabase helper** — `app/lib/supabase-server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Builds a Supabase client that knows who is logged in, using the cookie the
// browser sends. Runs only on the server.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component — safe to ignore */ }
        },
      },
    }
  );
}
```

**A trusted action** — e.g. `app/api/messages/route.ts` ("send a message"):

```ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "../../lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();

  // 1) The SERVER checks who you are — the browser can't fake this.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { requestId, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // 2) The SERVER decides sender_id — so you can't post as someone else.
  const { error } = await supabase
    .from("messages")
    .insert({ request_id: requestId, sender_id: user.id, content: content.trim() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

The chat screen would then call `fetch("/api/messages", { method: "POST", ... })`
instead of writing to the database directly. Same idea for accept/decline,
report/block, and the "meet again" unlock.

---

### A note on the other PRs

Those fixes (server-side Nearby, locking columns, RLS rules) made the
**current** browser-only setup much safer. This migration is the longer-term
direction: with a trusted server in the middle, some of those guards become a
built-in part of the architecture instead of something you have to remember to
enforce in two places.

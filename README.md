# here.

**Meet in the moment.**

Most dating apps are built around the idea that conversation leads to meeting. `here.` inverts that: you meet first, decide if you want to stay in touch after, and only then does a chat open. No cold DMs. No ghosting. No match that goes nowhere because neither person felt like typing first.

---

## How it works

You go live at a venue. So does someone else. You see each other on Nearby and one of you taps to express interest. If the other person accepts, you both get a timed green light — go introduce yourself. After you've met, you each privately answer *"how did it go?"*. If you both say yes, a chat unlocks. If either of you says no, nothing happens and the other person never finds out.

That's the whole loop.

**Six screens:**

- **Events** — what's on nearby; partner venues use a QR check-in to scope Nearby to just their attendees
- **Nearby** — who's live within 500m, round-robin ordered so no one's stuck at the bottom
- **Requests** — incoming interest, the green-light banner, and follow-up prompts after a meeting
- **Match** — the green-light screen with a countdown, location hint, and the other person's "ask me about" prompts
- **Messages** — chats that unlocked after mutual yes; sorted by unread first
- **Profile** — photo, interests, languages, pronouns, ask-me prompts, and a visibility auto-off timer

**Onboarding** is five steps: photo, interests (up to 3), spoken languages, three "ask me about…" prompts, and pronouns. The pronouns matter — the match screen reads *"She accepted. Go find her."* rather than a generic line.

---

## Stack

Single-file Next.js app — all screens, tokens, and state live in `page.tsx`. Supabase handles auth, profiles, photo storage, realtime subscriptions, and the full data model.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

Deploy on Vercel. Push to `main`, it ships.

---

## Data model

| Table | What it stores |
|---|---|
| `profiles` | Identity, photo, interests, languages, pronouns, ask-me prompts, `lat`/`lng`, `open_to_meet` |
| `meet_requests` | `from_id`, `to_id`, status (`pending / accepted / declined`), sender hint, timing |
| `meet_again` | One row per person per request — two rows means both said yes, chat unlocks |
| `messages` | Per-request chat messages, streamed via realtime |
| `blocked_users` | Bidirectional block pairs, checked on every Nearby fetch |
| `reports` | Append-only safety log |

---

## A few implementation details worth knowing

**Round-robin, no ranking.** Nearby sorts by earliest check-in and rotates the top slot every 30 seconds. There's no score, no signal based on how many people tapped someone's card, nothing that creates a popularity feedback loop.

**Realtime + polling fallback.** Four Supabase realtime channels per logged-in user cover incoming requests, message badge updates, chat unlocks, and sent-request status changes. A 15-second polling interval runs alongside each channel for flaky mobile connections. The Page Visibility API triggers a full re-fetch the moment the user returns to the app from a backgrounded tab.

**Double-tap guard.** A `submittingRef` ref blocks any second call to express interest before the first one resolves. There's also a 30-minute uniqueness check server-side so the same request can't be sent twice in a window.

**Safety.** Every match screen has a Report button — writes to `reports`, inserts into `blocked_users`, removes the request. Blocked users never appear in either person's Nearby again. The auto-off timer (30 min / 1 hr / 2 hr / never) cuts discoverability automatically so users aren't broadcasting their location indefinitely.

---

## Why this launch model

`here.` only works when multiple people are live in the same place at the same time. The Events tab solves that: a venue's QR code checks users into a specific event, and Nearby filters to only those attendees. You get instant density in a closed context without needing a city-wide user base first. The plan is event by event, venue by venue, city by city — not a broad consumer launch.

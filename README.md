# here.

> **Meet in the moment.**

Dating and social apps today prioritise digital interaction over real-world connection. Conversations replace meetings. People hesitate to approach strangers in real life. Existing real-world overlaps — the same bar, the same concert, the same train carriage — go completely unnoticed. `here.` is built to fix that: a platform that turns physical proximity into a clear, mutual, in-person introduction without ever becoming another chat app.

The flow is deliberately short: **proximity → intent → meeting**. Users go live when they're open to meeting, see who else is at the same place at the same time, express interest in someone in particular, and — only if the other person also expresses interest — receive a green light to go and introduce themselves in person. There is no messaging layer. There is no endless swiping. The interaction is time-limited, location-aware, and ends in the real world.

## Code

The app is a single-page Next.js / React application (`page.tsx`) backed by **Supabase** for auth, profile storage, realtime-style polling, photo storage, and a `meet_requests` table that tracks every interest expression from `pending → accepted | declined`. All screens, design tokens, and state transitions are contained in one file to keep the product logic auditable end-to-end.

### Key mechanics

**Go live.** When a user taps *Go live*, the app requests GPS, writes `open_to_meet = true` and the user's `lat` / `lng` to their profile row, and starts two intervals: one polls Supabase every 15 seconds for other live users, the other advances a round-robin display offset every 30 seconds so no one is permanently pinned to the top slot. A GPS heartbeat refreshes the user's own coordinates every 60 seconds at low accuracy to preserve battery while keeping the distance filter accurate.

**Discovery with no ranking.** The Nearby screen filters other live users to a 500 m radius using the Haversine formula, then orders them by earliest check-in as a proxy for arrival time. There is deliberately no popularity score, no attractiveness signal, and no algorithmic ordering — every live user gets equal time in the top slot via the rotation offset. Interest tags and languages are shown only as conversation starters, never as ranking inputs.

**Express interest.** Tapping a card inserts a row into `meet_requests` with `status = 'pending'`. A daily uniqueness check prevents the same user from pinging the same person more than once in a 24-hour window. The sender is sent to a Pending screen that polls for a status change but never auto-navigates — the user chooses when to move on.

**Mutual confirmation.** Incoming requests surface in the recipient's Requests tab within 10 seconds of being sent. The recipient can accept now, accept in 15 minutes, accept in 30 minutes, or decline. Delayed accepts prompt an optional free-text area hint (*"near the tube exit"*, *"by the bar"*) which is surfaced to the sender on the Match screen. Once accepted, both parties see a dark green-light screen with a countdown timer; the green light expires at the 15- or 30-minute mark and the request is effectively dead.

**Photo freshness.** Profile photos must be taken with the device camera (`capture="user"`, no gallery upload path). A green tick renders next to photos taken today; a red cross renders if the user's photo is older. This is enforced visually rather than technically to encourage accurate same-day representation — the core premise of `here.` is that you look like your photo right now, because you and the other person are about to meet.

**Safety.** Every Match screen has a Report button that writes to a `reports` table, inserts a bidirectional row into `blocked_users`, and removes the associated request. The block list is evaluated on every Nearby fetch so blocked users never resurface in either direction. An auto-off timer (30 min / 1 hour / 2 hours / never) in the Profile screen force-disables discoverability after a period of inactivity so users aren't accidentally broadcasting their location.

### Data model

Four Supabase tables do all of the work:

- `profiles` — identity, interests, languages, photo URL, current `lat` / `lng`, `open_to_meet` flag, and `checked_in_event_id` for event-scoped discovery.
- `meet_requests` — `from_id`, `to_id`, `status`, optional sender `hint` and recipient `recipient_hint`, `response_timing`, `created_at`.
- `blocked_users` — bidirectional block rows excluded from every profile query.
- `reports` — append-only log of safety reports for review.

## Product

The five screens that matter are **Events** (what's on near me), **Nearby** (who else is here and open to meet), **Requests** (the inbox of pending and accepted interest), **Match** (the green light — go find them), and **Profile** (photo, interests, languages, visibility controls). Onboarding is a four-step flow: camera selfie, up to three interests, languages spoken, and a preview of the card others will see.

## Go-to-market

`here.` is designed to launch in high-density, synchronised-usage environments where the same-place-same-time assumption holds for hundreds of people at once: student bars, university campuses, festivals, concert venues, and sponsored events. The Events tab is the wedge — a partner venue's QR code checks users in to a specific event, and the Nearby tab automatically filters to only other attendees of that same event. This creates instant density inside a closed context and removes the cold-start problem that plagues every location-based social product. Expansion is city-by-city rather than country-by-country.

## Vision

`here.` is not a better dating app. It is a thin real-time layer on top of the real world — a default way to signal openness to meeting whoever is already around you. The long-term bet is that presence-plus-intent, expressed cleanly and time-limited honestly, is a category that doesn't exist yet and that messaging-first products can never grow into.

## Existing similar solutions

### Hinge, Bumble, Tinder

The incumbent dating apps optimise for profile browsing and in-app conversation. They have no concept of same-place-same-time: two users a metre apart in a bar are treated identically to two users a mile apart at home. The friction from match to real-world meeting is measured in days and weeks, and the majority of matches never meet at all.

### Happn

Happn surfaces people you have physically crossed paths with during the day, but the interaction model is still chat-first — you match, you message, and the original crossing is already hours or days in the past by the time either party opens the app. It answers *who did I walk past* rather than *who is open to meeting me right now*.

### Bumble BFF / Meetup

Friendship and event-based apps solve a different problem: group attendance and long-lead planning. They are not designed for the specific moment where two strangers are in the same venue, both open to a conversation, and neither willing to make the first move without a signal from the other.

`here.` is the only product that combines live presence, mutual opt-in, and a deliberate absence of messaging to produce one specific outcome: a face-to-face introduction that happens in the next few minutes.

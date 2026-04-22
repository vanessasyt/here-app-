# here.

> **Meet in the moment.**

Dating and social apps today prioritise digital interaction over real-world connection. Conversations replace meetings. People hesitate to approach strangers in real life. Existing real-world overlaps — the same bar, the same concert, the same train carriage — go completely unnoticed. `here.` is built to fix that: a platform where the real-world introduction comes first, and messaging only unlocks after both people have agreed in person that they'd like to stay in touch.

The flow is deliberately inverted from every other social app: **proximity → mutual intent → in-person meeting → follow-up decision → optional chat**. Users go live when they're open to meeting, see who else is at the same place at the same time, express interest in someone specific, and — only if the other person also expresses interest — receive a green light to introduce themselves face-to-face. After the meeting, each person privately answers *"How did it go?"*. Chat unlocks only if both said they'd meet again. No cold DMs. No infinite scroll. No match-with-no-meeting ghost-town inbox.

## Code

The app is a single-page Next.js / React application (`page.tsx`) backed by **Supabase** for auth, profile storage, realtime subscriptions, photo storage, and a relational data model that tracks the entire lifecycle of a connection from interest through meeting to follow-up. All screens, design tokens, and state transitions are contained in one file to keep the product logic auditable end-to-end. Supabase credentials are supplied via environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

### Key mechanics

**Go live.** When a user taps *Go live*, the app requests GPS, writes `open_to_meet = true` and the user's `lat` / `lng` to their profile row, and starts two intervals: one polls Supabase every 15 seconds for other live users, the other advances a round-robin display offset every 30 seconds so no one is permanently pinned to the top slot. 

**Discovery with no ranking.** The Nearby screen filters other live users to a 500 m radius using the Haversine formula, then orders them by earliest check-in as a proxy for arrival time. There is deliberately no popularity score, no attractiveness signal, and no algorithmic ordering so every live user gets equal time in the top slot via the rotation offset. Interest tags, languages, and "Ask me about…" prompts are shown only as conversation starters, never as ranking inputs.

**Express interest.** Tapping a card inserts a row into `meet_requests` with `status = 'pending'`. A 30-minute uniqueness check prevents the same user from pinging the same person more than once in that window. A `submittingRef` guard blocks double-taps at the UI layer as a second line of defence. The sender is sent to a Pending screen that polls for a status change but never auto-navigates — the user chooses when to move on.

**Mutual confirmation and the green light.** Incoming requests surface in the recipient's Requests tab via Supabase realtime subscriptions, with a polling fallback every 30 seconds for network-flaky environments. The recipient can accept now, accept in 15 minutes, accept in 30 minutes, or decline. Delayed accepts prompt an optional free-text area hint (*"near the tube exit"*, *"by the bar"*) which is surfaced to the sender on the Match screen. Once accepted, both parties see a dark green-light screen with a countdown timer; the timer expires at the 15- or 30-minute mark.

**The Match screen and "Ask me about…" prompts.** When the green light opens, the Match screen shows the other person's avatar, interests, area hint, and three user-written prompts (e.g., *"my pottery hobby"*, *"the best spots in Hackney"*, *"why I left finance"*). These prompts are written during onboarding and editable in Profile — they give each person three natural openers that don't depend on the usual scripts. Pronouns set during onboarding (`he/him`, `she/her`, `they/them`) render on the match screen in the right grammatical form: *"She accepted. Go find her."*

**First impressions and private notes.** Tapping *Met them ✓* on the Match screen opens a private notes modal — a personal, local-only jotting space for the user's impression of the other person. Notes are stored in `localStorage` keyed by `(currentUser, otherUser)` and surfaced as a subtle italic preview on the Messages list. The other person can never see these notes. They exist purely to help the user remember who someone was in a busy night out.

**The follow-up decision.** After a meeting has been marked, the person is added to a *Pending* section in the Requests tab. Within three hours, the user is prompted to answer *"How did it go with [name]?"* with four options: **would meet again**, **it was nice but no**, **we already exchanged numbers**, or **didn't end up meeting**. Only the first option writes to the `meet_again` table. Chat unlocks only when the row count for a given `request_id` reaches two — in other words, both parties independently said yes. If either said no, nothing happens and the other person never finds out. This is the central inversion: no one is notified of rejection, and the messaging layer itself is gated behind two separate in-person yeses.

**Messaging.** Once a chat is unlocked it appears in the Messages tab. Messages are written to a `messages` table and streamed via Supabase realtime with optimistic local echoes. Per-thread read state is tracked in `localStorage` so the unread badge and green-dot indicators reflect what the user has actually seen. The chat screen also exposes a *Notes* button that opens the same private notes modal as the Match screen, so users can add context as they get to know someone.

**Safety.** Every Match screen has a Report button that writes to a `reports` table, inserts a bidirectional row into `blocked_users`, and removes the associated request. The block list is evaluated on every Nearby fetch so blocked users never resurface in either direction. An auto-off timer (30 min / 1 hour / 2 hours / never) in the Profile screen force-disables discoverability after a period of inactivity so users aren't accidentally broadcasting their location. Requests expire after 30 minutes to prevent the inbox from accumulating dead history.

### Data model

Six Supabase tables do all of the work:

- `profiles` — identity, interests, languages, pronouns, ask-me prompts, photo URL, current `lat` / `lng`, `open_to_meet` flag, and `checked_in_event_id` for event-scoped discovery.
- `meet_requests` — `from_id`, `to_id`, `status` (`pending | accepted | declined`), optional sender `hint` and recipient `recipient_hint`, `response_timing`, `created_at`.
- `meet_again` — one row per user per request. Chat unlocks only when a given `request_id` has two rows (a mutual yes).
- `messages` — `request_id`, `sender_id`, `content`, `created_at`. Streamed via realtime channels scoped per chat.
- `blocked_users` — bidirectional block rows excluded from every profile query.
- `reports` — append-only log of safety reports for review.

### Realtime architecture

Four realtime channels are opened per logged-in user: one for incoming meet requests, one for the messages badge, one for `meet_again` inserts (chat unlocks), and one for status updates on sent requests (the green-light banner). Polling intervals run as a fallback in case a channel drops, and the Page Visibility API triggers a full re-fetch the instant the user returns to the app from a backgrounded tab or locked phone — critical on mobile where background JavaScript is suspended aggressively.

## Product

The core loop across six tabs: **Events** (what's on near me), **Nearby** (who else is here and open to meet), **Requests** (incoming interest, pending follow-up answers, and the green-light banner when someone accepts), **Match** (the face-to-face green light with ask-me prompts and a countdown), **Messages** (unlocked chats, sorted by unread-first), and **Profile** (photo, interests, languages, pronouns, ask-me prompts, visibility controls). Onboarding is a five-step flow: photo, interests (up to three), languages, three "ask me about…" prompts plus pronouns, and a live preview of the card others will see.

## Go-to-market

`here.` is designed to launch in high-density, synchronised-usage environments where the same-place-same-time assumption holds for hundreds of people at once: student bars, university campuses, festivals, concert venues, and sponsored events. The Events tab is the wedge — a partner venue's QR code checks users in to a specific event, and the Nearby tab automatically filters to only other attendees of that same event. This creates instant density inside a closed context and removes the cold-start problem that plagues every location-based social product. Expansion is city-by-city rather than country-by-country.

## Vision

`here.` is not a better dating app. It is a thin real-time layer on top of the real world — a default way to signal openness to meeting whoever is already around you, with messaging reserved strictly for people you've already met and mutually chosen to stay in touch with. The long-term bet is that presence-plus-intent, resolved by in-person introductions before any digital conversation, is a category that doesn't exist yet and that messaging-first products can never grow into.

## Existing similar solutions

### Hinge, Bumble, Tinder

The incumbent dating apps optimise for profile browsing and in-app conversation. They have no concept of same-place-same-time: two users a metre apart in a bar are treated identically to two users a mile apart at home. The friction from match to real-world meeting is measured in days and weeks, and the majority of matches never meet at all.

### Happn

Happn surfaces people you have physically crossed paths with during the day, but the interaction model is still chat-first — you match, you message, and the original crossing is already hours or days in the past by the time either party opens the app. It answers *who did I walk past* rather than *who is open to meeting me right now*.

### Bumble BFF / Meetup

Friendship and event-based apps solve a different problem: group attendance and long-lead planning. They are not designed for the specific moment where two strangers are in the same venue, both open to a conversation, and neither willing to make the first move without a signal from the other.

`here.` is the only product that combines live presence, mutual opt-in, an in-person introduction gated by a timed green light, and a messaging layer that only unlocks after both parties have separately confirmed — in private — that they'd like to meet again.

export type Screen =
  | "splash" | "login" | "signup" | "onboarding"
  | "events" | "eventdetail" | "nearby" | "request"
  | "inbox"  | "incoming"    | "match" | "profile" | "pending"
  | "messages" | "chat" | "followup";

export type IncResponse = "accept" | "15min" | "30min";

export type NavTab = "events" | "nearby" | "inbox" | "messages" | "profile";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  occupation: string;
  interests: string[];
  languages: string[];
  photo_url: string | null;
  bg: string;
  open_to_meet: boolean;
  checked_in_event_id: number | null;
  checked_in_at: string | null;
  lat: number | null;
  lng: number | null;
  pronouns?: "he/him" | "she/her" | "they/them";
  ask_me_prompts?: string[];
}

export interface NearbyUser extends UserProfile {
  display_order: number;
  minutes_at_event: number;
}

export interface HereEvent {
  id: number; emoji: string; gradientFrom: string; gradientTo: string;
  category: string; name: string; venue: string; area: string;
  meta: string; members: number; time: string;
  sponsored?: boolean; buyTicket?: boolean;
  section: "tonight" | "week"; desc: string;
}

export interface InboxRequest {
  id: string; name: string; photo_url: string | null; bg: string;
  gender: "m" | "f"; meta: string; tags: string[];
  reqLabel: string; time: string; isNew: boolean;
  from_id?: string; hint?: string | null;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatThread {
  requestId: string;
  person: UserProfile;
  lastMessage: string;
  lastAt: string;
  unread: boolean;
  isNew: boolean;
  unlockedAt: string;
}

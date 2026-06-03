import type { HereEvent } from "./types";

export const C = {
  cream:   "#F6F1E9",
  surface: "#FFFFFF",
  ink:     "#1C1714",
  inkSoft: "#564B42",
  warmMid: "#938373",
  accent:     "#C25A33",
  accentDark: "#A84A28",
  accentSoft: "rgba(194,90,51,0.10)",
  green:     "#3F7355",
  greenSoft: "rgba(63,115,85,0.12)",
  border:       "rgba(28,23,20,0.08)",
  borderStrong: "rgba(28,23,20,0.16)",
  shadowCard: "0 1px 2px rgba(28,23,20,0.04), 0 10px 28px -12px rgba(28,23,20,0.16)",
  shadowPop:  "0 1px 2px rgba(28,23,20,0.05), 0 24px 48px -16px rgba(28,23,20,0.28)",
};

export const ROTATION_MS = 30_000;

// Non-sensitive profile columns safe to read for any user. Deliberately excludes
// email, lat, lng and location_updated_at — use this instead of select("*") so
// private data never reaches the client. Mirrors the column GRANT in
// supabase/migrations/20260603120200_restrict_profile_columns.sql.
export const PROFILE_FIELDS =
  "id,name,age,occupation,interests,languages,photo_url,bg,pronouns,ask_me_prompts,open_to_meet,checked_in_event_id,checked_in_at";

export const EVENTS: HereEvent[] = [
  { id:0,  emoji:"🎻", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"music",   name:"LSO: An Evening of Brahms",               venue:"Barbican Centre",          area:"Barbican",         meta:"Tonight 7:30pm · from £35",       members:34, time:"7:30pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"The LSO performs Brahms' Symphony No. 4 and Piano Concerto No. 1. One of London's finest concert series, a full house and an electric atmosphere." },
  { id:1,  emoji:"🍷", gradientFrom:"#1a2535", gradientTo:"#243045", category:"food",    name:"Terroirs Natural Wine Evening",            venue:"Terroirs Wine Bar",         area:"Strand",           meta:"Tonight · until 11pm · Free",     members:27, time:"Until 11pm", sponsored:false, buyTicket:false, section:"tonight", desc:"The best natural wine bar in London, an evening of exceptional low-intervention wines poured at the bar." },
  { id:2,  emoji:"🎨", gradientFrom:"#1e1a30", gradientTo:"#2d1e3a", category:"art",     name:"Tate Modern Late: After Hours",           venue:"Tate Modern",               area:"Bankside",         meta:"Tonight until 10pm · £12",        members:42, time:"Until 10pm", sponsored:false, buyTicket:true,  section:"tonight", desc:"After-hours access to the Tate galleries with a live DJ set and the riverside bar open late." },
  { id:3,  emoji:"🎷", gradientFrom:"#182a1e", gradientTo:"#223828", category:"music",   name:"Jazz at Ronnie Scott's",                   venue:"Ronnie Scott's",            area:"Soho",             meta:"Tonight 9:30pm · from £30",       members:38, time:"9:30pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"The world-famous jazz club. Tonight's late set features some of London's finest musicians , standing room only." },
  { id:4,  emoji:"💃", gradientFrom:"#2a1035", gradientTo:"#4a1060", category:"dance",   name:"Bachata Social Night",                     venue:"Café Salsa",                area:"Covent Garden",    meta:"Tonight 9pm–2am · £10",           members:31, time:"9pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"London's most popular bachata social. All levels welcome so the dance floor does the introducing." },
  { id:5,  emoji:"😂", gradientFrom:"#2a1a10", gradientTo:"#3a2810", category:"comedy",  name:"Comedy Store: Late Show",                 venue:"The Comedy Store",          area:"Leicester Square", meta:"Tonight 9:45pm · from £16",       members:29, time:"9:45pm",     sponsored:true,  buyTicket:true,  section:"tonight", desc:"London's most iconic comedy club. Tonight's late show brings the UK's best stand-up talent to one stage." },
  { id:6,  emoji:"🍜", gradientFrom:"#2a1208", gradientTo:"#3a2010", category:"food",    name:"Maltby Street Market: Evening Edition",   venue:"Maltby Street",             area:"Bermondsey",       meta:"Tonight 5pm–10pm · Free",         members:37, time:"5pm–10pm",   sponsored:false, buyTicket:false, section:"tonight", desc:"Over 30 of London's best street food traders in the arches under London Bridge , an evening edition." },
  { id:7,  emoji:"🎬", gradientFrom:"#10101a", gradientTo:"#1a1a2a", category:"film",    name:"Rooftop Cinema Club: Brief Encounter",    venue:"Roof East",                 area:"Stratford",        meta:"Tonight 8pm · £19",               members:33, time:"8pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"Classic British romance under the stars on Roof East's open-air screen. Blankets provided." },
  { id:8,  emoji:"🏃", gradientFrom:"#1a2a1a", gradientTo:"#243824", category:"fitness", name:"Run Dem Crew: Thursday Run",              venue:"Regent's Park",             area:"Regent's Park",    meta:"Tonight 6:30pm · Free",           members:22, time:"6:30pm",     sponsored:false, buyTicket:false, section:"tonight", desc:"London's most sociable running crew. 5k through Regent's Park, all paces welcome, drinks after at the pub." },
  { id:9,  emoji:"🥊", gradientFrom:"#2a1010", gradientTo:"#3a1818", category:"fitness", name:"BXR London: Boxing Evening Class",        venue:"BXR London",                area:"Marylebone",       meta:"Tonight 7pm · £25",               members:18, time:"7pm",        sponsored:false, buyTicket:true,  section:"tonight", desc:"London's best boxing gym runs an open evening class. Gloves provided. All fitness levels , come prepared to work." },
  { id:10, emoji:"🎵", gradientFrom:"#1a1028", gradientTo:"#2a1838", category:"music",   name:"Electric Brixton: Club Night",            venue:"Electric Brixton",          area:"Brixton",          meta:"Tonight 10pm · £15",              members:51, time:"10pm",       sponsored:true,  buyTicket:true,  section:"tonight", desc:"One of London's best live music venues. Tonight's resident DJs play disco, house, and soul until 4am." },
  { id:11, emoji:"🎭", gradientFrom:"#1e1a30", gradientTo:"#3d2060", category:"art",     name:"ENO: La Traviata Opening Night",          venue:"London Coliseum",           area:"West End",         meta:"Friday 8pm · from £25",           members:25, time:"Fri 8pm",    sponsored:true,  buyTicket:true,  section:"week",    desc:"English National Opera's acclaimed new production of Verdi's La Traviata. Opening night." },
  { id:12, emoji:"🖼️", gradientFrom:"#1a2535", gradientTo:"#243045", category:"art",     name:"National Portrait Gallery Members Evening",venue:"NPG",                       area:"St Martin's Place",meta:"Thursday 6:30pm · Members free",  members:29, time:"Thu 6:30pm", sponsored:false, buyTicket:false, section:"week",    desc:"Exclusive after-hours access to the galleries with wine and live music." },
  { id:13, emoji:"🌿", gradientFrom:"#182a1e", gradientTo:"#223828", category:"food",    name:"Borough Market: After Dark",              venue:"Borough Market",            area:"Borough",          meta:"Saturday 6pm · Free",             members:46, time:"Sat 6pm",    sponsored:false, buyTicket:false, section:"week",    desc:"London's most celebrated food market stays open late with evening-only traders and street food." },
  { id:14, emoji:"🎸", gradientFrom:"#1a1020", gradientTo:"#281830", category:"music",   name:"Moth Club: Indie Night",                  venue:"Moth Club",                 area:"Hackney",          meta:"Friday 9pm · £12",                members:28, time:"Fri 9pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"Hackney's best-kept secret. Indie and alternative DJ sets in the most characterful venue in East London." },
  { id:15, emoji:"🧗", gradientFrom:"#1a1010", gradientTo:"#282010", category:"fitness", name:"Castle Climbing: Evening Session",        venue:"Castle Climbing Centre",    area:"Stoke Newington",  meta:"Thursday 6pm · £18",              members:17, time:"Thu 6pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"One of London's most celebrated climbing walls. Evening sessions are open to all abilities , shoes for hire." },
  { id:16, emoji:"🍳", gradientFrom:"#2a1808", gradientTo:"#3a2010", category:"food",    name:"Ottolenghi: Saturday Masterclass",        venue:"Ottolenghi NOPI",           area:"Soho",             meta:"Saturday 11am · £95",             members:12, time:"Sat 11am",   sponsored:true,  buyTicket:true,  section:"week",    desc:"A hands-on morning with Ottolenghi's chefs. Learn four signature dishes, then sit down together to eat them." },
  { id:17, emoji:"🎤", gradientFrom:"#1a0a28", gradientTo:"#2a1038", category:"comedy",  name:"Soho Theatre: Stand-Up Night",            venue:"Soho Theatre",              area:"Soho",             meta:"Wednesday 8pm · £15",             members:21, time:"Wed 8pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"The most respected comedy venue in London. Tonight's bill features three rising stand-ups at the top of their game." },
  { id:18, emoji:"🚣", gradientFrom:"#0a1a2a", gradientTo:"#102030", category:"fitness", name:"Paddleboarding on the Thames",             venue:"Thames Paddle Co.",         area:"Richmond",         meta:"Sunday 10am · £35",               members:16, time:"Sun 10am",   sponsored:false, buyTicket:true,  section:"week",    desc:"Guided paddleboard session on the Thames at Richmond. Equipment and full instruction included. Beginners welcome." },
  { id:19, emoji:"🌅", gradientFrom:"#1a1410", gradientTo:"#2a2018", category:"food",    name:"Skylight Rooftop Bar: Sunset Session",    venue:"Skylight Tobacco Dock",     area:"Wapping",          meta:"Saturday 5pm · Free entry",       members:39, time:"Sat 5pm",    sponsored:false, buyTicket:false, section:"week",    desc:"London's most loved rooftop bar and games space. Cocktails, croquet, and a view of the city at golden hour." },
  { id:20, emoji:"🏊", gradientFrom:"#0a1a28", gradientTo:"#101e30", category:"fitness", name:"London Fields Lido: Social Swim",         venue:"London Fields Lido",        area:"Hackney",          meta:"Sunday 8am · £5",                 members:23, time:"Sun 8am",    sponsored:false, buyTicket:true,  section:"week",    desc:"The heated outdoor lido at London Fields. Sunday morning swims followed by coffee and pastries at the poolside café." },
  { id:21, emoji:"📖", gradientFrom:"#1a1818", gradientTo:"#282020", category:"art",     name:"Waterstones: Author Reading & Q&A",       venue:"Waterstones Piccadilly",    area:"Piccadilly",       meta:"Tuesday 7pm · £10",               members:14, time:"Tue 7pm",    sponsored:false, buyTicket:true,  section:"week",    desc:"The world's largest bookshop hosts an evening reading and Q&A with one of this year's most talked-about authors." },
  { id:22, emoji:"🎻", gradientFrom:"#1e1a30", gradientTo:"#2e1a40", category:"music",   name:"Wigmore Hall: Piano Recital",             venue:"Wigmore Hall",              area:"Marylebone",       meta:"Thursday 7:30pm · from £18",      members:19, time:"Thu 7:30pm", sponsored:false, buyTicket:true,  section:"week",    desc:"The finest chamber music venue in the world. This Thursday's recital features a rising pianist performing Schubert." },
  { id:23, emoji:"🏃", gradientFrom:"#182a18", gradientTo:"#223820", category:"fitness", name:"Parkrun, Victoria Park",                  venue:"Victoria Park",             area:"Hackney",          meta:"Saturday 9am · Free",             members:31, time:"Sat 9am",    sponsored:false, buyTicket:false, section:"week",    desc:"The world's largest free weekly run. 5k around Victoria Park, all paces welcome, no registration needed on the day." },
];

export const INTERESTS: { id: string; emoji: string; label: string }[] = [
  { id:"art",           emoji:"", label:"Art"           },
  { id:"comedy",        emoji:"", label:"Comedy"        },
  { id:"cooking",       emoji:"", label:"Cooking"       },
  { id:"fashion",       emoji:"", label:"Fashion"       },
  { id:"film",          emoji:"", label:"Film"          },
  { id:"fitness",       emoji:"", label:"Fitness"       },
  { id:"food",          emoji:"", label:"Food"          },
  { id:"gaming",        emoji:"", label:"Gaming"        },
  { id:"hiking",        emoji:"", label:"Hiking"        },
  { id:"museums",       emoji:"", label:"Museums"       },
  { id:"music",         emoji:"", label:"Music"         },
  { id:"photography",   emoji:"", label:"Photography"   },
  { id:"podcasts",      emoji:"", label:"Podcasts"      },
  { id:"racket_sports", emoji:"", label:"Racket Sports" },
  { id:"reading",       emoji:"", label:"Reading"       },
  { id:"team_sports",   emoji:"", label:"Team Sports"   },
  { id:"tech",          emoji:"", label:"Tech"          },
  { id:"theatre",       emoji:"", label:"Theatre"       },
  { id:"travel",        emoji:"", label:"Travel"        },
  { id:"wine",          emoji:"", label:"Wine"          },
];

export const MAX_INTERESTS = 3;

export const LANGUAGES = [
  "Arabic","Bengali","Cantonese","Czech","Danish","Dutch","English","Finnish",
  "French","German","Greek","Hebrew","Hindi","Hungarian","Italian","Japanese",
  "Korean","Malay","Mandarin","Norwegian","Persian","Polish","Portuguese",
  "Romanian","Russian","Spanish","Swahili","Swedish","Thai","Turkish","Urdu","Vietnamese",
];

export const BG_OPTIONS = [
  "linear-gradient(160deg,#d4a5a5,#c47a6b)",
  "linear-gradient(160deg,#a5c4d4,#6b8fc4)",
  "linear-gradient(160deg,#a5d4b5,#6ba87c)",
  "linear-gradient(160deg,#d4c4a5,#c4a06b)",
  "linear-gradient(160deg,#c4a5d4,#8f6bc4)",
  "linear-gradient(160deg,#d4d4a5,#c4c46b)",
];

import type { AttendeeQuestion, CategoryId, CoverPattern, EventFormat, EventLifecycle, RefundPolicy, Speaker, TicketKind } from "../../types/marketplace";

// Mock data — replace with your own queries.
//
// Dates are written relative to "today" in Addis Ababa (`day: 0`), so the catalog always has upcoming, ongoing and
// past events whenever the demo runs. `lib/marketplace/catalog.ts` turns these seeds into real ISO dates.

/** A moment relative to today: whole days from today plus a local Addis Ababa time. */
export interface RelTime {
  day: number;
  time: string;
}

export interface TicketSeed {
  id: string;
  name: string;
  kind: TicketKind;
  description: string;
  price: number;
  quantityTotal: number;
  quantitySold: number;
  maxPerOrder?: number;
  /** Default: 45 days before today. */
  salesStart?: RelTime;
  /** Default: when the event starts. */
  salesEnd?: RelTime;
  perks?: string[];
}

export interface AgendaSeedItem {
  start: string;
  end: string;
  title: string;
  description?: string;
  location?: string;
  speakerIds?: string[];
}

export interface AgendaSeedDay {
  /** Days after the event's first day (0 = first day). */
  offset: number;
  label: string;
  items: AgendaSeedItem[];
}

export interface EventSeed {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string[];
  categoryId: CategoryId;
  organizerId: string;
  format: EventFormat;
  venueId?: string;
  onlinePlatform?: string;
  start: RelTime;
  end: RelTime;
  lifecycle: EventLifecycle;
  originalStart?: RelTime;
  lifecycleNote?: string;
  updates?: { day: number; time: string; summary: string }[];
  tickets: TicketSeed[];
  speakers?: Speaker[];
  agenda?: AgendaSeedDay[];
  attendeeQuestions?: AttendeeQuestion[];
  refundPolicy: RefundPolicy;
  tags: string[];
  featured?: boolean;
  trendingScore: number;
  publishedDay: number;
  ageRestriction?: string;
  language?: string;
  coverPattern: CoverPattern;
}

const FLEXIBLE: RefundPolicy = {
  summary: "Full refund up to 7 days before the event.",
  details: [
    "Request a refund from My Tickets up to 7 days before the event starts.",
    "Refunds go back to the original payment method within 5 business days.",
    "Service fees are refunded with the ticket price.",
    "If the organizer cancels, you get a full refund automatically.",
  ],
};

const MODERATE: RefundPolicy = {
  summary: "Refunds up to 48 hours before the event, minus service fees.",
  details: [
    "Request a refund up to 48 hours before the event starts.",
    "The ticket price is refunded; service fees are not.",
    "Within 48 hours you can still transfer your ticket to someone else.",
    "If the organizer cancels or reschedules, you can get a full refund.",
  ],
};

const STRICT: RefundPolicy = {
  summary: "No refunds. Tickets can be transferred to another person.",
  details: [
    "Tickets are non-refundable once the order is complete.",
    "You can transfer a ticket to another attendee from My Tickets until doors open.",
    "If the organizer cancels, you get a full refund automatically.",
  ],
};

const FREE_POLICY: RefundPolicy = {
  summary: "Free registration. Cancel any time so someone else can take your spot.",
  details: [
    "Free registrations can be cancelled from My Tickets at any time.",
    "Seats are limited; please cancel if you can no longer attend.",
  ],
};

const COMPANY: AttendeeQuestion = { id: "company", label: "Company or organization", required: true, type: "text" };
const JOB_TITLE: AttendeeQuestion = { id: "jobTitle", label: "Job title", required: false, type: "text" };

export const EVENT_SEEDS: EventSeed[] = [
  {
    id: "evt-001",
    slug: "ethio-jazz-revival-night",
    title: "Ethio-Jazz Revival Night",
    summary: "A night of classic Ethio-jazz reimagined by a ten-piece ensemble, with a late DJ set.",
    description: [
      "Mahlet & the Revival Ensemble return to Sheger Arts Centre with a full programme of golden-era Ethio-jazz, rearranged for horns, krar and modern rhythm section.",
      "Expect the standards you know alongside new compositions written for this tour. The Kebero Collective opens, and DJ Sami keeps the room moving until close.",
      "Seating is unreserved on the main floor. VIP tickets include balcony seating, a welcome drink and fast-lane entry.",
    ],
    categoryId: "music",
    organizerId: "org-sheger-live",
    format: "in-person",
    venueId: "ven-sheger-arts",
    start: { day: 4, time: "19:30" },
    end: { day: 4, time: "23:30" },
    lifecycle: "published",
    tickets: [
      { id: "early", name: "Early bird", kind: "early-bird", description: "Main floor, limited release", price: 600, quantityTotal: 120, quantitySold: 120, salesEnd: { day: -3, time: "23:59" }, perks: ["Main floor access"] },
      { id: "ga", name: "General admission", kind: "general", description: "Main floor, unreserved", price: 900, quantityTotal: 400, quantitySold: 312, perks: ["Main floor access"] },
      { id: "vip", name: "VIP", kind: "vip", description: "Balcony seat, welcome drink, fast-lane entry", price: 2500, quantityTotal: 60, quantitySold: 49, maxPerOrder: 4, perks: ["Balcony seating", "Welcome drink", "Fast-lane entry"] },
    ],
    speakers: [
      { id: "sp-mahlet", name: "Mahlet Haile", initials: "MH", role: "Vocals and band leader", organization: "Mahlet & the Revival Ensemble", billing: "Headliner" },
      { id: "sp-kebero", name: "Kebero Collective", initials: "KC", role: "Percussion ensemble", organization: "Addis Ababa", billing: "Opening act" },
      { id: "sp-sami", name: "DJ Sami", initials: "DS", role: "Ethio-funk and soul selector", organization: "Sheger Live", billing: "Late set" },
    ],
    agenda: [
      {
        offset: 0,
        label: "Concert night",
        items: [
          { start: "19:30", end: "20:15", title: "Doors open and welcome drinks" },
          { start: "20:15", end: "21:00", title: "Kebero Collective", speakerIds: ["sp-kebero"] },
          { start: "21:15", end: "22:45", title: "Mahlet & the Revival Ensemble", speakerIds: ["sp-mahlet"] },
          { start: "22:45", end: "23:30", title: "DJ Sami late set", speakerIds: ["sp-sami"] },
        ],
      },
    ],
    refundPolicy: MODERATE,
    tags: ["jazz", "live band", "ethio-jazz", "nightlife"],
    featured: true,
    trendingScore: 98,
    publishedDay: -40,
    ageRestriction: "18+",
    language: "Amharic and English",
    coverPattern: "rings",
  },
  {
    id: "evt-002",
    slug: "horn-tech-summit",
    title: "Horn Tech Summit",
    summary: "Two days of talks, workshops and demos from the people building East Africa's digital economy.",
    description: [
      "The Horn Tech Summit brings 1,400 engineers, founders, designers and investors to Bole Convention Centre for two days of practical talks and hands-on sessions.",
      "Day one covers payments, data and infrastructure. Day two focuses on product, design and fundraising, with a startup demo floor running all day.",
      "Every pass includes lunch, coffee and access to recorded sessions after the event. VIP passes add the speakers' dinner and reserved front-row seating.",
    ],
    categoryId: "tech",
    organizerId: "org-horn-tech",
    format: "in-person",
    venueId: "ven-bole-convention",
    start: { day: 18, time: "08:30" },
    end: { day: 19, time: "17:30" },
    lifecycle: "published",
    tickets: [
      { id: "early", name: "Early bird pass", kind: "early-bird", description: "Both days, limited release", price: 1200, quantityTotal: 300, quantitySold: 300, salesEnd: { day: -7, time: "23:59" }, perks: ["Both days", "Lunch and coffee"] },
      { id: "standard", name: "Standard pass", kind: "general", description: "Both days, all talks and workshops", price: 1800, quantityTotal: 1400, quantitySold: 864, perks: ["Both days", "Lunch and coffee", "Session recordings"] },
      { id: "vip", name: "VIP pass", kind: "vip", description: "Front-row seating and the speakers' dinner", price: 5500, quantityTotal: 80, quantitySold: 41, maxPerOrder: 2, perks: ["Reserved front row", "Speakers' dinner", "Session recordings"] },
      { id: "student", name: "Student pass", kind: "student", description: "Both days. Bring a valid student ID", price: 600, quantityTotal: 200, quantitySold: 193, maxPerOrder: 1, perks: ["Both days", "Lunch and coffee"] },
    ],
    speakers: [
      { id: "sp-selam", name: "Selamawit Bekele", initials: "SB", role: "Chief technology officer", organization: "Abay Pay", billing: "Keynote" },
      { id: "sp-dawit", name: "Dawit Tesfaye", initials: "DT", role: "Founder", organization: "Lalibela Labs", billing: "Speaker" },
      { id: "sp-hiwot", name: "Hiwot Alemu", initials: "HA", role: "Head of data", organization: "Sheba Telecom", billing: "Speaker" },
      { id: "sp-yonas", name: "Yonas Gebremedhin", initials: "YG", role: "Partner", organization: "Blue Nile Ventures", billing: "Panel host" },
      { id: "sp-meron", name: "Meron Tadesse", initials: "MT", role: "Design lead", organization: "Tana Studio", billing: "Workshop lead" },
      { id: "sp-samuel", name: "Samuel Haile", initials: "SH", role: "Professor of computing", organization: "Addis Tech Institute", billing: "Speaker" },
    ],
    agenda: [
      {
        offset: 0,
        label: "Day 1 · Infrastructure",
        items: [
          { start: "08:30", end: "09:30", title: "Registration and coffee", location: "Main foyer" },
          { start: "09:30", end: "10:15", title: "Keynote: Payments for the next 50 million users", location: "Main hall", speakerIds: ["sp-selam"] },
          { start: "10:30", end: "11:15", title: "Building data platforms on a startup budget", location: "Main hall", speakerIds: ["sp-hiwot"] },
          { start: "11:30", end: "12:30", title: "Panel: What investors look for in 2027", location: "Main hall", speakerIds: ["sp-yonas", "sp-dawit"] },
          { start: "12:30", end: "13:30", title: "Lunch", location: "Garden terrace" },
          { start: "13:30", end: "15:00", title: "Workshop: Offline-first mobile apps", location: "Room B", speakerIds: ["sp-samuel"] },
          { start: "15:30", end: "17:30", title: "Startup demo floor", location: "Exhibition hall" },
        ],
      },
      {
        offset: 1,
        label: "Day 2 · Product",
        items: [
          { start: "09:00", end: "09:45", title: "From prototype to product in twelve weeks", location: "Main hall", speakerIds: ["sp-dawit"] },
          { start: "10:00", end: "11:30", title: "Workshop: Designing for low-bandwidth users", location: "Room B", speakerIds: ["sp-meron"] },
          { start: "11:45", end: "12:30", title: "Teaching engineers who will build the next decade", location: "Main hall", speakerIds: ["sp-samuel"] },
          { start: "12:30", end: "13:30", title: "Lunch", location: "Garden terrace" },
          { start: "13:30", end: "15:30", title: "Founder office hours", location: "Meeting rooms", speakerIds: ["sp-yonas"] },
          { start: "16:00", end: "17:30", title: "Closing keynote and awards", location: "Main hall", speakerIds: ["sp-selam"] },
        ],
      },
    ],
    attendeeQuestions: [COMPANY, JOB_TITLE, { id: "track", label: "Track you're most interested in", required: true, type: "select", options: ["Payments and fintech", "Data and AI", "Product and design", "Fundraising"] }],
    refundPolicy: FLEXIBLE,
    tags: ["conference", "startups", "engineering", "fintech"],
    featured: true,
    trendingScore: 92,
    publishedDay: -60,
    language: "English",
    coverPattern: "grid",
  },
  {
    id: "evt-003",
    slug: "addis-coffee-culture-festival",
    title: "Addis Coffee & Culture Festival",
    summary: "Three days of coffee ceremonies, roaster stalls, live music and food from every region.",
    description: [
      "Forty roasters and growers from Sidama, Yirgacheffe, Guji and Harar bring their best lots to Entoto Park for three days of tastings and traditional ceremonies.",
      "Between cuppings, catch live music on the hillside stage, regional food stalls and a craft market. Children under 12 enter free with an adult.",
    ],
    categoryId: "food",
    organizerId: "org-taste-ethiopia",
    format: "in-person",
    venueId: "ven-entoto-amphi",
    start: { day: -1, time: "10:00" },
    end: { day: 1, time: "20:00" },
    lifecycle: "published",
    tickets: [
      { id: "day", name: "Day pass", kind: "general", description: "One day of your choice", price: 300, quantityTotal: 3000, quantitySold: 1840, salesEnd: { day: 1, time: "16:00" }, perks: ["Festival entry", "Three tasting tokens"] },
      { id: "pass", name: "Festival pass", kind: "pass", description: "All three days", price: 700, quantityTotal: 800, quantitySold: 800, salesEnd: { day: -1, time: "10:00" }, perks: ["All three days", "Ten tasting tokens", "Festival cup"] },
    ],
    speakers: [
      { id: "sp-tsion", name: "Tsion Ayele", initials: "TA", role: "Q-grader and roaster", organization: "Guji Highlands Coffee", billing: "Host" },
      { id: "sp-nahom", name: "Nahom Desta", initials: "ND", role: "Chef", organization: "Gursha Kitchen", billing: "Chef" },
    ],
    agenda: [
      { offset: 0, label: "Day 1", items: [{ start: "10:00", end: "12:00", title: "Opening coffee ceremony", speakerIds: ["sp-tsion"] }, { start: "14:00", end: "16:00", title: "Regional cupping session" }, { start: "17:00", end: "20:00", title: "Hillside stage: acoustic sets" }] },
      { offset: 1, label: "Day 2", items: [{ start: "11:00", end: "13:00", title: "Cooking with coffee", speakerIds: ["sp-nahom"] }, { start: "15:00", end: "17:00", title: "Roasters' panel" }, { start: "17:30", end: "20:00", title: "Hillside stage: Ethio-pop night" }] },
      { offset: 2, label: "Day 3", items: [{ start: "10:00", end: "12:00", title: "Family morning and kids' corner" }, { start: "13:00", end: "16:00", title: "Barista championship final", speakerIds: ["sp-tsion"] }, { start: "17:00", end: "20:00", title: "Closing ceremony" }] },
    ],
    refundPolicy: STRICT,
    tags: ["coffee", "festival", "family friendly", "market"],
    featured: true,
    trendingScore: 95,
    publishedDay: -50,
    language: "Amharic and English",
    coverPattern: "dots",
  },
  {
    id: "evt-004",
    slug: "entoto-trail-run",
    title: "Entoto Trail Run",
    summary: "10K and 5K trail races through the eucalyptus forest, plus a free kids' run.",
    description: [
      "Run the ridge above the city on marked forest trails at 3,000 metres. The 10K is chip-timed with age-group prizes; the 5K is a relaxed fun run open to walkers.",
      "Every registration includes a race shirt, finisher medal, water stations and a post-race breakfast. The kids' 1K is free for under-12s.",
    ],
    categoryId: "sports",
    organizerId: "org-run-addis",
    format: "in-person",
    venueId: "ven-entoto-amphi",
    start: { day: 12, time: "06:30" },
    end: { day: 12, time: "11:00" },
    lifecycle: "published",
    tickets: [
      { id: "10k", name: "10K race", kind: "general", description: "Chip-timed, age-group prizes", price: 450, quantityTotal: 800, quantitySold: 612, perks: ["Race shirt", "Finisher medal", "Breakfast"] },
      { id: "5k", name: "5K fun run", kind: "general", description: "Untimed, walkers welcome", price: 250, quantityTotal: 500, quantitySold: 301, perks: ["Race shirt", "Breakfast"] },
      { id: "kids", name: "Kids' 1K", kind: "free", description: "Under 12, with a registered adult", price: 0, quantityTotal: 150, quantitySold: 88, maxPerOrder: 3, perks: ["Medal"] },
    ],
    agenda: [
      {
        offset: 0,
        label: "Race day",
        items: [
          { start: "06:30", end: "07:15", title: "Bib collection and warm-up" },
          { start: "07:30", end: "09:00", title: "10K start" },
          { start: "07:45", end: "09:00", title: "5K start" },
          { start: "09:15", end: "09:45", title: "Kids' 1K" },
          { start: "10:00", end: "11:00", title: "Awards and breakfast" },
        ],
      },
    ],
    attendeeQuestions: [{ id: "shirt", label: "T-shirt size", required: true, type: "select", options: ["XS", "S", "M", "L", "XL"] }],
    refundPolicy: MODERATE,
    tags: ["running", "outdoors", "fitness"],
    trendingScore: 70,
    publishedDay: -35,
    coverPattern: "waves",
    language: "Amharic and English",
  },
  {
    id: "evt-005",
    slug: "startup-pitch-night-finale",
    title: "Startup Pitch Night: Season Finale",
    summary: "Ten finalists, five judges and one winner of a 1,000,000 ETB grant.",
    description: [
      "The season's ten best early-stage startups pitch live to a panel of investors and operators. The audience vote decides the people's choice award.",
      "Doors open at 18:00 for networking. Registration is free, but seats are limited to the room's capacity.",
    ],
    categoryId: "business",
    organizerId: "org-addis-forum",
    format: "in-person",
    venueId: "ven-merkato-hub",
    start: { day: 6, time: "18:00" },
    end: { day: 6, time: "21:30" },
    lifecycle: "published",
    tickets: [{ id: "free", name: "Free registration", kind: "free", description: "General seating", price: 0, quantityTotal: 400, quantitySold: 400, maxPerOrder: 2, perks: ["Audience vote"] }],
    refundPolicy: FREE_POLICY,
    tags: ["startups", "pitching", "networking"],
    trendingScore: 80,
    publishedDay: -20,
    coverPattern: "burst",
    language: "English",
  },
  {
    id: "evt-006",
    slug: "contemporary-ethiopian-art-showcase",
    title: "Contemporary Ethiopian Art Showcase",
    summary: "Opening night of a group show by twelve emerging painters and sculptors.",
    description: [
      "Twelve artists from Addis Ababa, Bahir Dar and Mekelle show new work in painting, sculpture and mixed media. The artists are in the room all evening.",
      "Entry is free. A limited guided tour with the curator runs at 17:30 and includes a printed catalogue.",
    ],
    categoryId: "arts",
    organizerId: "org-abyssinia-arts",
    format: "in-person",
    venueId: "ven-sheger-arts",
    start: { day: 9, time: "17:00" },
    end: { day: 9, time: "21:00" },
    lifecycle: "published",
    tickets: [
      { id: "free", name: "Free entry", kind: "free", description: "Walk-in, any time during opening hours", price: 0, quantityTotal: 500, quantitySold: 214, maxPerOrder: 4, perks: ["Gallery access"] },
      { id: "tour", name: "Curator's tour", kind: "general", description: "17:30 guided tour and printed catalogue", price: 250, quantityTotal: 40, quantitySold: 36, maxPerOrder: 2, perks: ["Guided tour", "Printed catalogue"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["art", "exhibition", "free"],
    trendingScore: 60,
    publishedDay: -18,
    coverPattern: "arcs",
    language: "Amharic and English",
  },
  {
    id: "evt-007",
    slug: "lake-tana-sunset-sessions",
    title: "Lake Tana Sunset Sessions",
    summary: "An open-air evening of acoustic sets and DJs on the shore of Lake Tana.",
    description: [
      "Watch the sun go down over Lake Tana with acoustic sets from three regional artists, followed by DJs until late.",
      "Food and drink are sold on site. VIP tickets include a lakeside lounge with table service.",
    ],
    categoryId: "music",
    organizerId: "org-sheger-live",
    format: "in-person",
    venueId: "ven-lakeside-bahirdar",
    start: { day: 15, time: "17:30" },
    end: { day: 15, time: "23:00" },
    lifecycle: "published",
    tickets: [
      { id: "ga", name: "General admission", kind: "general", description: "Lawn access", price: 500, quantityTotal: 700, quantitySold: 262, perks: ["Lawn access"] },
      { id: "vip", name: "VIP lounge", kind: "vip", description: "Lakeside lounge with table service", price: 1500, quantityTotal: 100, quantitySold: 71, maxPerOrder: 4, perks: ["Lakeside lounge", "Table service"] },
    ],
    refundPolicy: MODERATE,
    tags: ["open air", "acoustic", "sunset"],
    trendingScore: 75,
    publishedDay: -25,
    coverPattern: "waves",
    language: "Amharic",
  },
  {
    id: "evt-008",
    slug: "women-in-fintech-breakfast",
    title: "Women in Fintech Breakfast",
    summary: "A morning of candid conversation with women leading Ethiopia's financial technology sector.",
    description: [
      "Three leaders from banking, mobile money and regulation share how they built their careers, followed by small-table discussions over breakfast.",
      "Seats are limited to keep the conversation personal.",
    ],
    categoryId: "business",
    organizerId: "org-addis-forum",
    format: "in-person",
    venueId: "ven-bole-convention",
    start: { day: 3, time: "08:00" },
    end: { day: 3, time: "11:00" },
    lifecycle: "published",
    tickets: [{ id: "seat", name: "Breakfast seat", kind: "general", description: "Breakfast and small-table session", price: 950, quantityTotal: 180, quantitySold: 180, maxPerOrder: 2, perks: ["Breakfast", "Table discussion"] }],
    attendeeQuestions: [COMPANY],
    refundPolicy: MODERATE,
    tags: ["fintech", "leadership", "networking"],
    trendingScore: 66,
    publishedDay: -30,
    coverPattern: "blocks",
    language: "English",
  },
  {
    id: "evt-009",
    slug: "product-design-meetup-online",
    title: "Product Design Meetup: Research on a Shoestring",
    summary: "An online session on running user research with no budget and very little time.",
    description: [
      "Two product designers walk through the research methods they use every week: hallway tests, diary studies over Telegram and five-minute surveys.",
      "The session is recorded. Registered attendees get the recording and the templates afterwards.",
    ],
    categoryId: "tech",
    organizerId: "org-horn-tech",
    format: "online",
    onlinePlatform: "Zoom",
    start: { day: 5, time: "18:30" },
    end: { day: 5, time: "20:00" },
    lifecycle: "published",
    tickets: [{ id: "free", name: "Free registration", kind: "free", description: "Join link sent after you register", price: 0, quantityTotal: 1000, quantitySold: 342, maxPerOrder: 1, perks: ["Live session", "Recording and templates"] }],
    speakers: [{ id: "sp-meron2", name: "Meron Tadesse", initials: "MT", role: "Design lead", organization: "Tana Studio", billing: "Speaker" }, { id: "sp-abel", name: "Abel Worku", initials: "AW", role: "Senior product designer", organization: "Abay Pay", billing: "Speaker" }],
    agenda: [{ offset: 0, label: "Online session", items: [{ start: "18:30", end: "19:15", title: "Research methods that fit in a week", speakerIds: ["sp-meron2", "sp-abel"] }, { start: "19:15", end: "20:00", title: "Live questions" }] }],
    refundPolicy: FREE_POLICY,
    tags: ["design", "online", "free", "ux"],
    trendingScore: 58,
    publishedDay: -14,
    coverPattern: "grid",
    language: "English",
  },
  {
    id: "evt-010",
    slug: "hawassa-lakefront-food-fair",
    title: "Hawassa Lakefront Food Fair",
    summary: "Two days of fresh fish, regional dishes and cooking demos by the lake.",
    description: [
      "Sixty food stalls line the Hawassa lakefront, from fried tilapia to Sidama kitfo. Local chefs run cooking demos on the main stage both afternoons.",
      "The tasting pass includes eight dishes from the chefs' stalls and a seat at one demo.",
    ],
    categoryId: "food",
    organizerId: "org-taste-ethiopia",
    format: "in-person",
    venueId: "ven-hawassa-lakefront",
    start: { day: 20, time: "11:00" },
    end: { day: 21, time: "19:00" },
    lifecycle: "published",
    tickets: [
      { id: "entry", name: "Entry", kind: "general", description: "Both days", price: 200, quantityTotal: 2000, quantitySold: 410, perks: ["Fair entry"] },
      { id: "tasting", name: "Tasting pass", kind: "vip", description: "Eight dishes and a demo seat", price: 650, quantityTotal: 300, quantitySold: 122, perks: ["Eight tasting dishes", "Demo seat"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["food", "festival", "family friendly"],
    trendingScore: 50,
    publishedDay: -22,
    coverPattern: "dots",
    language: "Amharic",
  },
  {
    id: "evt-011",
    slug: "fasil-heritage-night-walk",
    title: "Fasil Heritage Night Walk",
    summary: "A guided evening walk through Gondar's royal enclosure, with stories and live azmari music.",
    description: [
      "Walk the Fasil Ghebbi compound after dark with a local historian. Lanterns light the route; azmari musicians perform in the courtyard at the end.",
      "The dinner option adds a traditional meal in the courtyard after the walk.",
    ],
    categoryId: "arts",
    organizerId: "org-abyssinia-arts",
    format: "in-person",
    venueId: "ven-fasil-court",
    start: { day: 25, time: "18:30" },
    end: { day: 25, time: "21:00" },
    lifecycle: "published",
    tickets: [
      { id: "walk", name: "Guided walk", kind: "general", description: "Two-hour guided walk", price: 600, quantityTotal: 120, quantitySold: 48, perks: ["Guided walk", "Courtyard music"] },
      { id: "dinner", name: "Walk and dinner", kind: "vip", description: "Walk plus a courtyard dinner", price: 1400, quantityTotal: 40, quantitySold: 20, maxPerOrder: 4, perks: ["Guided walk", "Courtyard dinner"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["heritage", "history", "walking tour"],
    trendingScore: 45,
    publishedDay: -16,
    coverPattern: "arcs",
    language: "Amharic and English",
  },
  {
    id: "evt-012",
    slug: "addis-street-football-cup",
    title: "Addis Street Football Cup",
    summary: "Sixteen neighbourhood teams, one afternoon of five-a-side football.",
    description: [
      "Sixteen teams from across the city compete in a knockout five-a-side tournament with live commentary and a DJ between matches.",
      "Team registration and spectator sales have closed. Spectators without a ticket can still watch from the free terrace while space allows.",
    ],
    categoryId: "sports",
    organizerId: "org-run-addis",
    format: "in-person",
    venueId: "ven-addis-arena",
    start: { day: 8, time: "14:00" },
    end: { day: 8, time: "19:00" },
    lifecycle: "published",
    tickets: [
      { id: "spectator", name: "Spectator seat", kind: "general", description: "Covered stand", price: 150, quantityTotal: 3000, quantitySold: 1240, salesEnd: { day: -1, time: "18:00" }, perks: ["Covered seating"] },
      { id: "team", name: "Team registration", kind: "general", description: "Squad of up to 8 players", price: 2400, quantityTotal: 16, quantitySold: 16, maxPerOrder: 1, salesEnd: { day: -6, time: "18:00" }, perks: ["Team kit", "Prize eligibility"] },
    ],
    refundPolicy: STRICT,
    tags: ["football", "community", "tournament"],
    trendingScore: 40,
    publishedDay: -28,
    coverPattern: "stripes",
    language: "Amharic",
  },
  {
    id: "evt-013",
    slug: "ethio-hip-hop-live-adama",
    title: "Ethio Hip-Hop Live",
    summary: "The country's biggest hip-hop line-up on one open-air stage in Adama.",
    description: [
      "Six of the country's biggest hip-hop and Ethio-trap artists share one stage at Adama Expo Grounds, with a full light and sound production.",
      "The show has moved to a later date to allow for a larger stage. Tickets bought for the original date stay valid.",
    ],
    categoryId: "music",
    organizerId: "org-sheger-live",
    format: "in-person",
    venueId: "ven-adama-expo",
    start: { day: 31, time: "18:00" },
    end: { day: 31, time: "23:30" },
    lifecycle: "postponed",
    originalStart: { day: 10, time: "18:00" },
    lifecycleNote: "Moved to a later date to allow for a larger stage. Tickets for the original date stay valid, or you can request a full refund.",
    updates: [{ day: -2, time: "10:00", summary: "New date announced. Existing tickets stay valid." }],
    tickets: [
      { id: "ga", name: "General admission", kind: "general", description: "Standing", price: 450, quantityTotal: 3000, quantitySold: 914, perks: ["Standing area"] },
      { id: "front", name: "Front stage", kind: "vip", description: "Front-stage pit", price: 1200, quantityTotal: 400, quantitySold: 238, maxPerOrder: 4, perks: ["Front-stage pit", "Express entry"] },
    ],
    refundPolicy: MODERATE,
    tags: ["hip-hop", "open air", "concert"],
    trendingScore: 68,
    publishedDay: -45,
    ageRestriction: "16+",
    coverPattern: "burst",
    language: "Amharic",
  },
  {
    id: "evt-014",
    slug: "ai-for-agriculture-workshop",
    title: "AI for Agriculture Workshop",
    summary: "A hands-on day building crop-disease models with open data.",
    description: [
      "Participants trained a crop-disease classifier from open satellite and leaf-image data, then deployed it to a basic Android app.",
      "Materials and recordings are available to registered attendees from My Tickets.",
    ],
    categoryId: "tech",
    organizerId: "org-horn-tech",
    format: "in-person",
    venueId: "ven-merkato-hub",
    start: { day: -12, time: "09:00" },
    end: { day: -12, time: "16:00" },
    lifecycle: "published",
    tickets: [{ id: "seat", name: "Workshop seat", kind: "general", description: "Laptop required", price: 800, quantityTotal: 60, quantitySold: 60, maxPerOrder: 2, perks: ["Lunch", "Materials"] }],
    refundPolicy: MODERATE,
    tags: ["ai", "agriculture", "workshop"],
    trendingScore: 30,
    publishedDay: -60,
    coverPattern: "grid",
    language: "English",
  },
  {
    id: "evt-015",
    slug: "wine-and-tej-tasting",
    title: "Wine & Tej Tasting Evening",
    summary: "A guided tasting of Ethiopian wines and traditional honey wine.",
    description: [
      "A sommelier and a tej maker guided guests through six wines and four styles of tej, with paired small plates.",
      "Thank you to everyone who joined us. The next tasting will be announced soon.",
    ],
    categoryId: "food",
    organizerId: "org-taste-ethiopia",
    format: "in-person",
    venueId: "ven-sheger-arts",
    start: { day: -5, time: "18:00" },
    end: { day: -5, time: "21:00" },
    lifecycle: "published",
    tickets: [{ id: "tasting", name: "Tasting seat", kind: "general", description: "Ten pours and small plates", price: 900, quantityTotal: 80, quantitySold: 74, maxPerOrder: 4, perks: ["Ten pours", "Small plates"] }],
    refundPolicy: STRICT,
    tags: ["wine", "tej", "tasting"],
    trendingScore: 35,
    publishedDay: -40,
    ageRestriction: "18+",
    coverPattern: "dots",
    language: "Amharic and English",
  },
  {
    id: "evt-016",
    slug: "annual-leadership-conference",
    title: "Annual Leadership Conference",
    summary: "A one-day conference for senior leaders on growth, governance and talent.",
    description: [
      "This year's conference was planned around growth, governance and building leadership teams, with speakers from finance, manufacturing and the public sector.",
      "The organizer has cancelled the event. Every ticket holder receives a full refund automatically.",
    ],
    categoryId: "business",
    organizerId: "org-addis-forum",
    format: "in-person",
    venueId: "ven-bole-convention",
    start: { day: 14, time: "09:00" },
    end: { day: 14, time: "17:00" },
    lifecycle: "cancelled",
    lifecycleNote: "Cancelled because the keynote programme could not be confirmed in time. Every ticket holder gets a full refund within 7 business days.",
    updates: [{ day: -1, time: "16:00", summary: "Event cancelled. Full refunds are on the way." }],
    tickets: [
      { id: "delegate", name: "Delegate pass", kind: "general", description: "Full day, lunch included", price: 3500, quantityTotal: 500, quantitySold: 212, perks: ["Full day", "Lunch"] },
      { id: "vip", name: "VIP pass", kind: "vip", description: "Reserved seating and leaders' dinner", price: 7500, quantityTotal: 60, quantitySold: 22, maxPerOrder: 2, perks: ["Reserved seating", "Leaders' dinner"] },
    ],
    attendeeQuestions: [COMPANY, JOB_TITLE],
    refundPolicy: FLEXIBLE,
    tags: ["leadership", "conference"],
    trendingScore: 20,
    publishedDay: -70,
    coverPattern: "blocks",
    language: "English",
  },
  {
    id: "evt-017",
    slug: "lake-yoga-weekend-retreat",
    title: "Lake Yoga Weekend Retreat",
    summary: "Two days of yoga, breathwork and slow mornings on Lake Tana.",
    description: [
      "A small-group retreat with sunrise and sunset yoga, breathwork, a boat trip to a monastery island and healthy meals from a lakeside kitchen.",
      "All levels are welcome. Mats are provided. The retreat pass includes lunch and dinner on both days; accommodation is booked separately.",
    ],
    categoryId: "sports",
    organizerId: "org-run-addis",
    format: "in-person",
    venueId: "ven-lakeside-bahirdar",
    start: { day: 27, time: "07:00" },
    end: { day: 28, time: "16:00" },
    lifecycle: "published",
    tickets: [
      { id: "retreat", name: "Retreat pass", kind: "pass", description: "Both days, meals included", price: 4200, quantityTotal: 40, quantitySold: 34, maxPerOrder: 2, perks: ["All sessions", "Lunch and dinner", "Boat trip"] },
      { id: "day", name: "Day pass", kind: "general", description: "Saturday sessions only", price: 1200, quantityTotal: 30, quantitySold: 12, maxPerOrder: 2, perks: ["Saturday sessions", "Lunch"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["yoga", "wellness", "retreat"],
    trendingScore: 55,
    publishedDay: -21,
    coverPattern: "waves",
    language: "English",
  },
  {
    id: "evt-018",
    slug: "krar-masinqo-masterclass",
    title: "Krar & Masinqo Masterclass",
    summary: "An afternoon learning the basics of two traditional instruments from master players.",
    description: [
      "Learn tuning, basic scales and one complete song on the krar or masinqo. Instruments are provided; no experience needed.",
      "Groups are capped at thirty so every student gets one-to-one time with the teachers.",
    ],
    categoryId: "arts",
    organizerId: "org-abyssinia-arts",
    format: "in-person",
    venueId: "ven-sheger-arts",
    start: { day: 7, time: "15:00" },
    end: { day: 7, time: "18:00" },
    lifecycle: "published",
    tickets: [{ id: "seat", name: "Masterclass seat", kind: "general", description: "Instrument provided", price: 350, quantityTotal: 30, quantitySold: 27, maxPerOrder: 2, perks: ["Instrument provided", "Song sheet"] }],
    speakers: [{ id: "sp-bereket", name: "Bereket Mulugeta", initials: "BM", role: "Krar player", organization: "Yared School of Music alumni", billing: "Teacher" }, { id: "sp-rahel", name: "Rahel Girma", initials: "RG", role: "Masinqo player", organization: "Azmari Bet Collective", billing: "Teacher" }],
    refundPolicy: FLEXIBLE,
    tags: ["music", "workshop", "traditional"],
    trendingScore: 52,
    publishedDay: -12,
    coverPattern: "stripes",
    language: "Amharic",
  },
  {
    id: "evt-019",
    slug: "fintech-regulation-roundtable",
    title: "Fintech Regulation Roundtable",
    summary: "Regulators, banks and startups on what the new payment directives mean in practice.",
    description: [
      "A moderated roundtable on the latest payment-system directives, licensing timelines and what compliance looks like for smaller providers.",
      "Join in person at Bole Convention Centre or online. Online seats are free; in-person seats include coffee and a networking session afterwards.",
    ],
    categoryId: "business",
    organizerId: "org-addis-forum",
    format: "hybrid",
    venueId: "ven-bole-convention",
    onlinePlatform: "Zoom",
    start: { day: 11, time: "14:00" },
    end: { day: 11, time: "17:00" },
    lifecycle: "published",
    tickets: [
      { id: "online", name: "Online seat", kind: "free", description: "Live stream with Q&A", price: 0, quantityTotal: 500, quantitySold: 214, maxPerOrder: 1, perks: ["Live stream", "Q&A"] },
      { id: "inperson", name: "In-person seat", kind: "general", description: "Room seat, coffee and networking", price: 750, quantityTotal: 120, quantitySold: 64, maxPerOrder: 3, perks: ["Room seat", "Coffee", "Networking"] },
    ],
    speakers: [{ id: "sp-liya", name: "Liya Kassa", initials: "LK", role: "Payments policy adviser", organization: "Independent", billing: "Moderator" }, { id: "sp-selam2", name: "Selamawit Bekele", initials: "SB", role: "Chief technology officer", organization: "Abay Pay", billing: "Panelist" }],
    attendeeQuestions: [COMPANY],
    refundPolicy: MODERATE,
    tags: ["fintech", "policy", "hybrid"],
    trendingScore: 48,
    publishedDay: -15,
    coverPattern: "blocks",
    language: "English",
  },
  {
    id: "evt-020",
    slug: "cloud-native-addis-meetup",
    title: "Cloud Native Addis Meetup",
    summary: "Lightning talks on Kubernetes, observability and running infrastructure cheaply.",
    description: [
      "Five lightning talks from engineers running production systems in Addis Ababa, followed by pizza and open discussion.",
      "Registration opens soon. Seats go quickly, so set a reminder.",
    ],
    categoryId: "tech",
    organizerId: "org-horn-tech",
    format: "in-person",
    venueId: "ven-merkato-hub",
    start: { day: 16, time: "17:30" },
    end: { day: 16, time: "20:30" },
    lifecycle: "published",
    tickets: [{ id: "free", name: "Free registration", kind: "free", description: "Talks, pizza and drinks", price: 0, quantityTotal: 150, quantitySold: 0, maxPerOrder: 1, salesStart: { day: 2, time: "09:00" }, perks: ["Talks", "Pizza"] }],
    refundPolicy: FREE_POLICY,
    tags: ["cloud", "devops", "meetup", "free"],
    trendingScore: 44,
    publishedDay: -6,
    coverPattern: "grid",
    language: "English",
  },
  {
    id: "evt-021",
    slug: "holiday-makers-market",
    title: "Holiday Makers Market",
    summary: "Eighty local makers, live music and hands-on craft workshops over one weekend.",
    description: [
      "Shop handmade textiles, jewellery, ceramics and leather from eighty independent makers. Entry is free.",
      "Book a two-hour basket-weaving workshop with a master weaver; all materials included and you take your basket home.",
    ],
    categoryId: "arts",
    organizerId: "org-abyssinia-arts",
    format: "in-person",
    venueId: "ven-merkato-hub",
    start: { day: 33, time: "10:00" },
    end: { day: 34, time: "18:00" },
    lifecycle: "published",
    tickets: [
      { id: "free", name: "Free entry", kind: "free", description: "Either day", price: 0, quantityTotal: 2000, quantitySold: 380, maxPerOrder: 6, perks: ["Market entry"] },
      { id: "workshop", name: "Basket-weaving workshop", kind: "general", description: "Two hours, materials included", price: 400, quantityTotal: 48, quantitySold: 21, maxPerOrder: 2, perks: ["Materials", "Take-home basket"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["market", "crafts", "family friendly", "free"],
    trendingScore: 62,
    publishedDay: -10,
    coverPattern: "blocks",
    language: "Amharic and English",
  },
  {
    id: "evt-022",
    slug: "addis-laughs-comedy-night",
    title: "Addis Laughs: Comedy Night",
    summary: "Five of the city's sharpest stand-up comedians in one night, in Amharic and English.",
    description: [
      "A packed line-up of stand-up comedy covering traffic, family, startups and everything in between. Sets are in Amharic and English.",
      "The show has moved to the main hall at Sheger Arts Centre to fit more seats. Your ticket is still valid.",
    ],
    categoryId: "arts",
    organizerId: "org-abyssinia-arts",
    format: "in-person",
    venueId: "ven-sheger-arts",
    start: { day: 5, time: "20:00" },
    end: { day: 5, time: "22:30" },
    lifecycle: "published",
    updates: [{ day: -1, time: "12:00", summary: "Moved to the main hall to fit more seats. Your ticket is still valid." }],
    tickets: [
      { id: "ga", name: "General admission", kind: "general", description: "Unreserved seating", price: 400, quantityTotal: 450, quantitySold: 286, perks: ["Unreserved seat"] },
      { id: "front", name: "Front row", kind: "vip", description: "First two rows, reserved", price: 1000, quantityTotal: 20, quantitySold: 18, maxPerOrder: 2, perks: ["Reserved front-row seat"] },
    ],
    refundPolicy: MODERATE,
    tags: ["comedy", "stand-up", "nightlife"],
    trendingScore: 85,
    publishedDay: -24,
    ageRestriction: "16+",
    coverPattern: "burst",
    language: "Amharic and English",
  },
  {
    id: "evt-023",
    slug: "year-end-countdown-gala",
    title: "Year-End Countdown Gala",
    summary: "Black-tie dinner, a live big band and a midnight countdown to close the year.",
    description: [
      "Celebrate the end of the year with a four-course dinner, a live big band and a guest DJ for the countdown at midnight.",
      "General admission includes the standing reception and dance floor. VIP table seats include dinner, a reserved table and a midnight toast.",
    ],
    categoryId: "music",
    organizerId: "org-sheger-live",
    format: "in-person",
    venueId: "ven-bole-convention",
    start: { day: 38, time: "20:00" },
    end: { day: 39, time: "02:00" },
    lifecycle: "published",
    tickets: [
      { id: "early", name: "Early bird", kind: "early-bird", description: "Reception and dance floor", price: 2800, quantityTotal: 200, quantitySold: 154, salesEnd: { day: 9, time: "23:59" }, perks: ["Reception", "Dance floor"] },
      { id: "ga", name: "General admission", kind: "general", description: "Reception and dance floor", price: 3500, quantityTotal: 800, quantitySold: 205, perks: ["Reception", "Dance floor"] },
      { id: "vip", name: "VIP table seat", kind: "vip", description: "Four-course dinner, reserved table, midnight toast", price: 8000, quantityTotal: 120, quantitySold: 64, maxPerOrder: 6, perks: ["Four-course dinner", "Reserved table", "Midnight toast"] },
    ],
    refundPolicy: MODERATE,
    tags: ["gala", "big band", "dinner"],
    featured: true,
    trendingScore: 90,
    publishedDay: -8,
    ageRestriction: "18+",
    coverPattern: "rings",
    language: "English",
  },
  {
    id: "evt-024",
    slug: "dire-dawa-heritage-music-night",
    title: "Dire Dawa Heritage Music Night",
    summary: "Oromo, Harari and Somali musical traditions on one stage.",
    description: [
      "An evening celebrating the music of the east, with traditional ensembles from Dire Dawa and Harar and a closing set from a contemporary band.",
      "Seating is unreserved. VIP tickets include reserved seats in the first five rows.",
    ],
    categoryId: "music",
    organizerId: "org-sheger-live",
    format: "in-person",
    venueId: "ven-kezira-hall",
    start: { day: 22, time: "19:00" },
    end: { day: 22, time: "23:00" },
    lifecycle: "published",
    tickets: [
      { id: "ga", name: "General admission", kind: "general", description: "Unreserved seating", price: 350, quantityTotal: 900, quantitySold: 188, perks: ["Unreserved seat"] },
      { id: "vip", name: "VIP", kind: "vip", description: "Reserved seat in the first five rows", price: 900, quantityTotal: 100, quantitySold: 31, maxPerOrder: 4, perks: ["Reserved seat"] },
    ],
    refundPolicy: FLEXIBLE,
    tags: ["traditional", "concert", "heritage"],
    trendingScore: 42,
    publishedDay: -11,
    coverPattern: "rings",
    language: "Multiple",
  },
];

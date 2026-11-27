/**
 * Attendee marketplace domain. Kept separate from `types/index.ts` (the admin starter's types) so the two can evolve
 * independently. Every date is an ISO string with an explicit offset (Addis Ababa, +03:00).
 */

/** A category's id. Organizers type categories freely, so the ids come from the events themselves (a slug of the name). */
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

/** A city's id, when the venue's city is one we know the coordinates of (`addis-ababa`…). */
export type CityId = string;

export interface City {
  id: CityId;
  name: string;
  lat: number;
  lng: number;
}

export interface Organizer {
  id: string;
  slug: string;
  name: string;
  initials: string;
  tagline: string;
  bio: string;
  cityId: CityId;
  email: string;
  phone: string;
  followers: number;
  verified: boolean;
  /** Ratings out of 5 from past attendees. */
  rating: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: CityId;
  /** Where the venue's pin sits. Without it the map centres on the city. */
  lat?: number;
  lng?: number;
  /** 0 when the venue has no stated capacity. */
  capacity: number;
  /** The city as the organizer wrote it, when it is not one of the known cities. */
  cityName?: string;
  /** Shown under the map: how to get there. Empty when the organizer gave none. */
  directions: string;
}

export type EventFormat = "in-person" | "online" | "hybrid";

/** What the organizer set. Timing (upcoming / ongoing / ended) is derived from the dates, never stored. */
export type EventLifecycle = "published" | "cancelled" | "postponed";

export type TicketKind = "general" | "vip" | "early-bird" | "free" | "student" | "pass";

export interface TicketType {
  id: string;
  name: string;
  kind: TicketKind;
  description: string;
  /** Whole birr. 0 means free registration. */
  price: number;
  quantityTotal: number;
  quantitySold: number;
  /** Per-order cap for this type. The order-wide cap (6) still applies. */
  maxPerOrder: number;
  salesStartAt: string;
  salesEndAt: string;
  perks: string[];
}

export interface Speaker {
  id: string;
  name: string;
  initials: string;
  role: string;
  organization: string;
  /** "Speaker", "Performer", "Host", "Chef"… */
  billing: string;
}

export interface AgendaItem {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  description?: string;
  location?: string;
  speakerIds: string[];
}

export interface AgendaDay {
  id: string;
  label: string;
  items: AgendaItem[];
}

export interface EventUpdate {
  at: string;
  summary: string;
}

export interface AttendeeQuestion {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "select";
  options?: string[];
}

export interface RefundPolicy {
  summary: string;
  details: string[];
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string[];
  categoryId: CategoryId;
  organizerId: string;
  format: EventFormat;
  /** Missing for online-only events. */
  venueId?: string;
  /** Online events: the platform the link opens on. */
  onlinePlatform?: string;
  startsAt: string;
  endsAt: string;
  lifecycle: EventLifecycle;
  /** Postponed events: the date it was originally planned for. */
  originalStartsAt?: string;
  /** When the doors open, if the organizer set a time before the start (Phase 9). */
  doorsOpenAt?: string;
  /** Cancelled or postponed events: why, in the organizer's words. */
  lifecycleNote?: string;
  /** Changes the organizer made after publishing ("Venue changed"). Newest first. */
  updates: EventUpdate[];
  ticketTypes: TicketType[];
  speakers: Speaker[];
  agenda: AgendaDay[];
  attendeeQuestions: AttendeeQuestion[];
  refundPolicy: RefundPolicy;
  tags: string[];
  featured: boolean;
  /** Higher is hotter. Drives "Trending". */
  trendingScore: number;
  publishedAt: string;
  ageRestriction?: string;
  language: string;
  /** Picks the cover artwork when there is no uploaded picture. */
  coverPattern: CoverPattern;
  /** The organizer's uploaded cover (a full URL), when there is one. */
  coverUrl?: string;
  /** The IANA timezone the event happens in (`Africa/Addis_Ababa`). Dates are shown in it. */
  timezone?: string;
  /** Sign-up details, from the event page. Only on events loaded for their own page. */
  registration?: EventRegistration;
}

/** What the sign-up form needs from the API's event page. */
export interface EventRegistration {
  open: boolean;
  opensAt: string | null;
  closesAt: string | null;
  /** Show this notice on the form and send its version back. */
  privacyVersion: string;
  organizationSlug: string;
  eventSlug: string;
  /** Public ticket types with their price (a decimal string) and currency. */
  ticketTypes: { code: string; name: string; price: string; currency: string; isFree: boolean; priceValidUntil: string | null }[];
  /** QUICK or DETAILED, and how a DETAILED event asks for each guest detail. */
  mode: "QUICK" | "DETAILED";
  /** Most tickets one mobile may hold at this event, across every order; null = no limit. */
  purchaseLimit: number | null;
  holderFields: { name: HolderSetting; mobile: HolderSetting; email: HolderSetting; affiliation: HolderSetting; country: HolderSetting };
}

export type HolderSetting = "REQUIRED" | "OPTIONAL" | "HIDDEN";

export type CoverPattern = "rings" | "grid" | "arcs" | "dots" | "waves" | "stripes" | "burst" | "blocks";

/** A lighter shape for lists and client islands (no long copy). */
export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: CategoryId;
  categoryName: string;
  organizerId: string;
  organizerName: string;
  format: EventFormat;
  venueName?: string;
  venueAddress?: string;
  cityId?: CityId;
  cityName?: string;
  onlinePlatform?: string;
  startsAt: string;
  endsAt: string;
  lifecycle: EventLifecycle;
  originalStartsAt?: string;
  lifecycleNote?: string;
  latestUpdate?: EventUpdate;
  coverPattern: CoverPattern;
  coverUrl?: string;
  timezone?: string;
  minPrice: number;
  isFree: boolean;
  ticketTypes: TicketType[];
  trendingScore: number;
  featured: boolean;
  publishedAt: string;
  refundSummary: string;
}

/* ───────── Explore query ───────── */

export type DateFilter = "upcoming" | "today" | "weekend" | "week" | "month" | "past";
export type PriceFilter = "all" | "free" | "paid";
export type SortOption = "relevance" | "upcoming" | "newest";

export interface EventQuery {
  q: string;
  category: CategoryId | "all";
  city: CityId | "online" | "all";
  date: DateFilter;
  price: PriceFilter;
  sort: SortOption;
  organizer: string | "all";
  page: number;
}

export interface EventQueryResult {
  items: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ───────── Orders and tickets (client mock store) ───────── */

export type PaymentMethodId = "telebirr" | "cbe" | "wallet";
export type PaymentStatus = "paid" | "pending" | "failed" | "free";

export interface OrderItem {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Buyer {
  name: string;
  email: string;
  /** Nine national digits, no spaces ("911204412"). */
  phone: string;
}

export interface TicketHolder {
  name: string;
  email: string;
  answers: Record<string, string>;
}

export interface OrderTotals {
  subtotal: number;
  serviceFee: number;
  vat: number;
  total: number;
}

export interface IssuedTicket {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  holder: TicketHolder;
  /** `used` once scanned at the gate. */
  state: "valid" | "used";
  checkedInAt?: string;
}

export interface Order {
  ref: string;
  accountId: string;
  eventId: string;
  eventSlug: string;
  /** Snapshot at purchase, for receipts; live event data is read from the catalog. */
  eventTitle: string;
  createdAt: string;
  items: OrderItem[];
  buyer: Buyer;
  totals: OrderTotals;
  payment: {
    status: PaymentStatus;
    method?: PaymentMethodId;
    reference?: string;
    paidAt?: string;
  };
  tickets: IssuedTicket[];
}

/* ───────── Attendee accounts (client mock store) ───────── */

export interface NotificationPreferences {
  ticketUpdates: boolean;
  eventReminders: boolean;
  recommendations: boolean;
  smsAlerts: boolean;
}

export interface AttendeeAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  cityId: CityId;
  createdAt: string;
  preferences: NotificationPreferences;
}

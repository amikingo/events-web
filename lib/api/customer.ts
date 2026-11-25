/**
 * Guest accounts & My Tickets (Phase 6).
 *
 *   POST /v1/auth/customer/signup            { first_name, last_name, mobile, password }
 *   POST /v1/auth/customer/signup/confirm    { mobile, otp, password }
 *   POST /v1/auth/customer/signup/resend     { mobile }
 *   POST /v1/auth/customer/code              { mobile }
 *   POST /v1/auth/customer/login/code        { mobile, otp }
 *   POST /v1/auth/customer/login/password    { mobile, password }
 *   POST /v1/auth/customer/refresh           (refresh cookie, no Bearer)
 *   POST /v1/auth/customer/logout            (refresh cookie, no Bearer)
 *   GET  /v1/auth/customer/me                current guest profile
 *   GET  /v1/customer/registrations          My Tickets across organizers
 *
 * The access token stays only in `lib/api-client.ts` memory; the refresh token stays in the HttpOnly cookie.
 */
import {
  announceGuestSession,
  apiRequest,
  registerGuestRefresher,
  terminateGuestSession,
} from "@/lib/api-client";
import type { CustomerProfile, CustomerToken } from "@/lib/api-client";

export interface MyTicket {
  code: string;
  status: "CONFIRMED" | "CANCELLED";
  registered_at: string;
  cancelled_at: string | null;
  ticket_type: { code: string; name: string };
  event: {
    name: string;
    slug: string;
    starts_at: string | null;
    ends_at: string | null;
    timezone: string;
    status: string;
  };
  organization: { name: string; slug: string };
}

export interface CustomerSignUpInput {
  first_name: string;
  last_name: string;
  mobile: string;
  password: string;
}

export interface CustomerConfirmSignUpInput {
  mobile: string;
  otp: string;
  password: string;
}

export interface CustomerCodeLoginInput {
  mobile: string;
  otp: string;
}

export interface CustomerPasswordLoginInput {
  mobile: string;
  password: string;
}

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const text = (v: unknown): string | null => (isObject(v) ? (str(v.en) ?? str(v.am)) : str(v));

function parseCustomerProfile(raw: unknown): CustomerProfile {
  if (!isObject(raw)) throw new Error("The server sent a profile this app can't read.");
  const id = str(raw.id) ?? str(raw.user_id) ?? str(raw.sub);
  if (!id) throw new Error("The server sent a profile without an id.");
  return {
    id,
    mobile: str(raw.mobile),
    firstname: text(raw.firstname),
    middlename: text(raw.middlename),
    lastname: text(raw.lastname),
  };
}

function parseCustomerToken(raw: unknown): CustomerToken {
  if (!isObject(raw)) throw new Error("The server sent a session this app can't read.");
  const accessToken = str(raw.accessToken) ?? str(raw.access_token);
  const expiresRaw = raw.expiresIn ?? raw.expires_in;
  if (!accessToken || typeof expiresRaw !== "number") {
    throw new Error("The server sent a session without a token.");
  }
  return {
    accessToken,
    expiresIn: expiresRaw,
    user: parseCustomerProfile(raw.user),
  };
}

function keep(raw: unknown): CustomerToken {
  const session = parseCustomerToken(raw);
  announceGuestSession(session);
  return session;
}

export function customerFullName(profile: CustomerProfile): string {
  return [profile.firstname, profile.middlename, profile.lastname].filter(Boolean).join(" ") || "Guest";
}

export function signUpCustomer(input: CustomerSignUpInput): Promise<{ mobile: string }> {
  return apiRequest<{ mobile: string }>("/v1/auth/customer/signup", {
    method: "POST",
    body: input,
  });
}

export async function confirmCustomerSignUp(input: CustomerConfirmSignUpInput): Promise<CustomerToken> {
  return keep(
    await apiRequest<unknown>("/v1/auth/customer/signup/confirm", {
      method: "POST",
      body: input,
    }),
  );
}

export function resendCustomerSignUpCode(mobile: string): Promise<{ mobile: string }> {
  return apiRequest<{ mobile: string }>("/v1/auth/customer/signup/resend", {
    method: "POST",
    body: { mobile },
  });
}

export function sendCustomerCode(mobile: string): Promise<{ mobile: string }> {
  return apiRequest<{ mobile: string }>("/v1/auth/customer/code", {
    method: "POST",
    body: { mobile },
  });
}

export async function loginCustomerWithCode(input: CustomerCodeLoginInput): Promise<CustomerToken> {
  return keep(
    await apiRequest<unknown>("/v1/auth/customer/login/code", {
      method: "POST",
      body: input,
    }),
  );
}

export async function loginCustomerWithPassword(input: CustomerPasswordLoginInput): Promise<CustomerToken> {
  return keep(
    await apiRequest<unknown>("/v1/auth/customer/login/password", {
      method: "POST",
      body: input,
    }),
  );
}

export async function refreshCustomer(): Promise<CustomerToken> {
  return keep(await apiRequest<unknown>("/v1/auth/customer/refresh", { method: "POST" }));
}

export async function logoutCustomer(): Promise<void> {
  try {
    await apiRequest<{ revoked: boolean }>("/v1/auth/customer/logout", { method: "POST" });
  } catch {
    // Best-effort server revocation; always forget the in-memory token cleanly.
  } finally {
    terminateGuestSession("signed_out");
  }
}

export async function getCurrentCustomer(signal?: AbortSignal): Promise<CustomerProfile> {
  return parseCustomerProfile(await apiRequest<unknown>("/v1/auth/customer/me", { signal }));
}

export function listMyTickets(signal?: AbortSignal): Promise<MyTicket[]> {
  return apiRequest<MyTicket[]>("/v1/customer/registrations", { signal });
}

registerGuestRefresher(() => refreshCustomer());

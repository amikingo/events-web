/**
 * The one way the web app talks to events-api. No component or API file calls `fetch` itself.
 *
 * - Prefixes `NEXT_PUBLIC_API_URL`, sends `credentials: "include"` (the refresh cookie), JSON headers, and no
 *   `Content-Type` for `FormData` (the browser adds the multipart boundary).
 * - The access token lives in this module's memory only, never in storage or a readable cookie (a decision of this
 *   project, see docs/frontend-backend-integration.md). A reload loses it; the first call refreshes it from the
 *   HttpOnly cookie.
 * - Adds `Authorization: Bearer` to every call except the public and auth lifecycle URLs listed below.
 * - A non-OK answer throws `ApiError` with `status`, `code` and `details` from the API's error envelope.
 * - A 401 for an unusable token triggers one shared refresh (single flight), then one retry. A refresh that fails
 *   for good ends the session (`onSessionTerminated`).
 */
import type { StaffToken } from "@/lib/auth-token";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010").replace(/\/$/, "");
/**
 * Where server-rendered pages reach the API. Inside a container the public address can be unreachable, so the
 * server may use an internal one (API_INTERNAL_URL); browsers always use API_URL. Unset locally: same as API_URL.-43
 */
const SERVER_API_URL = (process.env.API_INTERNAL_URL ?? API_URL).replace(/\/$/, "");
const requestBase = () => (typeof window === "undefined" ? SERVER_API_URL : API_URL);

/** No token, ever: the visitor site's catalog and event pages (except the two sign-up POSTs below). */
const PUBLIC_PATH_PREFIXES = ["/v1/public/"];
/**
 * Public sign-up and checkout: a signed-in guest's token goes along, so the API takes the buyer's mobile from the
 * account and links the tickets to it (My Tickets). Without one, the visitor is anonymous and sends a mobile.
 */
const PUBLIC_SIGN_UP_PATH = /^\/v1\/public\/organizations\/[^/]+\/events\/[^/]+\/(registrations|orders)$/;
/** No Bearer token: these work from the refresh cookie (or password/code) instead. */
const AUTH_LIFECYCLE_PATHS = [
  "/v1/auth/staff/login",
  "/v1/auth/staff/refresh",
  "/v1/auth/staff/logout",
  "/v1/auth/customer/signup",
  "/v1/auth/customer/signup/confirm",
  "/v1/auth/customer/signup/resend",
  "/v1/auth/customer/code",
  "/v1/auth/customer/login/code",
  "/v1/auth/customer/login/password",
  "/v1/auth/customer/refresh",
  "/v1/auth/customer/logout",
];

type AuthKind = "none" | "staff" | "guest" | "optional-guest";

function authKindFor(path: string, method = "GET"): AuthKind {
  const bare = path.split("?")[0]!;
  if (AUTH_LIFECYCLE_PATHS.includes(bare)) return "none";
  if (bare === "/v1/auth/customer/me" || bare === "/v1/customer" || bare.startsWith("/v1/customer/")) return "guest";
  if (method.toUpperCase() === "POST" && PUBLIC_SIGN_UP_PATH.test(bare)) return "optional-guest";
  if (PUBLIC_PATH_PREFIXES.some((p) => bare.startsWith(p))) return "none";
  return "staff";
}

/** Files the API serves (event covers) come back as a path; they are public, so `<img>` loads them directly. */
export function assetUrl(path: string): string {
  return `${API_URL}${path}`;
}

/** An answer from the API's error envelope (`{ success: false, error: { code, message, details } }`), or a network failure. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token and session listeners ────────────────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  mobile: string | null;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
}

export interface CustomerToken {
  accessToken: string;
  expiresIn: number;
  user: CustomerProfile;
}

let accessToken: string | null = null;
/** The last session the API announced (token included), in memory only. Lets the app reuse a fresh sign-in. */
let lastSession: StaffToken | null = null;
const refreshedListeners = new Set<(session: StaffToken) => void>();
const terminatedListeners = new Set<(reason: string) => void>();

let guestAccessToken: string | null = null;
let lastGuestSession: CustomerToken | null = null;
const guestRefreshedListeners = new Set<(session: CustomerToken) => void>();
const guestTerminatedListeners = new Set<(reason: string) => void>();

/** The session from the latest login, refresh or role switch, or null when signed out or after a reload. */
export function currentSession(): StaffToken | null {
  return lastSession;
}

/** The guest session from the latest login or refresh, or null when signed out or after a reload. */
export function currentGuestSession(): CustomerToken | null {
  return lastGuestSession;
}

/** Every login, refresh and role switch. The auth context keeps its session and refresh timer in sync with it. */
export function onTokenRefreshed(listener: (session: StaffToken) => void): () => void {
  refreshedListeners.add(listener);
  return () => {
    refreshedListeners.delete(listener);
  };
}

/** The session ended for good (refresh refused, or sign-out). */
export function onSessionTerminated(listener: (reason: string) => void): () => void {
  terminatedListeners.add(listener);
  return () => {
    terminatedListeners.delete(listener);
  };
}

export function onGuestTokenRefreshed(listener: (session: CustomerToken) => void): () => void {
  guestRefreshedListeners.add(listener);
  return () => {
    guestRefreshedListeners.delete(listener);
  };
}

export function onGuestSessionTerminated(listener: (reason: string) => void): () => void {
  guestTerminatedListeners.add(listener);
  return () => {
    guestTerminatedListeners.delete(listener);
  };
}

/** Called by the auth API file whenever it receives a new token. */
export function announceSession(session: StaffToken): void {
  accessToken = session.accessToken;
  lastSession = session;
  refreshedListeners.forEach((l) => l(session));
}

/** Forgets the token and tells every listener. `reason` is the API error code, or `"signed_out"`. */
export function terminateSession(reason: string): void {
  accessToken = null;
  lastSession = null;
  terminatedListeners.forEach((l) => l(reason));
}

/** Called by the customer auth API file whenever it receives a new guest token. */
export function announceGuestSession(session: CustomerToken): void {
  guestAccessToken = session.accessToken;
  lastGuestSession = session;
  guestRefreshedListeners.forEach((l) => l(session));
}

/** Forgets the guest token and tells every listener. `reason` is the API error code, or `"signed_out"`. */
export function terminateGuestSession(reason: string): void {
  guestAccessToken = null;
  lastGuestSession = null;
  guestTerminatedListeners.forEach((l) => l(reason));
}

// ── Requests ───────────────────────────────────────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Extra headers, e.g. `Idempotency-Key` on a registration. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ListMeta {
  count: number;
  page: number;
  pageSize: number;
}

interface Envelope<T> {
  data: T;
  message?: string;
  meta?: ListMeta;
  /** The HTTP status: 201 vs 200 means something for registrations (a place was taken, or it already was). */
  status: number;
}

async function send<T>(path: string, { method = "GET", body, headers: extra, signal }: RequestOptions): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const authKind = authKindFor(path, method);
  if (authKind === "staff" && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if ((authKind === "guest" || authKind === "optional-guest") && guestAccessToken) {
    headers.Authorization = `Bearer ${guestAccessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${requestBase()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.", cause);
  }

  if (res.status === 204) return { data: undefined as T, status: 204 };
  const payload = (await res.json().catch(() => null)) as
    | { success: true; data: T; message?: string; meta?: ListMeta }
    | { success: false; error: { code: string; message: string; details?: unknown } }
    | null;

  if (res.ok && payload && payload.success) {
    return { data: payload.data, message: payload.message, meta: payload.meta, status: res.status };
  }
  const error = payload && !payload.success ? payload.error : null;
  throw new ApiError(res.status, error?.code ?? "unknown_error", error?.message ?? res.statusText, error?.details);
}

// ── Single-flight refresh ──────────────────────────────────────────────────────────────────────────────────

type Refresher = (assignmentId?: string) => Promise<StaffToken>;
let refresher: Refresher | null = null;
let refreshing: Promise<StaffToken> | null = null;

/** Registered by `lib/api/auth.ts`, which owns the refresh endpoint. Keeps this file free of auth payload details. */
export function registerRefresher(fn: Refresher): void {
  refresher = fn;
}

/** One refresh at a time: everyone who asks while it runs shares the same promise. */
export function refreshAccessToken(assignmentId?: string): Promise<StaffToken> {
  if (!refresher) return Promise.reject(new ApiError(0, "refresh_unavailable", "Sign-in is not set up."));
  refreshing ??= refresher(assignmentId).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

type GuestRefresher = () => Promise<CustomerToken>;
let guestRefresher: GuestRefresher | null = null;
let guestRefreshing: Promise<CustomerToken> | null = null;

/** Registered by `lib/api/customer.ts`, which owns the guest refresh endpoint. */
export function registerGuestRefresher(fn: GuestRefresher): void {
  guestRefresher = fn;
}

/** One guest refresh at a time: concurrent calls share the same promise. */
export function refreshGuestAccessToken(): Promise<CustomerToken> {
  if (!guestRefresher) return Promise.reject(new ApiError(401, "refresh_token_missing", "Guest sign-in is not set up."));
  guestRefreshing ??= guestRefresher().finally(() => {
    guestRefreshing = null;
  });
  return guestRefreshing;
}

/**
 * Terminal refresh failures: nothing here can fix them, so the person goes to sign-in. Sign-in picks a role and
 * returns the full list, which is how someone with several roles gets the picker back (`staff_context_required`
 * says how many roles there are, not which).
 */
const TERMINAL = new Set(["refresh_token_missing", "refresh_token_invalid", "staff_context_required", "staff_assignment_not_found"]);
/** A 401 with one of these means the access token is missing or unusable: refresh once, then retry. */
const TOKEN_UNUSABLE = new Set(["expired_token", "authentication_required", "malformed_bearer_token", "invalid_token", "unsupported_token"]);

/** A failure that ended the session (the person must sign in again). */
export function isTerminalAuthError(error: unknown): boolean {
  return error instanceof ApiError && TERMINAL.has(error.code);
}

async function refreshOrTerminate(): Promise<void> {
  try {
    await refreshAccessToken();
  } catch (error) {
    if (error instanceof ApiError && TERMINAL.has(error.code)) terminateSession(error.code);
    throw error;
  }
}

async function refreshGuestOrTerminate(): Promise<void> {
  try {
    await refreshGuestAccessToken();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) terminateGuestSession(error.code);
    throw error;
  }
}

async function call<T>(path: string, options: RequestOptions): Promise<Envelope<T>> {
  const authKind = authKindFor(path, options.method ?? "GET");
  if (authKind === "none") return send<T>(path, options);

  if (authKind === "optional-guest") {
    const sentWithGuestToken = Boolean(guestAccessToken);
    try {
      return await send<T>(path, options);
    } catch (error) {
      if (sentWithGuestToken && error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
        await refreshGuestOrTerminate();
        return send<T>(path, options);
      }
      throw error;
    }
  }

  if (authKind === "guest") {
    if (!guestAccessToken) await refreshGuestOrTerminate();
    try {
      return await send<T>(path, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
        await refreshGuestOrTerminate();
        return send<T>(path, options);
      }
      throw error;
    }
  }

  if (!accessToken) await refreshOrTerminate();
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
      await refreshOrTerminate();
      return send<T>(path, options);
    }
    throw error;
  }
}

/** Like `apiRequest`, with HTTP status and message envelope: for registrations and warning messages. */
export async function apiRequestWithStatus<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; status: number; message?: string }> {
  const { data, status, message } = await call<T>(path, options);
  return { data, status, message };
}

/** One record, an action, or a short unpaged list. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await call<T>(path, options)).data;
}

async function fetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authKind = authKindFor(path, "GET");
  if (authKind === "staff" && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (authKind === "guest" && guestAccessToken) headers.Authorization = `Bearer ${guestAccessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.", cause);
  }

  if (res.ok) return res.blob();
  const payload = (await res.json().catch(() => null)) as
    | { success: false; error: { code: string; message: string; details?: unknown } }
    | null;
  const error = payload && !payload.success ? payload.error : null;
  throw new ApiError(res.status, error?.code ?? "unknown_error", error?.message ?? res.statusText, error?.details);
}

/** Downloads a non-JSON file (such as a CSV export) using the same Bearer token and 401 refresh-retry flow. */
export async function apiDownload(
  path: string,
  { query = {}, signal }: { query?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, v);
  const qs = params.toString();
  const fullPath = qs ? `${path}?${qs}` : path;
  const authKind = authKindFor(fullPath, "GET");

  if (authKind === "none") return fetchBlob(fullPath, signal);
  if (authKind === "guest") {
    if (!guestAccessToken) await refreshGuestOrTerminate();
    try {
      return await fetchBlob(fullPath, signal);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
        await refreshGuestOrTerminate();
        return fetchBlob(fullPath, signal);
      }
      throw error;
    }
  }
  if (!accessToken) await refreshOrTerminate();
  try {
    return await fetchBlob(fullPath, signal);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
      await refreshOrTerminate();
      return fetchBlob(fullPath, signal);
    }
    throw error;
  }
}

// ── Pagination ─────────────────────────────────────────────────────────────────────────────────────────────

/** The one paginated shape every list screen gets. */
export interface Paginated<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/** The API refuses a page size over 100. API files clamp before asking. */
export const MAX_PAGE_SIZE = 100;
export function clampPageSize(size: number | undefined, fallback = 20): number {
  if (!size || !Number.isFinite(size)) return fallback;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
}

/** One page of a list endpoint (`?page&pageSize`, plus filters). */
export async function apiPage<T>(
  path: string,
  { page = 1, pageSize, query = {}, signal }: { page?: number; pageSize?: number; query?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<Paginated<T>> {
  const size = clampPageSize(pageSize);
  const params = new URLSearchParams({ page: String(Math.max(1, page)), pageSize: String(size) });
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, v);
  const { data, meta } = await call<T[]>(`${path}?${params.toString()}`, { signal });
  const totalItems = meta?.count ?? data.length;
  return { data, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / (meta?.pageSize ?? size))), currentPage: meta?.page ?? page, pageSize: meta?.pageSize ?? size };
}

/** Every row of a list endpoint, page after page. For pickers and small lists only. */
export async function apiListAll<T>(path: string, { query = {}, signal }: { query?: Record<string, string | undefined>; signal?: AbortSignal } = {}): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const result = await apiPage<T>(path, { page, pageSize: MAX_PAGE_SIZE, query, signal });
    all.push(...result.data);
    if (result.data.length === 0 || page >= result.totalPages) return all;
  }
}

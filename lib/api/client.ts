/**
 * The one way the web app talks to events-api.
 *
 * - The access token lives in this module's memory only. Never put it in localStorage or a cookie: a page reload
 *   loses it on purpose, and `ensureAccessToken` gets a new one from the HttpOnly refresh cookie.
 * - Every request sends cookies (`credentials: "include"`), otherwise the refresh cookie is never stored or sent.
 * - Callers switch on `ApiError.code`, never on `ApiError.message`.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010").replace(/\/$/, "");

/** An error answered by the API (`{ success: false, error: { code, message, details } }`), or a network failure. */
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

let accessToken: string | null = null;
/** Called after a refresh fails for good (no/invalid refresh cookie), so the app can show the sign-in screen. */
let onSessionLost: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

export function setSessionLostHandler(handler: (() => void) | null): void {
  onSessionLost = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the Bearer token. Login, refresh and logout are the only calls that set this to false. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** List endpoints answer with `meta` next to `data`. */
export interface ListMeta {
  count: number;
  page: number;
  pageSize: number;
}

interface Envelope<T> {
  data: T;
  meta?: ListMeta;
}

async function send<T>(path: string, { method = "GET", body, auth = true, signal }: RequestOptions): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.", cause);
  }

  const payload = (await res.json().catch(() => null)) as
    | { success: true; data: T; meta?: ListMeta }
    | { success: false; error: { code: string; message: string; details?: unknown } }
    | null;

  if (res.ok && payload && payload.success) return { data: payload.data, meta: payload.meta };
  const error = payload && !payload.success ? payload.error : null;
  throw new ApiError(res.status, error?.code ?? "unknown_error", error?.message ?? res.statusText, error?.details);
}

/**
 * Renews the access token from the refresh cookie. One refresh at a time: callers that arrive while it is running
 * share the same promise. `assignmentId` is only needed when the person has several active roles
 * (`409 staff_context_required`).
 */
type Refresher = (assignmentId?: string) => Promise<void>;
let refresher: Refresher | null = null;
let refreshing: Promise<void> | null = null;

/** Registered by `lib/api/auth.ts`, which knows the refresh response shape. Avoids an import cycle. */
export function registerRefresher(fn: Refresher): void {
  refresher = fn;
}

export function refreshAccessToken(assignmentId?: string): Promise<void> {
  if (!refresher) return Promise.reject(new ApiError(0, "refresh_unavailable", "Sign-in is not set up."));
  refreshing ??= refresher(assignmentId).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * A refresh that fails with one of these cannot be fixed from here, so the person goes to sign-in. Sign-in picks a
 * role for them and returns the full list, which is how a person with several roles gets their picker back
 * (`staff_context_required` names how many roles there are, not which).
 */
const SESSION_ENDED = new Set(["refresh_token_missing", "refresh_token_invalid", "staff_context_required"]);
/** A 401 with one of these codes means the access token is missing or unusable: refresh once, then retry. */
const TOKEN_UNUSABLE = new Set([
  "expired_token",
  "authentication_required",
  "malformed_bearer_token",
  "invalid_token",
  "unsupported_token",
]);

async function refreshOrEndSession(): Promise<void> {
  try {
    await refreshAccessToken();
  } catch (error) {
    if (error instanceof ApiError && SESSION_ENDED.has(error.code)) onSessionLost?.();
    throw error;
  }
}

/** An authenticated call: a missing token is refreshed first, and an unusable one (401) is refreshed once and retried. */
async function call<T>(path: string, options: RequestOptions): Promise<Envelope<T>> {
  if (options.auth === false) return send<T>(path, options);
  if (!accessToken) await refreshOrEndSession();
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && TOKEN_UNUSABLE.has(error.code)) {
      await refreshOrEndSession();
      return send<T>(path, options);
    }
    throw error;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await call<T>(path, options)).data;
}

/** A list call: the rows and the paging `meta` (`count` is the total across all pages). */
export async function apiList<T>(path: string, options: RequestOptions = {}): Promise<{ data: T[]; meta: ListMeta }> {
  const { data, meta } = await call<T[]>(path, options);
  return { data, meta: meta ?? { count: data.length, page: 1, pageSize: data.length } };
}

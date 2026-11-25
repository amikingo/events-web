/**
 * Staff authentication.
 *
 *   POST /v1/auth/staff/login               { mobile | email, password, platform, device_name }
 *   POST /v1/auth/staff/refresh             { assignment_id? }   (refresh cookie, no Bearer)
 *   POST /v1/auth/staff/logout              (refresh cookie, no Bearer)
 *   GET  /v1/auth/staff/me                  permissions + navigation for the role in use
 *   POST /v1/auth/staff/switch-assignment   { assignment_id }
 *
 * The access token goes to the API client's memory (`announceSession`), never to storage.
 */
import { ApiError, announceSession, apiRequest, registerRefresher, terminateSession } from "@/lib/api-client";
import { parseStaffSession, parseStaffToken } from "@/lib/auth-token";
import type { StaffSession, StaffToken } from "@/lib/auth-token";

/**
 * The current assignment id is not a secret. It is kept in localStorage so a refresh after a page reload can send it;
 * otherwise a person with several roles gets `409 staff_context_required`.
 */
const ASSIGNMENT_KEY = "assignmentId";

function rememberedAssignment(): string | null {
  try {
    return window.localStorage.getItem(ASSIGNMENT_KEY);
  } catch {
    return null;
  }
}

function rememberAssignment(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ASSIGNMENT_KEY, id);
    else window.localStorage.removeItem(ASSIGNMENT_KEY);
  } catch {
    // Storage can be unavailable (private mode). Refresh still works; several-role users may be asked to pick again.
  }
}

function keep(raw: unknown): StaffToken {
  const session = parseStaffToken(raw);
  rememberAssignment(session.assignment.id);
  announceSession(session);
  return session;
}

/** Send exactly one of `mobile` (`09…` or `+251…`) or `email`. */
export async function loginStaff(identifier: { mobile: string } | { email: string }, password: string): Promise<StaffToken> {
  return keep(
    await apiRequest<unknown>("/v1/auth/staff/login", {
      method: "POST",
      body: { ...identifier, password, platform: "web", device_name: "Web browser" },
    }),
  );
}

/** Uses the remembered role unless one is given. Terminal failures end the session in the API client. */
export async function refreshStaff(assignmentId?: string): Promise<StaffToken> {
  const id = assignmentId ?? rememberedAssignment();
  try {
    return keep(await apiRequest<unknown>("/v1/auth/staff/refresh", { method: "POST", body: id ? { assignment_id: id } : {} }));
  } catch (error) {
    // The session is over, or the remembered role is gone: forget it so the next sign-in starts clean.
    if (error instanceof ApiError && ["refresh_token_missing", "refresh_token_invalid", "staff_assignment_not_found"].includes(error.code)) {
      rememberAssignment(null);
    }
    throw error;
  }
}

/** Best effort on the server; here the person is always signed out afterwards. */
export async function logoutStaff(): Promise<void> {
  rememberAssignment(null);
  try {
    await apiRequest<{ revoked: boolean }>("/v1/auth/staff/logout", { method: "POST" });
  } catch {
    // The refresh cookie expires on its own; nothing for the person to do.
  } finally {
    terminateSession("signed_out");
  }
}

/** Effective permissions and the navigation tree for the role in use. */
export async function getStaffSession(signal?: AbortSignal): Promise<StaffSession> {
  return parseStaffSession(await apiRequest<unknown>("/v1/auth/staff/me", { signal }));
}

export async function switchStaffAssignment(assignmentId: string): Promise<StaffToken> {
  return keep(await apiRequest<unknown>("/v1/auth/staff/switch-assignment", { method: "POST", body: { assignment_id: assignmentId } }));
}

registerRefresher((assignmentId) => refreshStaff(assignmentId));

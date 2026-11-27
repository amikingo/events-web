/**
 * Staff authentication.
 *
 *   POST /v1/auth/staff/login               { mobile | email, password, platform, device_name }
 *   POST /v1/auth/staff/refresh             { assignment_id? }   (refresh cookie, no Bearer)
 *   POST /v1/auth/staff/logout              (refresh cookie, no Bearer)
 *   GET  /v1/auth/staff/me                  permissions + navigation for the role in use
 *   POST /v1/auth/staff/switch-assignment   { assignment_id }
 *   PUT  /v1/auth/staff/profile             { firstname, middlename?, lastname }   your own names (new token back)
 *   PUT  /v1/auth/staff/password            { old_password, new_password }
 *   POST /v1/auth/staff/forgot-password     { mobile }                              no login; always "sent"
 *   POST /v1/auth/staff/reset-password      { mobile, otp, new_password }           no login
 *
 * The access token goes to the API client's memory (`announceSession`), never to storage.
 */
import { ApiError, announceSession, apiRequest, currentSession, refreshAccessToken, registerRefresher, terminateSession } from "@/lib/api-client";
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

/**
 * Phase 10: your own names. The reply carries a new access token (the token holds the names the header shows): it
 * replaces the one in memory, so the header updates at once. `changed: false` means nothing was different.
 */
export async function updateOwnStaffProfile(input: { firstname: string; middlename: string; lastname: string }): Promise<{ changed: boolean }> {
  const reply = await apiRequest<{
    profile: { firstname: string | null; middlename: string | null; lastname: string | null };
    changed: boolean;
    access_token: string;
    expires_in: number;
  }>("/v1/auth/staff/profile", { method: "PUT", body: input });
  const session = currentSession();
  if (session) {
    announceSession({
      ...session,
      accessToken: reply.access_token,
      expiresIn: reply.expires_in,
      user: { ...session.user, firstname: reply.profile.firstname, middlename: reply.profile.middlename, lastname: reply.profile.lastname },
    });
  } else {
    // No session in memory (shouldn't happen once signed in): a refresh brings the new names.
    await refreshAccessToken().catch(() => undefined);
  }
  return { changed: reply.changed };
}

/** Phase 10: a wrong current password is 400 with issue `wrong_password` on `body.old_password`; you stay signed in. */
export function changeStaffPassword(oldPassword: string, newPassword: string): Promise<{ updated: true }> {
  return apiRequest("/v1/auth/staff/password", { method: "PUT", body: { old_password: oldPassword, new_password: newPassword } });
}

/** Phase 10: always 200 with the API's `message`, whether or not the mobile has staff access. */
export function requestStaffPasswordReset(mobile: string): Promise<{ sent: true; message: string }> {
  return apiRequest("/v1/auth/staff/forgot-password", { method: "POST", body: { mobile } });
}

/** Phase 10: 400 `invalid_code` for a wrong or expired code. */
export function resetStaffPassword(mobile: string, otp: string, newPassword: string): Promise<{ reset: true }> {
  return apiRequest("/v1/auth/staff/reset-password", { method: "POST", body: { mobile, otp, new_password: newPassword } });
}

registerRefresher((assignmentId) => refreshStaff(assignmentId));

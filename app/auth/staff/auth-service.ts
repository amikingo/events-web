import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { staffSession } from "@/app/auth/staff/staff-store";
import { loginStaff, logoutStaff } from "@/lib/api/auth";
import { onSessionTerminated } from "@/lib/api-client";
import type { StaffToken } from "@/lib/auth-token";
import type { Role, User } from "@/types";

/**
 * Which accounts are staff (password sign-in) rather than attendees (code sign-in). Simulated: a work domain or a
 * listed address. A real backend answers this from the account record; keep `isStaffEmail` as the one place to ask.
 */
const STAFF_DOMAINS = ["cheche.com", "cheche.et"];
const STAFF_EMAILS = ["admin@example.com"];

export function isStaffEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return STAFF_EMAILS.includes(e) || STAFF_DOMAINS.includes(domain);
}

const ROLES: readonly Role[] = ["Super Admin", "Org Admin", "Admin", "Manager", "Staff", "Auditor"];

/** The API answers with a profile and a role assignment; the screens expect the `User` shape. */
function toUser({ user, assignment }: StaffToken): User {
  const name = [user.firstname, user.middlename, user.lastname].filter(Boolean).join(" ") || user.mobile || "Team member";
  return {
    id: user.id,
    name,
    email: "",
    initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CH",
    role: ROLES.find((r) => r === assignment.role.name) ?? "Staff",
    status: "active",
    department: assignment.branch?.name ?? assignment.role.name,
    organizationId: assignment.organization?.id ?? "",
    organizationName: assignment.organization?.name ?? "Cheche",
    phone: user.mobile ?? "",
    lastLogin: "Just now",
    createdAt: "",
  };
}

/** Forget the person everywhere: the cached profile. (Server data lives in TanStack Query; the auth context clears it.) */
function endSession(): void {
  staffSession.set(null);
}

class AuthService {
  getCurrentUser(): User | null {
    return staffSession.get();
  }

  /**
   * Signs in with events-api (`POST /v1/auth/staff/login`). A string is a mobile number (`09…` or `+251…`).
   * Throws `ApiError`: switch on `error.code`, never on its message. The access token stays in the API client's
   * memory; only the profile below is kept, for the header and the sign-in page.
   */
  async login(identifier: string | { mobile: string } | { email: string }, password: string): Promise<User> {
    const session = await loginStaff(typeof identifier === "string" ? { mobile: identifier } : identifier, password);
    const user = toUser(session);

    // One session at a time: signing in as staff signs any attendee out.
    attendeeAuth.signOut();
    staffSession.set(user);
    return user;
  }

  /** Signs out on the server (best effort). The API client then ends the session, which runs `endSession`. */
  async logout(): Promise<void> {
    await logoutStaff();
  }

  /** After a role switch: the cached profile follows the new role. (The auth context clears the old role's data.) */
  rememberProfileFrom(session: StaffToken | null): void {
    if (session) staffSession.set(toUser(session));
  }

  /** The session ended (sign-out, or a refresh refused for good). */
  forgetProfile(): void {
    endSession();
  }
}

export const authService = new AuthService();

// However the session ends (sign-out, or a refresh refused for good), the profile and data go with it, also on
// pages outside the signed-in app (the sign-in page, the visitor site's header).
onSessionTerminated(endSession);


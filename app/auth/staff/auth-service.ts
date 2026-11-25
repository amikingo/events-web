import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { staffSession } from "@/app/auth/staff/staff-store";
import { loginStaff, logoutStaff, switchStaffAssignment } from "@/lib/api/auth";
import { setSessionLostHandler } from "@/lib/api/client";
import { clearSessionRoles } from "@/lib/api/session-store";
import { branchesService } from "@/lib/services/branches-service";
import { organizationsService } from "@/lib/services/organizations-service";
import { loadPermissions, resetPermissions } from "@/lib/services/permissions-service";
import type { StaffToken } from "@/lib/api/auth";
import type { Role, User } from "@/types";

const DEMO_USER: User = {
  id: "usr_01",
  name: "Abebe Bikila",
  email: "admin@cheche.com",
  initials: "AB",
  role: "Admin",
  status: "active",
  department: "Executive Management",
  organizationId: "ORG-101",
  organizationName: "Example Company",
  phone: "+251 911 204 412",
  lastLogin: "Just now",
  createdAt: "2026-01-01",
};

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

/** Forget the person everywhere: the cached profile, what their role may do, and the data loaded for them. */
function endSession(): void {
  staffSession.set(null);
  clearSessionRoles();
  resetPermissions();
  branchesService.reset();
  organizationsService.reset();
}

class AuthService {
  getCurrentUser(): User | null {
    return staffSession.get();
  }

  /**
   * Signs in with events-api (`POST /v1/auth/staff/login`). `mobile` can be `09…` or `+251…`.
   * Throws `ApiError`: switch on `error.code`, never on its message. The access token stays in memory
   * (`lib/api/client.ts`); only the profile below is kept for the UI.
   */
  async login(mobile: string, password: string): Promise<User> {
    const session = await loginStaff(mobile, password);
    const user = toUser(session);

    // One session at a time: signing in as staff signs any attendee out.
    attendeeAuth.signOut();
    staffSession.set(user);
    return user;
  }

  /**
   * Changes which of the person's roles they are using (`POST /v1/auth/staff/switch-assignment`). The new role has
   * its own organization and permissions, so everything loaded for the old one is dropped and `/me` is read again.
   * Throws `ApiError`.
   */
  async switchAssignment(assignmentId: string): Promise<User> {
    const session = await switchStaffAssignment(assignmentId);
    const user = toUser(session);
    staffSession.set(user);
    resetPermissions();
    branchesService.reset();
    organizationsService.reset();
    void loadPermissions({ force: true });
    return user;
  }

  async logout(): Promise<void> {
    try {
      await logoutStaff();
    } finally {
      endSession();
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const current = this.getCurrentUser() || DEMO_USER;
    const updated: User = { ...current, ...updates };

    if (updates.name) {
      updated.initials = updates.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || updated.initials;
    }

    staffSession.set(updated);
    return updated;
  }

  async changePassword(_oldPassword: string, _newPassword: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }
}

export const authService = new AuthService();

// A refresh that fails for good (`refresh_token_missing` / `refresh_token_invalid`) ends the session everywhere.
setSessionLostHandler(endSession);


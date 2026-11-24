import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { staffSession } from "@/app/auth/staff/staff-store";
import type { User } from "@/types";

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

class AuthService {
  getCurrentUser(): User | null {
    return staffSession.get();
  }

  /** Simulated: any password is accepted once it is not empty. A real backend checks it and answers with the account. */
  async login(email: string, password: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!password) throw new Error("A password is required.");

    const name = email
      .split("@")[0]!
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CH";

    const user: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: email === DEMO_USER.email ? DEMO_USER.name : name,
      email,
      initials,
      role: email.includes("admin") ? "Admin" : "Staff",
      status: "active",
      department: "Enterprise Operations",
      organizationId: "ORG-101",
      organizationName: "Example Company",
      phone: "+251 911 204 412",
      lastLogin: "Just now",
      createdAt: "2026-01-01",
    };

    // One session at a time: signing in as staff signs any attendee out.
    attendeeAuth.signOut();
    staffSession.set(user);
    return user;
  }

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    staffSession.set(null);
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


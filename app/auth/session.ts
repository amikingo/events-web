"use client";

import { attendeeAuth, useAttendee } from "@/app/auth/attendee/attendee-auth-service";
import { staffSession } from "@/app/auth/staff/staff-store";
import { useStorageStore } from "@/lib/marketplace/storage-store";
import type { AttendeeAccount } from "@/types/marketplace";
import type { User } from "@/types";

/**
 * The one signed-in person, whoever they are. Staff and attendees sign in at /auth; only one of them can be signed
 * in at a time. Read this instead of the two services when you only need to know who is signed in and where they
 * belong.
 */
interface Common {
  name: string;
  email: string;
  initials: string;
  /** Where this person lands after signing in. */
  home: "/admin" | "/my-tickets";
}
export type Session =
  | (Common & { kind: "staff"; role: User["role"]; user: User })
  | (Common & { kind: "attendee"; role: "Attendee"; account: AttendeeAccount });

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "G";
}

/** The signed-in person: `undefined` while hydrating, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const staff = useStorageStore(staffSession);
  const account = useAttendee();
  if (staff === undefined || account === undefined) return undefined;
  if (staff) return { kind: "staff", role: staff.role, user: staff, name: staff.name, email: staff.email, initials: staff.initials, home: "/admin" };
  if (account) return { kind: "attendee", role: "Attendee", account, name: account.name, email: account.email, initials: initialsOf(account.name), home: "/my-tickets" };
  return null;
}

/** Signs out whoever is signed in. */
export function signOut(): void {
  staffSession.set(null);
  attendeeAuth.signOut();
}

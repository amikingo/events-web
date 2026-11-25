"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  currentGuestSession,
  currentSession,
  onGuestSessionTerminated,
  onGuestTokenRefreshed,
  refreshGuestAccessToken,
  terminateGuestSession,
  terminateSession,
} from "@/lib/api-client";
import type { CustomerProfile } from "@/lib/api-client";
import { logoutStaff } from "@/lib/api/auth";
import {
  confirmCustomerSignUp,
  customerFullName,
  getCurrentCustomer,
  loginCustomerWithCode,
  loginCustomerWithPassword,
  logoutCustomer,
  resendCustomerSignUpCode,
  sendCustomerCode,
  signUpCustomer,
} from "@/lib/api/customer";
import { staffSession } from "@/app/auth/staff/staff-store";

/**
 * Real guest authentication (Phase 6): backed by `/v1/auth/customer/*` in `events-api`.
 * Access tokens stay in `lib/api-client.ts` memory only, refresh tokens live only in HttpOnly cookies, and nothing
 * about guest accounts or codes is saved in `localStorage` or `sessionStorage`.
 */

type GuestSnapshot = CustomerProfile | null | undefined;

let snapshot: GuestSnapshot = undefined;
let bootstrapPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
let hooksInstalled = false;

function emit() {
  listeners.forEach((l) => l());
}

function clearAnyStaffSession() {
  if (!staffSession.get() && !currentSession()) return;
  staffSession.set(null);
  void logoutStaff().catch(() => {
    terminateSession("signed_out");
  });
}

function installHooks() {
  if (hooksInstalled || typeof window === "undefined") return;
  hooksInstalled = true;

  onGuestTokenRefreshed((session) => {
    // One session at a time: signing in as a guest signs any staff member out.
    clearAnyStaffSession();
    snapshot = session.user;
    emit();
  });

  onGuestSessionTerminated(() => {
    snapshot = null;
    emit();
  });
}

async function ensureGuestSessionLoaded(): Promise<void> {
  installHooks();
  if (snapshot !== undefined) return;
  if (staffSession.get() || currentSession()) {
    snapshot = null;
    emit();
    return;
  }
  const active = currentGuestSession();
  if (active) {
    snapshot = active.user;
    emit();
    return;
  }
  if (!bootstrapPromise) {
    bootstrapPromise = refreshGuestAccessToken()
      .then((session) => {
        snapshot = session.user;
      })
      .catch(() => {
        snapshot = null;
      })
      .finally(() => {
        bootstrapPromise = null;
        emit();
      });
  }
  return bootstrapPromise;
}

function subscribe(listener: () => void) {
  installHooks();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot(): GuestSnapshot {
  installHooks();
  const active = currentGuestSession();
  if (active) return active.user;
  return snapshot;
}

const getServerSnapshot = (): GuestSnapshot => undefined;

export const attendeeAuth = {
  currentAccount(): CustomerProfile | null {
    return currentGuestSession()?.user ?? (snapshot ?? null);
  },

  async signUp(input: { first_name: string; last_name: string; mobile: string; password: string }): Promise<{ mobile: string }> {
    return signUpCustomer(input);
  },

  async confirmSignUp(input: { mobile: string; otp: string; password: string }): Promise<CustomerProfile> {
    const session = await confirmCustomerSignUp(input);
    return session.user;
  },

  async requestCode(mobile: string): Promise<{ mobile: string }> {
    return sendCustomerCode(mobile);
  },

  async resendCode(mobile: string): Promise<{ mobile: string }> {
    return resendCustomerSignUpCode(mobile);
  },

  async loginWithCode(mobile: string, otp: string): Promise<CustomerProfile> {
    const session = await loginCustomerWithCode({ mobile, otp });
    return session.user;
  },

  async loginWithPassword(mobile: string, password: string): Promise<CustomerProfile> {
    const session = await loginCustomerWithPassword({ mobile, password });
    return session.user;
  },

  async getMe(signal?: AbortSignal): Promise<CustomerProfile> {
    const profile = await getCurrentCustomer(signal);
    snapshot = profile;
    emit();
    return profile;
  },

  async signOut(): Promise<void> {
    snapshot = null;
    terminateGuestSession("signed_out");
    emit();
    try {
      await logoutCustomer();
    } catch {
      terminateGuestSession("signed_out");
    }
  },
};

export { customerFullName };

/** The signed-in guest: `undefined` while hydrating, `null` when signed out. */
export function useAttendee(): CustomerProfile | null | undefined {
  const account = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    void ensureGuestSessionLoaded();
  }, []);

  return account;
}

"use client";

import { DEMO, HOLD_MINUTES } from "@/lib/marketplace/config";
import { createStorageStore, useStorageStore } from "@/lib/marketplace/storage-store";
import { phoneDigits } from "@/lib/marketplace/validation";
import { staffSession } from "@/app/auth/staff/staff-store";
import type { AttendeeAccount, CityId, NotificationPreferences } from "@/types/marketplace";

/**
 * Simulated attendee authentication: phone or email plus a one-time code. Nothing leaves the browser and no SMS is
 * sent — the code is always `DEMO.code`. A real backend must issue and verify codes, rate-limit attempts and hold the
 * session in an HTTP-only cookie; keep these method names when connecting it.
 */

export type Channel = "sms" | "email";
export type ChallengePurpose = "sign-in" | "sign-up" | "checkout";

export interface PendingProfile {
  name: string;
  email: string;
  phone: string;
}

export interface Challenge {
  id: string;
  channel: Channel;
  /** Nine phone digits or a lower-cased email. */
  target: string;
  purpose: ChallengePurpose;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  /** Sign-up: the details to create the account with once the code checks out. */
  profile?: PendingProfile;
  /** Where to go after signing in. */
  next?: string;
}

interface AuthState {
  accounts: AttendeeAccount[];
  sessionAccountId: string | null;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = { ticketUpdates: true, eventReminders: true, recommendations: false, smsAlerts: true };

const DEMO_ACCOUNT: AttendeeAccount = {
  id: DEMO.accountId,
  name: "Hana Bekele",
  email: "hana.bekele@example.com",
  phone: DEMO.phone,
  cityId: "addis-ababa",
  createdAt: "2026-02-14T10:00:00+03:00",
  preferences: DEFAULT_PREFERENCES,
};

const MAX_ATTEMPTS = 5;
const EMPTY: AuthState = { accounts: [], sessionAccountId: null };

const authStore = createStorageStore<AuthState>("cheche-events.auth.v1", EMPTY, "local");
const challengeStore = createStorageStore<Challenge | null>("cheche-events.challenge.v1", null, "session");

function accountsWithDemo(state: AuthState): AttendeeAccount[] {
  return state.accounts.some((a) => a.id === DEMO_ACCOUNT.id) ? state.accounts : [DEMO_ACCOUNT, ...state.accounts];
}

function normalizeTarget(channel: Channel, value: string): string {
  return channel === "sms" ? phoneDigits(value) : value.trim().toLowerCase();
}

function findAccount(channel: Channel, target: string): AttendeeAccount | undefined {
  const list = accountsWithDemo(authStore.get());
  return list.find((a) => (channel === "sms" ? a.phone === target : a.email.toLowerCase() === target));
}

function randomId(prefix: string): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10)}`;
}

function persistAccount(account: AttendeeAccount, signIn: boolean) {
  // One session at a time: signing in as an attendee signs any staff member out.
  if (signIn && staffSession.get()) staffSession.set(null);
  authStore.update((s) => {
    const others = accountsWithDemo(s).filter((a) => a.id !== account.id);
    return { accounts: [...others, account], sessionAccountId: signIn ? account.id : s.sessionAccountId };
  });
}

export type VerifyResult =
  | { ok: true; account: AttendeeAccount | null; challenge: Challenge }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "locked" | "expired" | "missing" };

export const attendeeAuth = {
  store: authStore,
  challenges: challengeStore,

  currentAccount(state: AuthState | undefined = authStore.get()): AttendeeAccount | null {
    if (!state?.sessionAccountId) return null;
    return accountsWithDemo(state).find((a) => a.id === state.sessionAccountId) ?? null;
  },

  hasAccount(channel: Channel, value: string): boolean {
    return Boolean(findAccount(channel, normalizeTarget(channel, value)));
  },

  /** Starts a code challenge. Simulated: no message is sent; the demo code always works. */
  async requestCode(input: { channel: Channel; value: string; purpose: ChallengePurpose; profile?: PendingProfile; next?: string }): Promise<Challenge> {
    await new Promise((r) => setTimeout(r, 600));
    const now = Date.now();
    const challenge: Challenge = {
      id: randomId("otp"),
      channel: input.channel,
      target: normalizeTarget(input.channel, input.value),
      purpose: input.purpose,
      createdAt: now,
      expiresAt: now + HOLD_MINUTES * 60_000,
      attempts: 0,
      profile: input.profile,
      next: input.next,
    };
    challengeStore.set(challenge);
    return challenge;
  },

  /** Restarts the expiry and attempt count, as a resend would. */
  async resendCode(): Promise<void> {
    await new Promise((r) => setTimeout(r, 400));
    const c = challengeStore.get();
    if (c) challengeStore.set({ ...c, attempts: 0, createdAt: Date.now(), expiresAt: Date.now() + HOLD_MINUTES * 60_000 });
  },

  async verifyCode(code: string): Promise<VerifyResult> {
    await new Promise((r) => setTimeout(r, 700));
    const c = challengeStore.get();
    if (!c) return { ok: false, reason: "missing" };
    if (Date.now() > c.expiresAt) return { ok: false, reason: "expired" };
    if (c.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };
    if (code !== DEMO.code) {
      const attempts = c.attempts + 1;
      challengeStore.set({ ...c, attempts });
      if (attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };
      return { ok: false, reason: "invalid", attemptsLeft: MAX_ATTEMPTS - attempts };
    }
    return { ok: true, account: findAccount(c.channel, c.target) ?? null, challenge: c };
  },

  /** After a verified code: sign in to the existing account, or create one from the given details. */
  completeVerification(challenge: Challenge, profile?: PendingProfile): AttendeeAccount {
    const existing = findAccount(challenge.channel, challenge.target);
    if (existing) {
      persistAccount(existing, true);
      challengeStore.set(null);
      return existing;
    }
    const p = profile ?? challenge.profile;
    const account: AttendeeAccount = {
      id: randomId("att"),
      name: p?.name.trim() || "Guest",
      email: (challenge.channel === "email" ? challenge.target : p?.email.trim().toLowerCase()) ?? "",
      phone: challenge.channel === "sms" ? challenge.target : phoneDigits(p?.phone ?? ""),
      cityId: "addis-ababa",
      createdAt: new Date().toISOString(),
      preferences: DEFAULT_PREFERENCES,
    };
    persistAccount(account, true);
    challengeStore.set(null);
    return account;
  },

  /** Checkout: a verified phone signs the buyer in (existing account) or creates a light account from the order details. */
  signInWithVerifiedPhone(profile: PendingProfile): AttendeeAccount {
    const phone = phoneDigits(profile.phone);
    const existing = findAccount("sms", phone);
    if (existing) {
      persistAccount(existing, true);
      return existing;
    }
    const account: AttendeeAccount = {
      id: randomId("att"),
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      phone,
      cityId: "addis-ababa",
      createdAt: new Date().toISOString(),
      preferences: DEFAULT_PREFERENCES,
    };
    persistAccount(account, true);
    return account;
  },

  async updateAccount(patch: Partial<Pick<AttendeeAccount, "name" | "email" | "phone" | "cityId" | "preferences">>): Promise<AttendeeAccount | null> {
    await new Promise((r) => setTimeout(r, 500));
    const current = attendeeAuth.currentAccount();
    if (!current) return null;
    const next: AttendeeAccount = { ...current, ...patch, phone: patch.phone ? phoneDigits(patch.phone) : current.phone };
    persistAccount(next, true);
    return next;
  },

  signOut() {
    authStore.update((s) => ({ ...s, sessionAccountId: null }));
  },
};

/** The signed-in attendee: `undefined` while hydrating, `null` when signed out. */
export function useAttendee(): AttendeeAccount | null | undefined {
  const state = useStorageStore(authStore);
  return state === undefined ? undefined : attendeeAuth.currentAccount(state);
}

export function useChallenge(): Challenge | null | undefined {
  return useStorageStore(challengeStore);
}

export type { CityId };

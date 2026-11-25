"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { authService } from "@/app/auth/staff/auth-service";
import { switchStaffAssignment } from "@/lib/api/auth";
import { currentSession, isTerminalAuthError, onSessionTerminated, onTokenRefreshed, refreshAccessToken } from "@/lib/api-client";
import type { StaffAssignment, StaffProfile, StaffToken } from "@/lib/auth-token";

/**
 * The staff session for the signed-in app: who is signed in, the role in use, the roles they hold, and the actions
 * on it. The access token itself stays inside the API client (memory only); this context never stores it.
 */
export type AuthStatus = "loading" | "authenticated" | "unavailable" | "signed-out";

interface AuthContextValue {
  status: AuthStatus;
  user: StaffProfile | null;
  /** The role in use. Permissions, navigation and data all follow it. */
  assignment: StaffAssignment | null;
  assignments: StaffAssignment[];
  login: (identifier: { mobile: string } | { email: string }, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-issues the token for another role and drops everything cached for the old one. */
  switchRole: (assignmentId: string) => Promise<void>;
  /** After `unavailable` (the server couldn't be reached on start): try again. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Refresh this long before the token expires, so a request never meets an expired token. */
const REFRESH_EARLY_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 10_000;

/** "Selam Events · Owner", or "Platform · Super Admin" for a role that belongs to no organization. */
export function describeAssignment(a: StaffAssignment): string {
  const where = a.organization?.name ?? "Platform";
  return a.branch ? `${where} · ${a.role.name} · ${a.branch.name}` : `${where} · ${a.role.name}`;
}

function withoutToken(session: StaffToken | null): Omit<StaffToken, "accessToken"> | null {
  if (!session) return null;
  const { accessToken: _token, ...rest } = session;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // A session sign-in just made is already in the API client: start from it. After a reload there is none yet.
  const [session, setSession] = useState<Omit<StaffToken, "accessToken"> | null>(() => withoutToken(currentSession()));
  const [status, setStatus] = useState<AuthStatus>(() => (currentSession() ? "authenticated" : "loading"));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Every login, refresh and switch: keep the session and schedule the next refresh before the token expires.
  useEffect(() => {
    const unsubscribeRefreshed = onTokenRefreshed((next) => {
      setSession(withoutToken(next));
      setStatus("authenticated");
      if (timer.current) clearTimeout(timer.current);
      const delay = Math.max(MIN_REFRESH_DELAY_MS, next.expiresIn * 1000 - REFRESH_EARLY_MS);
      timer.current = setTimeout(() => {
        // A terminal failure ends the session through onSessionTerminated; anything else retries on the next request.
        refreshAccessToken().catch(() => undefined);
      }, delay);
    });
    const unsubscribeTerminated = onSessionTerminated(() => {
      if (timer.current) clearTimeout(timer.current);
      setSession(null);
      setStatus("signed-out");
      queryClient.clear();
      authService.forgetProfile();
      router.replace("/auth");
    });
    return () => {
      unsubscribeRefreshed();
      unsubscribeTerminated();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [queryClient, router]);

  // After a reload the token is gone: get one from the refresh cookie.
  useEffect(() => {
    if (currentSession()) return;
    refreshAccessToken().catch((error) => {
      // A terminal code already ended the session (and redirected). Anything else: the server couldn't answer.
      if (!isTerminalAuthError(error)) setStatus("unavailable");
    });
  }, [attempt]);

  const login = useCallback(async (identifier: { mobile: string } | { email: string }, password: string) => {
    await authService.login(identifier, password);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const switchRole = useCallback(
    async (assignmentId: string) => {
      await switchStaffAssignment(assignmentId);
      // Everything cached belonged to the old role (its organization, its permissions).
      queryClient.clear();
      authService.rememberProfileFrom(currentSession());
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      assignment: session?.assignment ?? null,
      assignments: session?.assignments ?? [],
      login,
      logout,
      switchRole,
      retry: () => {
        setStatus("loading");
        setAttempt((n) => n + 1);
      },
    }),
    [status, session, login, logout, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}

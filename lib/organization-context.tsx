"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { listAllOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/lib/api/organizations";
import { useAuth } from "@/lib/auth-context";
import { organizationQk } from "@/lib/query-keys";

/**
 * The organization the signed-in person works in.
 *
 * - Staff of an organization work in their own; it comes with their role.
 * - A platform role belongs to no organization. The API lets a platform Super Admin act in any organization
 *   (`super_admin_bypass`), so the person picks one here. The pick is kept on this device; with exactly one
 *   organization it is picked for them.
 */
interface OrganizationContextValue {
  organizationId: string | null;
  branchId: string | null;
  /** false (most organizers): hide every branch screen, picker and column. */
  hasBranches: boolean;
  /** True until the session (and, for a platform role, the organization list) is known. */
  loading: boolean;
  /** The role in use belongs to no organization. */
  isPlatform: boolean;
  /** Platform roles only: the organizations to choose from. */
  choices: Organization[];
  /** Platform roles only. */
  selectOrganization: (organizationId: string) => void;
  /** Platform roles only: work in no organization. Stays cleared, even when there is just one to choose from. */
  clearOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

/** Not a secret: which organization a platform admin last worked in, on this device. */
const PICK_KEY = "platformOrganizationId";
/** Stored when the person chose "No organization", so a lone organization is not picked for them again. */
const NONE = "none";
const pickListeners = new Set<() => void>();

function readPick(): string | null {
  try {
    return window.localStorage.getItem(PICK_KEY);
  } catch {
    return null;
  }
}

function writePick(id: string): void {
  try {
    window.localStorage.setItem(PICK_KEY, id);
  } catch {
    // Storage unavailable (private mode): the pick lasts until the page reloads.
  }
  pickListeners.forEach((l) => l());
}

const subscribePick = (listener: () => void) => {
  pickListeners.add(listener);
  return () => {
    pickListeners.delete(listener);
  };
};

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { assignment, status } = useAuth();
  const isPlatform = status === "authenticated" && assignment !== null && assignment.organizationId === null;

  const organizations = useQuery({
    queryKey: organizationQk.options(),
    queryFn: ({ signal }) => listAllOrganizations(signal),
    enabled: isPlatform,
  });
  const picked = useSyncExternalStore(subscribePick, readPick, () => null);
  const selectOrganization = useCallback((id: string) => writePick(id), []);
  const clearOrganization = useCallback(() => writePick(NONE), []);

  const value = useMemo<OrganizationContextValue>(() => {
    if (!isPlatform) {
      return {
        organizationId: assignment?.organizationId ?? null,
        branchId: assignment?.branchId ?? null,
        hasBranches: assignment?.organization?.hasBranches ?? false,
        loading: status === "loading",
        isPlatform: false,
        choices: [],
        selectOrganization,
        clearOrganization,
      };
    }
    const choices = organizations.data ?? [];
    const chosen = picked === NONE ? undefined : (choices.find((o) => o.id === picked) ?? (choices.length === 1 ? choices[0] : undefined));
    return {
      organizationId: chosen?.id ?? null,
      branchId: null,
      hasBranches: chosen?.has_branches ?? false,
      loading: organizations.isPending,
      isPlatform: true,
      choices,
      selectOrganization,
      clearOrganization,
    };
  }, [isPlatform, assignment, status, organizations.data, organizations.isPending, picked, selectOrganization, clearOrganization]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const value = useContext(OrganizationContext);
  if (!value) throw new Error("useOrganization must be used inside <OrganizationProvider>.");
  return value;
}

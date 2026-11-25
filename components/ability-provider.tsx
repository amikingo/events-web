"use client";

import { AbilityProvider as CaslAbilityProvider, Can as CaslCan } from "@casl/react";
import type { CanProps } from "@casl/react";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useUserEffectiveAccess } from "@/hooks/use-user-effective-access";
import { useAuth } from "@/lib/auth-context";
import { ALWAYS_ALLOWED_PATHS, DEMO_PAGES_ENABLED } from "@/lib/config/demo-pages";
import { moduleForPath, normalizeModuleCode } from "@/lib/constants/modules";
import { buildAbility } from "@/lib/rbac/ability";
import type { AbilityAction, AppAbility } from "@/lib/rbac/ability";
import { buildModuleTree } from "@/lib/rbac/build-module-tree";
import type { ModuleTreeNode } from "@/lib/rbac/build-module-tree";

/**
 * Access for the role in use, from `/me` only. The frontend never guesses from role names: if `/me` didn't grant
 * it, it isn't there. While `/me` loads nothing is granted, so actions never flash and vanish.
 */
interface AccessContextValue {
  /** `/me` has answered. Before that, every check is false. */
  ready: boolean;
  /** `/me` failed; screens can say so instead of showing an empty app. */
  error: unknown;
  ability: AppAbility;
  canViewModule: (code: string) => boolean;
  /** Whether the route guard lets this path through. */
  canViewPath: (pathname: string) => boolean;
  /** Every module code the role may view. */
  allowedCodes: string[];
  /** The sidebar the backend built for this role, limited to screens this app has. */
  sidebarTree: ModuleTreeNode[];
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function AbilityProvider({ children }: { children: ReactNode }) {
  const { assignment } = useAuth();
  const query = useUserEffectiveAccess(assignment?.id);
  const access = query.data;
  const ability = useMemo(() => buildAbility(access), [access]);

  const canViewModule = useCallback((code: string) => ability.can("read", normalizeModuleCode(code)), [ability]);

  const canViewPath = useCallback(
    (pathname: string) => {
      if (ALWAYS_ALLOWED_PATHS.includes(pathname)) return true;
      const guardedBy = moduleForPath(pathname);
      if (guardedBy) return canViewModule(guardedBy);
      // No backend module owns it: a template demo page, open in development only.
      return DEMO_PAGES_ENABLED;
    },
    [canViewModule],
  );

  const value = useMemo<AccessContextValue>(
    () => ({
      ready: query.isSuccess,
      error: query.error,
      ability,
      canViewModule,
      canViewPath,
      allowedCodes: (access?.modules ?? []).filter((m) => m.actions.view).map((m) => m.code),
      sidebarTree: buildModuleTree(access?.navigation ?? [], canViewModule),
    }),
    [query.isSuccess, query.error, ability, canViewModule, canViewPath, access],
  );

  return (
    <CaslAbilityProvider value={ability}>
      <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
    </CaslAbilityProvider>
  );
}

export function useAccess(): AccessContextValue {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside <AbilityProvider>.");
  return value;
}

/**
 * `<Can I="create" a={MODULE_CODES.EVENTS}>…</Can>`: renders its children only when the role in use may do it.
 * Actions are CASL's (`read` for the backend's `view`); subjects are module codes.
 */
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode;

/** For checks in code (`if (can("update", MODULE_CODES.EVENTS))`) rather than in markup. */
export function useModuleAccess() {
  const { ability, ready, canViewModule } = useAccess();
  return {
    ready,
    hasModuleAccess: canViewModule,
    can: (action: AbilityAction, code: string) => ability.can(action, normalizeModuleCode(code)),
  };
}

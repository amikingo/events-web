"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccess } from "@/components/ability-provider";

export const FORBIDDEN_PATH = "/admin/forbidden";

/**
 * Sends the person to the forbidden page when the role in use may not view the current path. Waits for `/me`: until
 * it answers, nothing is decided (the guard shows a skeleton instead). Returns whether the page may render.
 */
export function useRoleGuard(): { allowed: boolean; checking: boolean } {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, error, canViewPath } = useAccess();
  const allowed = ready && canViewPath(pathname);

  useEffect(() => {
    if (ready && !canViewPath(pathname) && pathname !== FORBIDDEN_PATH) router.replace(FORBIDDEN_PATH);
  }, [ready, canViewPath, pathname, router]);

  return { allowed, checking: !ready && !error };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEffectiveAccess } from "@/lib/api/effective-access";
import { userQk } from "@/lib/query-keys";

/** `/me` for the role in use. Keyed by assignment, so a role switch never shows the old role's access. */
export function useUserEffectiveAccess(assignmentId: string | null | undefined) {
  return useQuery({
    queryKey: userQk.effectiveAccess(assignmentId),
    queryFn: ({ signal }) => fetchEffectiveAccess(signal),
    enabled: Boolean(assignmentId),
  });
}

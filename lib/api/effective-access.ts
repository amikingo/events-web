/**
 * Effective access for the role in use.
 *
 *   GET /v1/auth/staff/me   permissions (per module, per action) + navigation tree
 */
import { getStaffSession } from "@/lib/api/auth";
import { parseEffectiveAccess } from "@/lib/rbac/effective-access";
import type { EffectiveAccess } from "@/lib/rbac/effective-access";

export async function fetchEffectiveAccess(signal?: AbortSignal): Promise<EffectiveAccess> {
  return parseEffectiveAccess(await getStaffSession(signal));
}

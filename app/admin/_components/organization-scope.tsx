"use client";

import { useRouter } from "next/navigation";
import { useModuleAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon } from "@/components/ui/icons";
import { MODULE_CODES } from "@/lib/constants/modules";
import { useOrganization } from "@/lib/organization-context";

/**
 * The organization the role in use works in, from the session. `undefined` while the session loads; `null` for a
 * platform role, which belongs to no organization (events, clients and venues are always an organization's own).
 */
export function useOrganizationId(): string | null | undefined {
  const { organizationId, loading } = useOrganization();
  return loading ? undefined : organizationId;
}

/**
 * Shown on an organization's pages when no organization is chosen yet. Only a platform role gets here: it works in
 * any organization, picked in the switcher at the top.
 */
export function NoOrganization({ what }: { what: string }) {
  const router = useRouter();
  const { choices } = useOrganization();
  const { can } = useModuleAccess();
  if (choices.length === 0) {
    return (
      <EmptyState
        size="lg"
        icon={<BuildingIcon />}
        title="No organizations yet"
        description={`${what} belong to an organization. Create the first one to start.`}
        actions={
          can("create", MODULE_CODES.ORGANIZATIONS) ? <Button onClick={() => router.push("/admin/organizations/new")}>Create an organization</Button> : undefined
        }
      />
    );
  }
  return (
    <EmptyState
      size="lg"
      icon={<BuildingIcon />}
      title="Pick an organization"
      description={`${what} belong to an organization. Choose which one to work in with the switcher at the top.`}
    />
  );
}

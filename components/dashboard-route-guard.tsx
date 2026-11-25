"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { describeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth-context";

/** Renders the page only when the role in use may view it; `useRoleGuard` redirects otherwise. */
export function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const { status, retry } = useAuth();
  const { error } = useAccess();
  const { allowed, checking } = useRoleGuard();

  if (status === "unavailable") {
    return (
      <EmptyState
        size="lg"
        tone="warning"
        title="We can't reach the server"
        description="Your session is fine. Check the connection and try again."
        actions={<Button onClick={retry}>Try again</Button>}
      />
    );
  }
  if (error) {
    return <EmptyState size="lg" tone="danger" title="We couldn't load your access" description={describeApiError(error)} />;
  }
  if (checking || status === "loading" || !allowed) {
    return (
      <SkeletonStack>
        <Skeleton shape="title" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  return <>{children}</>;
}

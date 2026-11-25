"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccess } from "@/components/ability-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { DEMO_PAGES_ENABLED } from "@/lib/config/demo-pages";
import { flattenModuleTree } from "@/lib/rbac/build-module-tree";

/**
 * Where staff land after signing in: the first page the backend's menu gives their role. In development, a role
 * with no backend pages lands on the demo dashboard instead.
 */
export default function AdminHome() {
  const router = useRouter();
  const { ready, sidebarTree } = useAccess();
  const first = flattenModuleTree(sidebarTree)[0]?.href ?? (DEMO_PAGES_ENABLED ? "/admin/dashboard" : null);

  useEffect(() => {
    if (ready && first) router.replace(first);
  }, [ready, first, router]);

  if (ready && !first) {
    return <EmptyState size="lg" title="Nothing here for your role yet" description="Ask an admin to give your role access to a module." />;
  }
  return (
    <SkeletonStack>
      <Skeleton shape="title" />
      <Skeleton shape="block" />
    </SkeletonStack>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/icons";

export default function ForbiddenPage() {
  const router = useRouter();
  return (
    <EmptyState
      size="lg"
      tone="charcoal"
      icon={<ShieldIcon />}
      title="This page isn't part of your role"
      description="Ask an admin for access, or switch to another of your roles at the top."
      actions={<Button onClick={() => router.replace("/admin")}>Go to your start page</Button>}
    />
  );
}

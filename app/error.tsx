"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { AlertCircleIcon } from "../components/ui/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send unexpected client exceptions to your error reporting here.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-[480px]">
        <EmptyState
          size="lg"
          tone="danger"
          ring
          icon={<AlertCircleIcon />}
          title="Couldn’t load this page"
          description="Something broke on our side. Nothing you entered was lost."
          actions={
            <>
              <Button onClick={() => reset()}>Try again</Button>
              <Button asChild variant="secondary">
                <a href="/admin/dashboard">Back to dashboard</a>
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}

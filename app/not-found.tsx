import Link from "next/link";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { SearchIcon } from "../components/ui/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-[480px]">
        <EmptyState
          size="lg"
          tone="charcoal"
          ring
          icon={<SearchIcon />}
          title="Page not found"
          description="The link you followed may be broken or the page may have been moved."
          actions={
            <Link href="/admin/dashboard">
              <Button>Return to dashboard</Button>
            </Link>
          }
        />
      </div>
    </main>
  );
}


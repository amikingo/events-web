"use client";

import { Share2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { toast } from "@/components/ui/toaster";

/** Share this page: the phone's share sheet where there is one, otherwise the link is copied. */
export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { body: "Share it with anyone you'd like to bring." });
    } catch (error) {
      // Closing the share sheet isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't share the link", { body: "Copy it from the address bar instead." });
    }
  }
  return <IconButton icon={<Share2 />} aria-label="Share this event" onClick={() => void share()} />;
}

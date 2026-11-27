"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { getTicketDesign } from "@/lib/api/ticket-designs";
import { toLook } from "@/lib/ticket-design-share";
import { useTicketLook } from "@/lib/ticket-look";
import type { TicketLook } from "@/lib/ticket-look";

export const ticketDesignQk = (organizationId: string, eventId: string) => ["ticket-design", organizationId, eventId] as const;

/**
 * The server can't keep ticket designs for this person: it doesn't have the endpoint yet (older server), its database
 * isn't ready for it (5xx), or this role may not read events.
 */
const cannotShare = (error: unknown) => error instanceof ApiError && (error.status >= 500 || error.status === 403 || error.code === "route_not_found");

export interface EventTicketDesign {
  loading: boolean;
  /** True: designs are saved on the server and buyers see them. False: only in this browser. */
  shared: boolean;
  /** The design in force: the server's when it can keep one, else this browser's. null: none saved. */
  look: TicketLook | null;
  /** A design left in this browser, which buyers don't see. */
  browserLook: TicketLook | null;
  error: unknown;
  retry: () => void;
}

/** An event's ticket design for staff. */
export function useEventTicketDesign(organizationId: string, eventId: string): EventTicketDesign {
  const browserLook = useTicketLook(eventId);
  const query = useQuery({
    queryKey: ticketDesignQk(organizationId, eventId),
    queryFn: async ({ signal }) => {
      try {
        const design = await getTicketDesign(organizationId, eventId, signal);
        return { shared: true, look: design ? await toLook(design) : null };
      } catch (error) {
        if (cannotShare(error)) return { shared: false, look: null };
        throw error;
      }
    },
    retry: false,
    // The editor compares its changes with this: it mustn't change under the person's hands.
    refetchOnWindowFocus: false,
  });
  const shared = query.data?.shared ?? false;
  return {
    loading: query.isPending || browserLook === undefined,
    shared,
    look: shared ? (query.data?.look ?? null) : (browserLook ?? null),
    browserLook: browserLook ?? null,
    error: query.error,
    retry: () => void query.refetch(),
  };
}

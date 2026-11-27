"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { returnTicket } from "@/lib/api/registrations";
import { formatPrice, isFreePrice } from "@/lib/price";
import { orderQk, paymentCaseQk, personQk, registrationQk } from "@/lib/query-keys";

export interface ReturnTarget {
  id: string;
  code: string | null;
  name: string;
  price: { amount: string; currency: string };
}

/**
 * Returning one ticket (Phase 8): frees its place. A paid ticket opens a refund case under Payments; after it
 * succeeds the toast names the amount and opens that case. The API refuses a ticket already used at the door.
 */
export function ReturnTicketDialog({
  organizationId,
  eventId,
  target,
  onClose,
}: {
  organizationId: string;
  eventId: string;
  target: ReturnTarget | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const paid = target ? !isFreePrice(target.price.amount) : false;

  const run = useMutation({
    mutationFn: (t: ReturnTarget) => returnTicket(organizationId, eventId, t.id),
    onSuccess: (result) => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: registrationQk.all(organizationId, eventId) });
      void queryClient.invalidateQueries({ queryKey: orderQk.all(organizationId, eventId) });
      void queryClient.invalidateQueries({ queryKey: personQk.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: paymentCaseQk.all(organizationId) });
      const refund = result.refund_case;
      if (refund) {
        toast.success("Ticket returned", {
          body: `A refund of ${formatPrice(refund.amount, refund.currency)} is due. It's waiting under Payments.`,
          actions: [{ label: "Open refund", onClick: () => router.push(`/admin/payments/${refund.id}`) }],
        });
      } else {
        toast.success(result.outcome === "ALREADY_RETURNED" ? "Already returned" : "Ticket returned", { body: "Its place is free again." });
      }
    },
  });

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(o) => {
        if (!o) {
          run.reset();
          onClose();
        }
      }}
      icon={<Undo2 />}
      tone="warning"
      title={`Return ${target?.name ?? "this"} ticket?`}
      description={
        paid && target
          ? `The place is freed and the code stops working. A refund of ${formatPrice(target.price.amount, target.price.currency)} will be due; you'll record it under Payments.`
          : "The place is freed and the code stops working. No message is sent."
      }
      confirmLabel="Return ticket"
      cancelLabel="Keep ticket"
      loading={run.isPending}
      loadingLabel="Returning"
      error={run.isError ? describeApiError(run.error, "ticket") : undefined}
      onConfirm={() => target && run.mutate(target)}
    />
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { FileUpload } from "@/components/ui/file-upload";
import type { UploadItem } from "@/components/ui/file-upload";
import { ImageIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { RecordHeading, RecordRows } from "@/components/ui/record-view";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError, assetUrl } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { createTicketType, listTicketTypes, removeEventCover, setTicketTypeActive, updateTicketType, uploadEventCover } from "@/lib/api/events";
import type { StaffEvent, TicketType } from "@/lib/api/events";
import { formatBytes, formatNumber } from "@/lib/format";
import { eventQk, registrationQk } from "@/lib/query-keys";

/** CLOSED and CANCELLED events can't change at all, ticket types and cover included. */
export const isEditable = (event: StaffEvent) => event.status === "DRAFT" || event.status === "PUBLISHED";

const CODE = /^[A-Za-z0-9_]+$/;

/** The event's ticket types: list, add, rename, switch on and off. All tickets are free for now. */
export function TicketTypesTab({ event, canUpdate }: { event: StaffEvent; canUpdate: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TicketType | "new" | null>(null);
  const [form, setForm] = useState({ code: "", name: "", capacity: "" });
  const [errors, setErrors] = useState<{ code?: string; name?: string; capacity?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<TicketType | null>(null);
  const editable = canUpdate && isEditable(event);
  const orgId = event.organization_id;

  const query = useQuery({
    queryKey: eventQk.tickets(orgId, event.id),
    queryFn: ({ signal }) => listTicketTypes(orgId, event.id, signal),
  });
  const state = { status: query.isPending ? "loading" : query.isError ? "error" : "ready", items: query.data ?? [], error: query.error } as const;
  /** After a change: the ticket list, and the events (publishing depends on having an active ticket type). */
  // A ticket type's limit or status changes the guest summary too.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: eventQk.tickets(orgId, event.id) });
    void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
  };

  const save = useMutation({
    mutationFn: ({ target, input }: { target: TicketType | "new"; input: { code: string; name: string; capacity: number | null } }) =>
      target === "new" ? createTicketType(orgId, event.id, input) : updateTicketType(orgId, event.id, target.id, input),
    onSuccess: (_ticket, { target }) => {
      refresh();
      toast.success(target === "new" ? "Ticket type added" : "Changes saved");
      setEditing(null);
    },
    onError: (err) => setFailure(describeApiError(err, "ticket type")),
  });
  const toggle = useMutation({
    mutationFn: (ticket: TicketType) => setTicketTypeActive(orgId, event.id, ticket.id, !ticket.is_active),
    onSuccess: (ticket) => {
      refresh();
      toast.success(ticket.is_active ? "Ticket type switched on" : "Ticket type switched off");
    },
    onError: (err) => {
      // A published event must keep one active ticket type: the API answers 409 `invalid_event_state`, which on its
      // own reads as "closed or cancelled", so say what actually happened.
      const lastOne = err instanceof ApiError && err.code === "invalid_event_state" && event.status === "PUBLISHED";
      toast.error("Couldn't change the ticket type", {
        body: lastOne ? "A published event must keep at least one ticket type switched on." : describeApiError(err, "ticket type"),
      });
    },
  });

  function open(target: TicketType | "new") {
    setEditing(target);
    setForm(target === "new" ? { code: "", name: "", capacity: "" } : { code: target.code, name: target.name, capacity: target.capacity ? String(target.capacity) : "" });
    setErrors({});
    setFailure(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      code: !form.code.trim() ? "Enter a short code, like VIP." : CODE.test(form.code.trim()) ? undefined : "Use letters, numbers and underscores only.",
      name: form.name.trim() ? undefined : "Enter the ticket's name.",
      capacity: !form.capacity.trim() || /^[1-9]\d{0,6}$/.test(form.capacity.trim()) ? undefined : "Enter a whole number above 0, or leave it empty.",
    };
    setErrors(next);
    if (next.code || next.name || next.capacity || !editing) return;
    setFailure(null);
    save.mutate({ target: editing, input: { code: form.code.trim(), name: form.name.trim(), capacity: form.capacity.trim() ? Number(form.capacity.trim()) : null } });
  }

  if (state.status === "loading") {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (state.status === "error") {
    return <EmptyState size="sm" tone="danger" title="We couldn't load the ticket types" description={describeApiError(state.error, "ticket type")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <RecordHeading>Ticket types</RecordHeading>
        {state.items.length === 0 ? (
          <EmptyState size="sm" title="No ticket types" description="Add one before you publish." />
        ) : (
          <RecordRows
            rows={state.items.map((t) => ({
              title: t.name,
              meta: (
                <>
                  <code>{t.code}</code> · {t.capacity ? `Up to ${formatNumber(t.capacity)}` : "No separate limit"} · Free
                </>
              ),
              trailing: (
                <span className="flex items-center gap-2">
                  <StatusPill kind="account" status={t.is_active ? "active" : "inactive"} />
                  {editable && (
                    <>
                      <TextLink onClick={() => open(t)}>Edit</TextLink>
                      <TextLink soft onClick={() => (t.is_active ? setConfirm(t) : toggle.mutate(t))}>
                        {t.is_active ? "Switch off" : "Switch on"}
                      </TextLink>
                    </>
                  )}
                </span>
              ),
            }))}
          />
        )}
      </div>

      {editable && !editing && (
        <div>
          <Button variant="secondary" onClick={() => open("new")}>
            Add ticket type
          </Button>
        </div>
      )}

      {editing && (
        <Card>
          <CardHeader title={editing === "new" ? "New ticket type" : `Edit ${editing.name}`} subtitle="Tickets are free for now. Paid tickets come later." />
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {failure && <ErrorBanner>{failure}</ErrorBanner>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Name" htmlFor="tt-name" required error={errors.name}>
                <Input id="tt-name" value={form.name} error={!!errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="VIP" autoComplete="off" />
              </Field>
              <Field label="Code" htmlFor="tt-code" required error={errors.code} hint="Short and unique in this event. Saved in capitals.">
                <Input id="tt-code" value={form.code} error={!!errors.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="VIP" autoComplete="off" />
              </Field>
            </div>
            <Field label="Limit" htmlFor="tt-capacity" error={errors.capacity} hint="Optional. Empty means it shares the event's capacity.">
              <Input id="tt-capacity" inputMode="numeric" value={form.capacity} error={!!errors.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="100" autoComplete="off" />
            </Field>
            <div className="flex items-center gap-2">
              <Button type="submit" loading={save.isPending} loadingLabel="Saving">
                {editing === "new" ? "Add ticket type" : "Save changes"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Switch off ${confirm?.name ?? "this ticket type"}?`}
        description="People can't pick it any more. A published event must keep at least one ticket type on."
        confirmLabel="Switch off"
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) toggle.mutate(target);
        }}
      />
    </div>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The event's cover image: show it, replace it, remove it. JPEG, PNG or WebP up to 5 MB; the API checks again. */
export function CoverTab({ event, canUpdate }: { event: StaffEvent; canUpdate: boolean }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editable = canUpdate && isEditable(event);
  /** The event carries its cover, so the list and the record both refetch. */
  const refresh = () => void queryClient.invalidateQueries({ queryKey: eventQk.all(event.organization_id) });
  const uploadCover = useMutation({ mutationFn: (file: File) => uploadEventCover(event.organization_id, event.id, file), onSuccess: refresh });
  const removeCover = useMutation({
    mutationFn: () => removeEventCover(event.organization_id, event.id),
    onSuccess: () => {
      refresh();
      setItems([]);
      toast.success("Cover removed");
    },
    onError: (err) => toast.error("Couldn't remove the cover", { body: describeApiError(err, "event") }),
    onSettled: () => setConfirmRemove(false),
  });

  async function upload(file: File) {
    const id = `${file.name}-${Date.now()}`;
    const row: UploadItem = { id, name: file.name, size: formatBytes(file.size), status: "uploading", progress: 40, image: true };
    setItems([row]);
    try {
      await uploadCover.mutateAsync(file);
      setItems([{ ...row, status: "done", progress: 100 }]);
      toast.success("Cover updated");
    } catch (err) {
      setItems([{ ...row, status: "failed", progress: 100, error: describeApiError(err, "event") }]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordHeading>Cover image</RecordHeading>
      {event.cover ? (
        // A plain <img>: the file is served by the API, so next/image's optimizer can't reach it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(event.cover.url)} alt={`Cover of ${event.name}`} className="aspect-[16/9] w-full rounded-md border border-border object-cover" />
      ) : (
        <EmptyState size="sm" icon={<ImageIcon />} title="No cover yet" description="Events with a cover stand out on the public site." />
      )}
      {editable && (
        <>
          <FileUpload
            items={items}
            accept="image/jpeg,image/png,image/webp"
            title={event.cover ? "Drop a new image to replace the cover" : "Drop an image here"}
            hint="JPEG, PNG or WebP, up to 5 MB."
            onFiles={(files) => {
              const file = files[0];
              if (!file) return;
              if (!TYPES.includes(file.type)) return "Upload a JPEG, PNG or WebP image.";
              if (file.size > MAX_BYTES) return "The image must be 5 MB or smaller.";
              void upload(file);
            }}
            onRetry={() => setItems([])}
            onRemove={() => setItems([])}
          />
          {event.cover && (
            <div>
              <Button variant="secondary" onClick={() => setConfirmRemove(true)}>
                Remove cover
              </Button>
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove the cover?"
        description="The event shows without an image until you add a new one."
        confirmLabel="Remove cover"
        loading={removeCover.isPending}
        loadingLabel="Removing"
        onConfirm={() => removeCover.mutate()}
      />
    </div>
  );
}

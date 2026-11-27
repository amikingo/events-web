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
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { RecordHeading, RecordRows } from "@/components/ui/record-view";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError, assetUrl } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { createTicketType, listTicketTypes, removeEventCover, setTicketTypeActive, updateTicketType, uploadEventCover } from "@/lib/api/events";
import type { StaffEvent, TicketAudience, TicketType, TicketTypeInput } from "@/lib/api/events";
import { formatBytes, formatNumber } from "@/lib/format";
import { PRICE_PATTERN, formatPrice, isFreePrice } from "@/lib/price";
import { eventQk, organizationQk, registrationQk } from "@/lib/query-keys";
import { getOrganization } from "@/lib/api/organizations";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { useAtTime } from "@/lib/use-at-time";
import { PriceWindowsEditor, checkRows, rowsFrom, sortRows, toWindowsInput } from "./price-windows";
import type { RowErrors, WindowRow } from "./price-windows";

/** CLOSED and CANCELLED events can't change at all, ticket types and cover included. */
export const isEditable = (event: StaffEvent) => event.status === "DRAFT" || event.status === "PUBLISHED";

const CODE = /^[A-Za-z0-9_]+$/;

/** The event's ticket types: list, add, edit (name, code, limit, price, who can get it), switch on and off. */
export function TicketTypesTab({ event, canUpdate }: { event: StaffEvent; canUpdate: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TicketType | "new" | null>(null);
  const [form, setForm] = useState({ code: "", name: "", capacity: "", price: "", audience: "PUBLIC" as TicketAudience });
  const [errors, setErrors] = useState<{ code?: string; name?: string; capacity?: string; price?: string }>({});
  // Phase 11: scheduled prices, and each row's problem.
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<TicketType | null>(null);
  const editable = canUpdate && isEditable(event);
  const orgId = event.organization_id;
  const { data: organization } = useQuery({ queryKey: organizationQk.detail(orgId), queryFn: ({ signal }) => getOrganization(orgId, signal) });

  const query = useQuery({
    queryKey: eventQk.tickets(orgId, event.id),
    queryFn: ({ signal }) => listTicketTypes(orgId, event.id, signal),
  });
  // A scheduled price starts or ends: fetch again, so the list shows what a new order pays now.
  useAtTime((query.data ?? []).map((t) => t.price_valid_until), () => void query.refetch());
  // Every ticket type carries the organizer's currency; a new event's first type uses the organization's default.
  const currency = query.data?.[0]?.currency ?? organization?.default_currency ?? "ETB";
  const state = { status: query.isPending ? "loading" : query.isError ? "error" : "ready", items: query.data ?? [], error: query.error } as const;
  /** After a change: the ticket list, and the events (publishing depends on having an active ticket type). */
  // A ticket type's limit or status changes the guest summary too.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: eventQk.tickets(orgId, event.id) });
    void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
  };

  const save = useMutation({
    mutationFn: ({ target, input }: { target: TicketType | "new"; input: TicketTypeInput }) =>
      target === "new" ? createTicketType(orgId, event.id, input) : updateTicketType(orgId, event.id, target.id, input),
    onSuccess: (_ticket, { target }) => {
      refresh();
      toast.success(target === "new" ? "Ticket type added" : "Changes saved");
      setEditing(null);
    },
    onError: (err, { input }) => {
      // The API names the row it refused (`body.price_windows.N`): the Nth of the sorted list that was sent.
      const issues = err instanceof ApiError ? ((err.details as { issues?: { path?: string; code?: string }[] } | undefined)?.issues ?? []) : [];
      const sent = sortRows(windows);
      const next: RowErrors = {};
      for (const issue of issues) {
        const n = /price_windows\.(\d+)/.exec(issue.path ?? "")?.[1];
        const row = n !== undefined && input.price_windows ? sent[Number(n)] : undefined;
        if (row && issue.code === "invalid_range") next[row.key] = { endsAt: "The end must be after the start." };
        if (row && issue.code === "overlapping_window") next[row.key] = { row: "This price overlaps another scheduled price." };
      }
      setRowErrors(next);
      setFailure(describeApiError(err, "ticket type"));
    },
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
    setForm(
      target === "new"
        ? { code: "", name: "", capacity: "", price: "", audience: "PUBLIC" }
        : {
            code: target.code,
            name: target.name,
            capacity: target.capacity ? String(target.capacity) : "",
            // "0.00" shows as an empty box (free); "500.00" as "500".
            price: isFreePrice(target.price) ? "" : target.price.replace(/\.00$/, ""),
            audience: target.audience,
          },
    );
    setWindows(target === "new" ? [] : sortRows(rowsFrom(target.price_windows ?? [], event.timezone)));
    setRowErrors({});
    setErrors({});
    setFailure(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      code: !form.code.trim() ? "Enter a short code, like VIP." : CODE.test(form.code.trim()) ? undefined : "Use letters, numbers and underscores only.",
      name: form.name.trim() ? undefined : "Enter the ticket's name.",
      capacity: !form.capacity.trim() || /^[1-9]\d{0,6}$/.test(form.capacity.trim()) ? undefined : "Enter a whole number above 0, or leave it empty.",
      price: !form.price.trim() || PRICE_PATTERN.test(form.price.trim()) ? undefined : "Enter an amount like 500 or 500.50, or leave it empty for free.",
    };
    setErrors(next);
    const rows = checkRows(windows);
    setRowErrors(rows);
    if (next.code || next.name || next.capacity || next.price || Object.keys(rows).length > 0 || !editing) return;
    setFailure(null);
    save.mutate({
      target: editing,
      input: {
        code: form.code.trim(),
        name: form.name.trim(),
        capacity: form.capacity.trim() ? Number(form.capacity.trim()) : null,
        // Sent as the string typed: the API stores it exactly ("500" → "500.00"). Empty means free.
        price: form.price.trim() || "0",
        audience: form.audience,
        // Always the whole schedule: it replaces the old one, and [] clears it.
        price_windows: toWindowsInput(windows, event.timezone),
      },
    });
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
                <span className="flex flex-col">
                  <span>
                    <code>{t.code}</code> · {t.capacity ? `Up to ${formatNumber(t.capacity)}` : "No separate limit"} · {formatPrice(t.effective_price ?? t.price, t.currency)}
                  </span>
                  {t.effective_price !== undefined && t.effective_price !== t.price && <span>Regular {formatPrice(t.price, t.currency)}</span>}
                  {t.price_valid_until && <span>Changes {formatMomentShort(t.price_valid_until, event.timezone)}</span>}
                </span>
              ),
              trailing: (
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {(t.price_windows?.length ?? 0) > 0 && <Pill tone="info">Scheduled</Pill>}
                  {t.audience === "STAFF_ONLY" && <Pill tone="neutral">Staff only</Pill>}
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
          <CardHeader title={editing === "new" ? "New ticket type" : `Edit ${editing.name}`} subtitle="Leave the price empty for a free ticket." />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Regular price" htmlFor="tt-price" error={errors.price} hint="Used whenever no scheduled price applies. Empty or 0 means free.">
                <InputGroup
                  id="tt-price"
                  inputMode="decimal"
                  value={form.price}
                  error={!!errors.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/g, "") }))}
                  suffix={<InputAddon variant="suffix">{currency}</InputAddon>}
                  placeholder="Free"
                  autoComplete="off"
                />
              </Field>
              <Field label="Limit" htmlFor="tt-capacity" error={errors.capacity} hint="Optional. Empty means it shares the event's capacity.">
                <Input id="tt-capacity" inputMode="numeric" value={form.capacity} error={!!errors.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="100" autoComplete="off" />
              </Field>
            </div>
            <Field label="Who can get it" hint={form.audience === "STAFF_ONLY" ? "Only staff can issue it. It never shows on the public page." : "Shown on the public event page."}>
              <SegmentedControl
                aria-label="Who can get it"
                value={form.audience}
                onValueChange={(v) => setForm((f) => ({ ...f, audience: v as TicketAudience }))}
                options={[
                  { value: "PUBLIC", label: "Anyone with the link" },
                  { value: "STAFF_ONLY", label: "Staff only" },
                ]}
              />
            </Field>
            <PriceWindowsEditor
              rows={windows}
              errors={rowErrors}
              regularPrice={form.price.trim()}
              currency={currency}
              timeZone={event.timezone}
              onChange={(rows) => {
                setWindows(rows);
                setRowErrors({});
              }}
            />
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

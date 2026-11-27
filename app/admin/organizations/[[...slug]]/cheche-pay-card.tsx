"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, PlugZap, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DestructiveDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/switch";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { checkChechePay, getChechePay, removeChechePay, saveChechePay } from "@/lib/api/cheche-pay";
import type { ChechePayCheck, ChechePayInput } from "@/lib/api/cheche-pay";
import { describeApiError } from "@/lib/api/errors";
import { formatMomentFull } from "@/lib/ethiopian-datetime";

const qk = (organizationId: string) => ["cheche-pay", organizationId] as const;

/** One label-and-value row. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-4">
      <dt className="type-body-sm text-text-soft">{label}</dt>
      <dd className="type-body m-0 min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}

/** What "Check connection" found, in words. */
const CHECK_RESULT: Record<ChechePayCheck["reason"], { ok: boolean; text: string }> = {
  KEY_ACCEPTED: { ok: true, text: "Cheche Pay accepted the key." },
  KEY_REJECTED: { ok: false, text: "Cheche Pay rejected the key. Check it and save it again." },
  PROVIDER_ERROR: { ok: false, text: "Couldn't reach Cheche Pay. Try again in a moment." },
};

/**
 * Super Admin: an organizer's Cheche Pay keys (Phase 7 step 3). What's saved is shown masked; a secret is typed, sent
 * once and cleared from the form straight after. Removing the keys is final, so switching paid sales off comes first.
 */
export function ChechePayCard({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: qk(organizationId), queryFn: ({ signal }) => getChechePay(organizationId, signal) });
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [active, setActive] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ secretKey?: string; webhookSecret?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const saved = settings.data;
  // New keys start with paid sales on, unless switched off before saving.
  const isActive = active ?? (saved?.configured ? saved.is_active : true);

  const save = useMutation({
    mutationFn: (input: ChechePayInput) => saveChechePay(organizationId, input),
    onSuccess: (next) => {
      queryClient.setQueryData(qk(organizationId), next);
      // Never keep a secret once it's sent.
      setSecretKey("");
      setWebhookSecret("");
      setActive(null);
      toast.success("Cheche Pay saved", { body: next.paid_sales_available ? "Paid sales are available." : "Paid sales aren't available yet." });
    },
    onError: (error) => {
      setSecretKey("");
      setWebhookSecret("");
      const issues = error instanceof ApiError ? ((error.details as { issues?: { path?: string; message?: string; code?: string }[] } | undefined)?.issues ?? []) : [];
      if (issues.length > 0) {
        const next: { secretKey?: string; webhookSecret?: string } = {};
        for (const issue of issues) {
          if (issue.path === "body.webhook_secret") next.webhookSecret = issue.message;
          else next.secretKey = issue.message;
        }
        setErrors(next);
        return;
      }
      setFailure(describeApiError(error, "organization"));
    },
  });

  const check = useMutation({
    mutationFn: () => checkChechePay(organizationId),
    onSuccess: (result) => {
      const found = CHECK_RESULT[result.reason];
      if (found.ok) toast.success("Connection checked", { body: found.text });
      else toast.error("Connection checked", { body: found.text });
      void queryClient.invalidateQueries({ queryKey: qk(organizationId) });
    },
    onError: (error) => toast.error("Couldn't check the connection", { body: describeApiError(error, "organization") }),
  });

  const remove = useMutation({
    mutationFn: () => removeChechePay(organizationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk(organizationId) });
      toast.success("Cheche Pay keys removed", { body: "Paid tickets can't be sold until new keys are saved." });
    },
    onError: (error) => toast.error("Couldn't remove the keys", { body: describeApiError(error, "organization") }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: { secretKey?: string } = {};
    if (!saved?.configured && !secretKey.trim()) next.secretKey = "Enter the secret key: it starts with sk_test_ or sk_live_.";
    setErrors(next);
    setFailure(null);
    if (next.secretKey) return;
    const input: ChechePayInput = {
      ...(secretKey.trim() ? { secret_key: secretKey.trim() } : {}),
      ...(webhookSecret.trim() ? { webhook_secret: webhookSecret.trim() } : {}),
      ...(active !== null || !saved?.configured ? { is_active: isActive } : {}),
    };
    if (Object.keys(input).length === 0) {
      toast.info("Nothing to save", { body: "Type a new key, or change paid sales." });
      return;
    }
    save.mutate(input);
  }

  if (settings.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (settings.isError || !saved) {
    return <EmptyState size="sm" tone="danger" title="We couldn't load Cheche Pay" description={describeApiError(settings.error, "organization")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Cheche Pay" subtitle="Where this organizer's ticket money goes. Buyers pick how to pay on Cheche Pay's own page." />
        <dl className="m-0 flex flex-col divide-y divide-border">
          <Row label="Keys">
            {saved.configured ? (
              <span className="flex flex-wrap items-center gap-2">
                <code className="font-mono">{saved.secret_key_masked}</code>
                {saved.key_mode && <StatusPill kind="paymentKey" status={saved.key_mode} />}
              </span>
            ) : (
              "No keys saved"
            )}
          </Row>
          <Row label="Webhook secret">{saved.has_webhook_secret ? "Saved" : "Not saved"}</Row>
          <Row label="Paid sales">
            <StatusPill kind="account" status={saved.paid_sales_available ? "active" : "inactive"} />
            <span className="type-body-sm ml-2 text-text-soft">{saved.paid_sales_available ? "Paid tickets can be sold." : saved.configured && !saved.is_active ? "Switched off." : "Not available yet."}</span>
          </Row>
          <Row label="Webhook address">
            {saved.webhook_url ? (
              <span className="flex min-w-0 flex-col gap-2">
                <span className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="type-body-sm min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-2 py-1 font-mono">{saved.webhook_url}</code>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(saved.webhook_url!)
                        .then(() => toast.success("Address copied"))
                        .catch(() => toast.error("Couldn't copy the address"))
                    }
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </span>
                <span className="type-body-sm text-text-soft">Give this address to Cheche Pay.</span>
              </span>
            ) : (
              <span className="text-text-soft">The server doesn&apos;t know its public address yet.</span>
            )}
          </Row>
          {saved.updated_at && <Row label="Last changed">{formatMomentFull(saved.updated_at)}</Row>}
        </dl>
      </Card>

      <Card>
        <CardHeader title={saved.configured ? "Change the keys" : "Save the keys"} subtitle="Keys are sent once and never shown again." />
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          <Field
            label="Secret key"
            htmlFor="cp-secret"
            required={!saved.configured}
            error={errors.secretKey}
            hint={saved.configured ? "Leave it empty to keep the saved key. Starts with sk_test_ or sk_live_." : "Starts with sk_test_ or sk_live_. Not the publishable pk_ key."}
          >
            <PasswordInput
              id="cp-secret"
              autoComplete="new-password"
              value={secretKey}
              error={!!errors.secretKey}
              onValueChange={(v) => {
                setSecretKey(v);
                setErrors((e) => ({ ...e, secretKey: undefined }));
              }}
            />
          </Field>
          <Field label="Webhook secret" htmlFor="cp-webhook" error={errors.webhookSecret} hint={saved.has_webhook_secret ? "A secret is saved. Type a new one to replace it." : "Optional. Usually starts with whsec_."}>
            <PasswordInput
              id="cp-webhook"
              autoComplete="new-password"
              value={webhookSecret}
              error={!!errors.webhookSecret}
              onValueChange={(v) => {
                setWebhookSecret(v);
                setErrors((e) => ({ ...e, webhookSecret: undefined }));
              }}
            />
          </Field>
          {saved.has_webhook_secret && (
            <div>
              <TextLink soft onClick={() => save.mutate({ webhook_secret: null })}>
                Remove the webhook secret
              </TextLink>
            </div>
          )}
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="type-body font-semibold text-text">Paid sales on</span>
              <span className="type-body-sm text-text-soft">{isActive ? "New payments can start." : "Off: no new payments. Payments already started still finish."}</span>
            </div>
            <Switch checked={isActive} onCheckedChange={setActive} aria-label="Paid sales on" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={save.isPending} loadingLabel="Saving">
              <KeyRound className="size-4" />
              Save
            </Button>
            {saved.configured && (
              <Button type="button" variant="secondary" loading={check.isPending} loadingLabel="Checking" onClick={() => check.mutate()}>
                <PlugZap className="size-4" />
                Check connection
              </Button>
            )}
            {saved.configured && (
              <Button type="button" variant="secondary" onClick={() => setRemoveOpen(true)}>
                <Trash2 className="size-4" />
                Remove keys
              </Button>
            )}
          </div>
        </form>
      </Card>

      <DestructiveDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove the Cheche Pay keys?"
        description="This can't be undone. Payments already started can then no longer be confirmed. To stop new payments only, switch paid sales off instead."
        confirmLabel="Remove keys"
        onConfirm={() => {
          setRemoveOpen(false);
          remove.mutate();
        }}
      />
    </div>
  );
}

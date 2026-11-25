"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Branch, BranchInput } from "@/lib/api/branches";

interface Values {
  name: string;
  code: string;
  description: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const startValues = (b?: Branch): Values => ({ name: b?.name ?? "", code: b?.code ?? "", description: b?.description ?? "" });

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the branch name.";
  if (!v.code.trim()) e.code = "Enter a short code.";
  else if (!/^[A-Za-z0-9_]+$/.test(v.code.trim())) e.code = "Use letters, numbers and underscores only.";
  return e;
}

const toInput = (v: Values): BranchInput => ({ name: v.name.trim(), code: v.code.trim(), description: v.description.trim() || null });

interface BranchFormProps {
  /** The branch being edited. Leave out to create one. */
  branch?: Branch;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: BranchInput) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit page for a branch: a card of fields, buttons in the header so they stay in view. */
export function BranchForm({ branch, onSubmit, onCancel }: BranchFormProps) {
  const editing = Boolean(branch);
  const [start] = useState(() => startValues(branch));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "We couldn't save the branch. Try again.");
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Branches", onClick: cancel }, ...(editing ? [{ label: branch!.name, onClick: cancel }] : []), { label: editing ? "Edit" : "New branch" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${branch!.name}` : "New branch"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change its details." : "The office or place these events run from."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="branch-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create branch"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="branch-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Branch" subtitle="What it's called." />
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="br-name" required error={errors.name}>
              <Input id="br-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Addis Office" autoComplete="off" />
            </Field>
            <Field label="Code" htmlFor="br-code" required error={errors.code} hint="Letters, numbers and underscores. Saved in capitals.">
              <Input id="br-code" value={values.code} error={!!errors.code} onChange={(e) => set("code", e.target.value)} placeholder="ADDIS" autoComplete="off" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="About" subtitle="Optional." />
          <Field label="Description" htmlFor="br-description">
            <Textarea id="br-description" value={values.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </Card>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You have changes that are not saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false);
          onCancel();
        }}
      />
    </div>
  );
}

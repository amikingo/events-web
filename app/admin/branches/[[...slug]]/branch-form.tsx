"use client";

import { GitBranch, Hash } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
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

/** "Addis Office" → "ADDIS_OFFICE": the code suggested from the name, until the person types their own. */
const codeFrom = (name: string) =>
  name
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

/** A line of the preview card: an icon and a value, or a faint placeholder when it's empty. */
function PreviewLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

interface BranchFormProps {
  /** The branch being edited. Leave out to create one. */
  branch?: Branch;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: BranchInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create and edit page for a branch, laid out like the other forms: a live preview on the left, the fields on the right.
 * On a new branch the code follows the name until the person types their own.
 */
export function BranchForm({ branch, onSubmit, onCancel }: BranchFormProps) {
  const editing = Boolean(branch);
  const [start] = useState(() => startValues(branch));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // An existing branch keeps its code; a new one gets one from the name until the code is typed by hand.
  const [codeTouched, setCodeTouched] = useState(editing);
  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setName(name: string) {
    setValues((v) => ({ ...v, name, code: codeTouched ? v.code : codeFrom(name) }));
    if (errors.name || (!codeTouched && errors.code)) setErrors((e) => ({ ...e, name: undefined, code: codeTouched ? e.code : undefined }));
  }

  function setCode(code: string) {
    setCodeTouched(code !== "");
    set("code", code.toUpperCase());
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
  const name = values.name.trim();
  const code = values.code.trim();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${branch!.name}` : "New branch"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change its details." : "An office or place your events run from."}</p>
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

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="branch-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: how the branch will look in your lists. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconTile tone="charcoal" size="lg">
                  <GitBranch />
                </IconTile>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={name ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{name || "Branch name"}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="neutral" size="sm">
                      {code || "CODE"}
                    </Pill>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<Hash />} value={code ? `Code ${code}` : ""} empty="No code yet" />
                <p className={values.description.trim() ? "type-body-sm m-0 line-clamp-3 text-text-soft" : "type-body-sm m-0 text-text-faint"}>{values.description.trim() || "No description"}</p>
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">This is how the branch shows in your list.</p>
        </aside>

        {/* Right: the fields. */}
        <section className="flex flex-col gap-3">
          <h2 className="type-h3 m-0 px-1 text-text">About the branch</h2>
          <Card>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
                <Field label="Name" htmlFor="br-name" required error={errors.name}>
                  <Input id="br-name" value={values.name} error={!!errors.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Addis Office" autoComplete="off" autoFocus={!editing} />
                </Field>
                <Field label="Code" htmlFor="br-code" required error={errors.code} hint={codeTouched ? "Letters, numbers and underscores." : "Made from the name. Type to change it."}>
                  <Input id="br-code" value={values.code} error={!!errors.code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ADDIS" autoComplete="off" spellCheck={false} />
                </Field>
              </div>
              <Field label="Description" htmlFor="br-description" hint="Optional. Where it is or what it handles.">
                <Textarea id="br-description" rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Bole office. Runs the conferences in Addis Ababa." />
              </Field>
            </div>
          </Card>
        </section>
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

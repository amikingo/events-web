"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { ErrorBanner } from "./error-banner";
import { Field } from "./field";
import { ArrowLeftIcon, WarnIcon } from "./icons";
import { IconTile } from "./icon-tile";
import { Input } from "./input";
import { Modal, ModalBody, ModalFooter, ModalTitle } from "./modal";
import { PhoneInput, isValidEthiopianPhone } from "./phone-input";
import { SegmentedControl } from "./segmented-control";
import { Select } from "./select";
import { Textarea } from "./textarea";

export interface RecordFormField {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "select" | "segmented" | "textarea";
  required?: boolean;
  /** Spans both columns; fields are paired only when they belong together. */
  full?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  /** Shown when a required field is empty. Default "Enter the {label}." */
  requiredMessage?: string;
  options?: { label: string; value: string }[];
  /** Return a message to block submit. Required, email and phone formats are checked for you. */
  validate?: (value: string, all: Record<string, string>) => string | undefined;
}

export interface RecordFormSection {
  id: string;
  title: string;
  hint?: string;
  fields: RecordFormField[];
}

export interface RecordFormProps {
  /** Create and edit are the same page: only the title, breadcrumb and button label change, and edit arrives filled in. */
  mode: "create" | "edit";
  /** What is being made, lower-case ("customer"). Drives "New customer" / "Create customer". */
  noun: string;
  /** Where the form was opened from, for the breadcrumb ("Customers", or the record's name on edit). */
  backLabel: string;
  /** The record's name, for "Edit Sara Bekele". */
  recordName?: string;
  sections: RecordFormSection[];
  initialValues?: Record<string, string>;
  /**
   * Called with the values once they validate. May return a Promise (an API save): the primary button shows "Creating…" /
   * "Saving…" and both buttons lock until it settles; a rejection keeps the form open and shows the error's message in the banner.
   */
  onSubmit: (values: Record<string, string>) => void | Promise<unknown>;
  onCancel: () => void;
  /** Where the discard confirmation is drawn: the viewport (default) or the nearest positioned ancestor. */
  container?: "viewport" | "parent";
  className?: string;
}

function validateField(f: RecordFormField, v: string, all: Record<string, string>): string | undefined {
  const value = v.trim();
  if (f.required && !value) return f.requiredMessage ?? `Enter ${f.label.toLowerCase()}.`;
  if (!value) return undefined;
  if (f.type === "email" && !/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  if (f.type === "tel" && !isValidEthiopianPhone(value)) return "Enter a valid Ethiopian phone number.";
  return f.validate?.(value, all);
}

/**
 * `.dv-form` — the full-page create / edit form: breadcrumb bar, section list on the left, one 600px column,
 * footer pinned with the change state, Cancel and the primary action. Validates on blur and on submit, with a
 * summary that links to each field; leaving with changes asks "Discard changes?".
 */
export function RecordForm({ mode, noun, backLabel, recordName, sections, initialValues = {}, onSubmit, onCancel, container, className }: RecordFormProps) {
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const blank = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, initialValues[f.name] ?? ""])), [fields, initialValues]);
  const [values, setValues] = useState<Record<string, string>>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const idOf = (name: string) => `${uid}-${name}`;

  const dirty = fields.some((f) => (values[f.name] ?? "") !== (blank[f.name] ?? ""));
  const title = mode === "create" ? `New ${noun}` : `Edit ${recordName ?? noun}`;
  const submitLabel = mode === "create" ? `Create ${noun}` : "Save changes";

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
    // Once a field has been flagged it re-checks as you type, so the message clears the moment it's fixed.
    if (errors[name]) {
      const f = fields.find((x) => x.name === name)!;
      setErrors((e) => {
        const next = { ...e };
        const msg = validateField(f, v, { ...values, [name]: v });
        if (msg) next[name] = msg;
        else delete next[name];
        return next;
      });
    }
  }
  function blur(f: RecordFormField) {
    const msg = validateField(f, values[f.name] ?? "", values);
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[f.name] = msg;
      else delete next[f.name];
      return next;
    });
  }
  function focusField(name: string) {
    const el = rootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(idOf(name))}`);
    el?.scrollIntoView({ block: "center" });
    el?.focus();
  }
  function submit() {
    if (saving) return;
    setSubmitted(true);
    const found: Record<string, string> = {};
    for (const f of fields) {
      const msg = validateField(f, values[f.name] ?? "", values);
      if (msg) found[f.name] = msg;
    }
    setErrors(found);
    const first = fields.find((f) => found[f.name]);
    if (first) return focusField(first.name);
    setSaveError(null);
    let result: void | Promise<unknown>;
    try {
      result = onSubmit(values);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "Couldn’t save. Try again.");
      return;
    }
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    setSaving(true);
    (result as Promise<unknown>).then(
      () => setSaving(false),
      (e: unknown) => {
        setSaving(false);
        setSaveError(e instanceof Error && e.message ? e.message : "Couldn’t save. Try again.");
        scrollRef.current?.scrollTo({ top: 0 });
      },
    );
  }
  function requestLeave() {
    if (saving) return;
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !discardOpen) requestLeave();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function onScroll() {
    const root = scrollRef.current;
    if (!root) return;
    let current = sections[0]?.id ?? "";
    for (const s of sections) {
      const el = root.querySelector<HTMLElement>(`[data-section="${s.id}"]`);
      if (el && el.offsetTop - root.scrollTop <= 80) current = s.id;
    }
    setActive(current);
  }
  function jump(id: string) {
    setActive(id);
    scrollRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const errorList = fields.filter((f) => errors[f.name]);

  function control(f: RecordFormField) {
    const id = idOf(f.name);
    const v = values[f.name] ?? "";
    const error = !!errors[f.name];
    if (f.type === "select") return <Select id={id} options={f.options ?? []} value={v} onValueChange={(x) => set(f.name, x)} placeholder={f.placeholder ?? "Select…"} />;
    if (f.type === "segmented") return <SegmentedControl aria-label={f.label} options={f.options ?? []} value={v} onValueChange={(x) => set(f.name, x)} />;
    if (f.type === "textarea") return <Textarea id={id} value={v} error={error} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} onBlur={() => blur(f)} />;
    if (f.type === "tel") return <PhoneInput id={id} value={v} error={error} onValueChange={(x) => set(f.name, x)} onBlur={() => blur(f)} />;
    return <Input id={id} type={f.type ?? "text"} value={v} error={error} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} onBlur={() => blur(f)} />;
  }

  return (
    <form
      ref={rootRef}
      noValidate
      aria-label={`${noun} form`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("@container/dvf flex h-full min-w-0 flex-col bg-surface", className)}
    >
      <div className="flex min-h-[53px] flex-none items-center gap-1.5 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-text-faint">
          <button type="button" onClick={requestLeave} className="-ml-1.5 inline-flex items-center gap-1.5 rounded-btn border-none bg-transparent px-1.5 py-1 text-text-soft hover:bg-surface-2 hover:text-accent">
            <ArrowLeftIcon className="size-[15px]" />
            {backLabel}
          </button>
          <span>/</span>
          <b className="truncate font-semibold text-text">{title}</b>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-[160px_minmax(0,600px)] justify-center gap-9 px-6 pb-9 pt-[22px] @max-[700px]/dvf:grid-cols-[minmax(0,1fr)] @max-[700px]/dvf:px-4 @max-[700px]/dvf:pb-7 @max-[700px]/dvf:pt-[18px]">
          <nav aria-label="Form sections" className="sticky top-0 flex flex-col gap-0.5 self-start pt-[58px] @max-[700px]/dvf:hidden">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jump(s.id);
                }}
                className={cn("rounded-btn px-2.5 py-1.5 text-[12.5px] no-underline hover:bg-surface-2 hover:text-text", active === s.id ? "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text" : "text-text-soft")}
              >
                {s.title}
              </a>
            ))}
          </nav>
          <div>
            <h3 className="m-0 text-[20px] font-bold leading-[1.3] text-text">{title}</h3>
            <p className="mb-[18px] mt-1 text-[12.5px] text-text-faint">
              Fields marked <span className="text-accent">*</span> are required.
            </p>
            {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
            {submitted && errorList.length > 0 && (
              <ErrorBanner>
                {errorList.length} {errorList.length === 1 ? "field needs" : "fields need"} attention:{" "}
                {errorList.map((f, i) => (
                  <span key={f.name}>
                    {i > 0 && ", "}
                    <a href={`#${idOf(f.name)}`} onClick={(e) => (e.preventDefault(), focusField(f.name))} className="cursor-pointer font-semibold text-inherit">
                      {f.label}
                    </a>
                  </span>
                ))}
              </ErrorBanner>
            )}
            {sections.map((s, i) => (
              <section key={s.id} data-section={s.id} className={cn("scroll-mt-3 border-border py-5", i === 0 ? "border-t-0 pt-1" : "border-t")}>
                <h5 className="m-0 mb-0.5 text-[13.5px] font-bold text-text">{s.title}</h5>
                {s.hint && <p className="m-0 mb-3.5 text-[12px] text-text-faint">{s.hint}</p>}
                <div className={cn("grid grid-cols-2 gap-4 @max-[700px]/dvf:grid-cols-[minmax(0,1fr)]", !s.hint && "mt-3.5")}>
                  {s.fields.map((f) => (
                    <Field key={f.name} label={f.label} htmlFor={idOf(f.name)} required={f.required} hint={f.hint} error={errors[f.name]} className={cn(f.full && "col-span-full")}>
                      {control(f)}
                    </Field>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5 border-t border-border bg-surface px-6 py-3 @max-[700px]/dvf:px-4 @max-[700px]/dvf:[&>button]:flex-1">
        <span className={cn("mr-auto flex items-center gap-1.5 text-[12px] @max-[700px]/dvf:hidden", dirty ? "text-warning-text" : "text-text-faint")}>
          {dirty && <span className="size-1.5 rounded-full bg-current" />}
          {dirty ? "Unsaved changes" : "No changes yet"}
        </span>
        <Button type="button" variant="secondary" onClick={requestLeave} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={mode === "edit" && !dirty} loading={saving} loadingLabel={mode === "create" ? "Creating…" : "Saving…"}>
          {submitLabel}
        </Button>
      </div>

      <Modal open={discardOpen} onOpenChange={setDiscardOpen} size="sm" centered role="alertdialog" dismissible={false} container={container} aria-label="Discard changes?">
        <ModalBody>
          <IconTile tone="warning" size="lg" className="mb-1.5 [&_svg]:size-6">
            <WarnIcon />
          </IconTile>
          <ModalTitle>Discard changes?</ModalTitle>
          <p>What you typed won&rsquo;t be saved.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" data-autofocus onClick={() => setDiscardOpen(false)}>
            Keep editing
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDiscardOpen(false);
              onCancel();
            }}
          >
            Discard
          </Button>
        </ModalFooter>
      </Modal>
    </form>
  );
}

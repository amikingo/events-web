"use client";

import { useState, useSyncExternalStore } from "react";
import { Field } from "../../../../components/ui/field";
import { AvatarUpload } from "../../../../components/ui/file-upload";
import { Input } from "../../../../components/ui/input";
import { PhoneInput } from "../../../../components/ui/phone-input";
import { SegmentedControl } from "../../../../components/ui/segmented-control";
import { Select } from "../../../../components/ui/select";
import { toast } from "../../../../components/ui/toaster";
import { settingsService } from "../../../../lib/services/settings-service";
import type { WorkspaceSettings } from "../../../../lib/services/settings-service";
import { readImage } from "./profile-tab";
import { SaveBar, SettingsGroup, SettingsRow, useDraft } from "./settings-ui";
import type { TabProps } from "./settings-ui";

const INDUSTRIES = [
  { value: "retail", label: "Retail and e-commerce" },
  { value: "hospitality", label: "Hotels and restaurants" },
  { value: "health", label: "Health and wellness" },
  { value: "logistics", label: "Transport and logistics" },
  { value: "finance", label: "Finance and payments" },
  { value: "other", label: "Something else" },
];
const SIZES = [
  { value: "1-10", label: "1 to 10 people" },
  { value: "11-50", label: "11 to 50 people" },
  { value: "51-200", label: "51 to 200 people" },
  { value: "200+", label: "More than 200 people" },
];

export function WorkspaceTab({ onDirtyChange }: TabProps) {
  const saved = useSyncExternalStore(
    (cb) => settingsService.subscribe(cb),
    () => settingsService.getSnapshot().workspace,
    () => settingsService.getServerSnapshot().workspace,
  );
  const { draft, set, dirty, reset } = useDraft<WorkspaceSettings>(saved, onDirtyChange);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Enter a workspace name.";
    if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email)) next.email = "Enter a valid email, like hello@company.com.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    settingsService.saveWorkspace({ ...draft, name: draft.name.trim() });
    setSaving(false);
    toast.success("Workspace saved");
  }

  const clear = (key: "name" | "email") => setErrors((x) => ({ ...x, [key]: undefined }));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <SettingsGroup title="Identity" description="How your workspace is named and shown.">
        <SettingsRow label="Logo" description="Shown at the top of the menu. PNG or JPG, up to 512 KB.">
          <AvatarUpload
            initials={draft.name.slice(0, 1).toUpperCase() || "?"}
            src={draft.logo ?? undefined}
            hasImage={Boolean(draft.logo)}
            title="Workspace logo"
            hint="Square works best"
            onFile={(file) => readImage(file, (url) => set("logo", url))}
            onRemove={() => set("logo", null)}
          />
        </SettingsRow>
        <SettingsRow label="Workspace name" htmlFor="ws-name" description="Your team sees this name everywhere.">
          <Field error={errors.name}>
            <Input id="ws-name" value={draft.name} error={!!errors.name} onChange={(e) => (set("name", e.target.value), clear("name"))} aria-required="true" />
          </Field>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Organization" description="Your company’s details, used on invoices and receipts.">
        <SettingsRow label="Legal name" htmlFor="ws-legal" description="The name on your registration.">
          <Input id="ws-legal" value={draft.legalName} onChange={(e) => set("legalName", e.target.value)} />
        </SettingsRow>
        <SettingsRow label="Industry" htmlFor="ws-industry">
          <Select id="ws-industry" value={draft.industry} onValueChange={(v) => set("industry", v)} options={INDUSTRIES} />
        </SettingsRow>
        <SettingsRow label="Company size" htmlFor="ws-size">
          <Select id="ws-size" value={draft.size} onValueChange={(v) => set("size", v)} options={SIZES} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Contact" description="Where customers and partners can reach you.">
        <SettingsRow label="Email" htmlFor="ws-email" description="Shown on receipts.">
          <Field error={errors.email}>
            <Input id="ws-email" type="email" value={draft.email} error={!!errors.email} onChange={(e) => (set("email", e.target.value), clear("email"))} placeholder="hello@company.com" />
          </Field>
        </SettingsRow>
        <SettingsRow label="Phone" htmlFor="ws-phone">
          <PhoneInput id="ws-phone" value={draft.phone} onValueChange={(v) => set("phone", v)} />
        </SettingsRow>
        <SettingsRow label="Address" htmlFor="ws-address">
          <Input id="ws-address" value={draft.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, area, city" />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Preferences" description="Defaults for every page and report.">
        <SettingsRow label="Currency" htmlFor="ws-currency" description="Used for amounts, reports and exports.">
          <Select
            id="ws-currency"
            value={draft.currency}
            onValueChange={(v) => set("currency", v)}
            options={[
              { value: "ETB", label: "ETB — Ethiopian birr" },
              { value: "USD", label: "USD — US dollar" },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Time zone" htmlFor="ws-tz" description="Dates and times follow this zone.">
          <Select
            id="ws-tz"
            value={draft.timezone}
            onValueChange={(v) => set("timezone", v)}
            options={[
              { value: "Africa/Addis_Ababa", label: "Addis Ababa (UTC+3)" },
              { value: "UTC", label: "UTC" },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Week starts on" description="Calendars and weekly charts begin on this day.">
          <SegmentedControl
            aria-label="Week starts on"
            value={draft.weekStart}
            onValueChange={(v) => set("weekStart", v as WorkspaceSettings["weekStart"])}
            options={[
              { value: "monday", label: "Monday" },
              { value: "sunday", label: "Sunday" },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>

      <SaveBar dirty={dirty} saving={saving} onReset={() => (reset(), setErrors({}))} saveLabel="Save workspace" />
    </form>
  );
}

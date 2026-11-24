"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Avatar } from "../../../../components/ui/avatar";
import { Field } from "../../../../components/ui/field";
import { AvatarUpload } from "../../../../components/ui/file-upload";
import { Input } from "../../../../components/ui/input";
import { PhoneInput } from "../../../../components/ui/phone-input";
import { Pill } from "../../../../components/ui/pill";
import { Skeleton } from "../../../../components/ui/skeleton";
import { StatusPill } from "../../../../components/ui/status-pill";
import { toast } from "../../../../components/ui/toaster";
import { formatDate } from "../../../../lib/format";
import { authService } from "@/app/auth/staff/auth-service";
import { settingsService } from "../../../../lib/services/settings-service";
import type { User } from "../../../../types";
import { SaveBar, SettingsGroup, SettingsRow, useDraft } from "./settings-ui";
import type { TabProps } from "./settings-ui";

const stripPrefix = (phone: string) => phone.replace(/^\+?251\s*/, "");
const MAX_IMAGE_BYTES = 512 * 1024;

export function readImage(file: File, onDone: (dataUrl: string) => void) {
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("That image is too large", { body: "Choose one under 512 KB." });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onDone(String(reader.result));
  reader.onerror = () => toast.error("Could not read that image", { body: "Try a different file." });
  reader.readAsDataURL(file);
}

export function ProfileTab({ onDirtyChange }: TabProps) {
  const settings = useSyncExternalStore(
    (cb) => settingsService.subscribe(cb),
    () => settingsService.getSnapshot(),
    () => settingsService.getServerSnapshot(),
  );
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined while loading
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // The signed-in user lives in localStorage, so it can only be read in the browser, after the first render.
  useEffect(() => {
    queueMicrotask(() => setUser(authService.getCurrentUser()));
  }, []);

  const saved = useMemo(() => ({ name: user?.name ?? "", phone: user?.phone ? stripPrefix(user.phone) : "" }), [user]);
  const { draft, set, dirty, reset } = useDraft(saved, onDirtyChange);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Enter your full name.";
    if (draft.phone && draft.phone.replace(/\D/g, "").length !== 9) next.phone = "Enter 9 digits, like 911 204 412.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ name: draft.name.trim(), phone: draft.phone ? `+251 ${draft.phone}` : "" });
      setUser(updated);
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save your profile", { body: "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your profile">
        <Skeleton height={220} className="rounded-md" />
        <Skeleton height={180} className="rounded-md" />
      </div>
    );
  }
  if (user === null) {
    return <p className="type-body m-0 text-text-soft">You are signed out. Sign in again to see your profile.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <SettingsGroup title="Personal information" description="How your name and photo appear to your team.">
        <SettingsRow label="Photo" description="A square image works best. JPG or PNG, up to 512 KB.">
          <AvatarUpload
            initials={user.initials}
            src={settings.avatar ?? undefined}
            hasImage={Boolean(settings.avatar)}
            title="Profile photo"
            hint="Square, at least 400×400"
            onFile={(file) => readImage(file, (url) => (settingsService.setAvatar(url), toast.success("Photo updated")))}
            onRemove={() => (settingsService.setAvatar(null), toast.info("Photo removed"))}
          />
        </SettingsRow>
        <SettingsRow label="Full name" htmlFor="name" description="Shown on your comments and requests.">
          <Field error={errors.name}>
            <Input id="name" value={draft.name} error={!!errors.name} onChange={(e) => (set("name", e.target.value), setErrors((x) => ({ ...x, name: undefined })))} placeholder="Hana Bekele" autoComplete="name" aria-required="true" />
          </Field>
        </SettingsRow>
        <SettingsRow label="Email" htmlFor="email" description="Your email can’t be changed here. Ask an admin.">
          <Input id="email" type="email" value={user.email} disabled />
        </SettingsRow>
        <SettingsRow label="Phone" htmlFor="phone" description="Used for sign-in codes.">
          <Field error={errors.phone} hint="Optional.">
            <PhoneInput id="phone" value={draft.phone} onValueChange={(v) => (set("phone", v), setErrors((x) => ({ ...x, phone: undefined })))} />
          </Field>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Account" description="Set by your workspace. Ask an admin to change these.">
        <SettingsRow label="Role" inline description="What you can do in this workspace.">
          <Pill>{user.role}</Pill>
        </SettingsRow>
        <SettingsRow label="Status" inline description="Whether you can sign in.">
          <StatusPill kind="account" status={user.status} />
        </SettingsRow>
        <SettingsRow label="Organization" inline>
          <span className="type-body text-text">{user.organizationName}</span>
        </SettingsRow>
        <SettingsRow label="Member since" inline>
          <span className="type-body text-text">{formatDate(user.createdAt)}</span>
        </SettingsRow>
        <SettingsRow label="Last sign-in" inline>
          <span className="flex items-center gap-2">
            <Avatar initials={user.initials} size={24} />
            <span className="type-body text-text">{user.lastLogin}</span>
          </span>
        </SettingsRow>
      </SettingsGroup>

      <SaveBar dirty={dirty} saving={saving} onReset={() => (reset(), setErrors({}))} saveLabel="Save profile" />
    </form>
  );
}

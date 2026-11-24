"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { formatDate } from "../../lib/format";
import { groupPhone, validateEmail, validateName, validatePhone } from "../../lib/marketplace/validation";
import { attendeeAuth, useAttendee } from "@/app/auth/attendee/attendee-auth-service";
import { CITIES } from "../../mocks/marketplace/reference";
import type { AttendeeAccount, CityId, NotificationPreferences } from "../../types/marketplace";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { EmptyState } from "../ui/empty-state";
import { Field } from "../ui/field";
import { CardIcon, LockIcon, LogoutIcon } from "../ui/icons";
import { Input } from "../ui/input";
import { PhoneInput } from "../ui/phone-input";
import { Select } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";
import { ThemeSwitch } from "../ui/theme-switch";
import { toast } from "../ui/toaster";
import { initialsOf } from "./account-menu";

function ProfileForm({ account }: { account: AttendeeAccount }) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(groupPhone(account.phone));
  const [city, setCity] = useState<CityId>(account.cityId);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const ids = { name: useId(), email: useId(), phone: useId(), city: useId() };
  const dirty = name !== account.name || email !== account.email || phone.replace(/\s/g, "") !== account.phone || city !== account.cityId;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = { name: validateName(name), email: validateEmail(email), phone: validatePhone(phone) };
    setErrors(errs);
    if (errs.name || errs.email || errs.phone) return;
    setSaving(true);
    await attendeeAuth.updateAccount({ name: name.trim(), email: email.trim().toLowerCase(), phone, cityId: city });
    setSaving(false);
    toast.success("Changes saved");
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <section className="flex flex-col gap-4" aria-labelledby="personal">
        <h2 id="personal" className="m-0 type-h3 text-text">
          Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor={ids.name} required error={errors.name} className="sm:col-span-2">
            <Input id={ids.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={Boolean(errors.name)} />
          </Field>
          <Field label="Home city" htmlFor={ids.city} hint="Used for “Events near you”.">
            <Select id={ids.city} value={city} onValueChange={(v) => setCity(v as CityId)} options={CITIES.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
        </div>
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="contact">
        <h2 id="contact" className="m-0 type-h3 text-text">
          Contact details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor={ids.email} required error={errors.email}>
            <Input id={ids.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={Boolean(errors.email)} />
          </Field>
          <Field label="Phone number" htmlFor={ids.phone} required error={errors.phone} hint="Used to sign in and for tickets by text.">
            <PhoneInput id={ids.phone} value={phone} onValueChange={setPhone} error={Boolean(errors.phone)} />
          </Field>
        </div>
      </section>
      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty} loading={saving} loadingLabel="Saving">
          Save changes
        </Button>
      </div>
    </form>
  );
}

const PREFS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "ticketUpdates", label: "Ticket and order updates", hint: "Receipts, changes to events you've booked, cancellations and refunds." },
  { key: "eventReminders", label: "Event reminders", hint: "A reminder the day before and on the morning of each event." },
  { key: "smsAlerts", label: "Text messages", hint: "Urgent changes by SMS, such as a new venue or time." },
  { key: "recommendations", label: "Recommendations", hint: "A weekly email with events picked for you." },
];

function NotificationSettings({ account }: { account: AttendeeAccount }) {
  async function toggle(key: keyof NotificationPreferences, value: boolean) {
    await attendeeAuth.updateAccount({ preferences: { ...account.preferences, [key]: value } });
    toast.success(value ? "Turned on" : "Turned off", { body: PREFS.find((p) => p.key === key)?.label });
  }
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
      {PREFS.map((p) => (
        <li key={p.key} className="flex items-start justify-between gap-4 py-4 first:pt-0">
          <div>
            <p className="m-0 type-body font-semibold text-text">{p.label}</p>
            <p className="m-0 type-body-sm text-text-soft">{p.hint}</p>
          </div>
          <Switch checked={account.preferences[p.key]} onCheckedChange={(v) => toggle(p.key, v)} aria-label={p.label} />
        </li>
      ))}
    </ul>
  );
}

/** Attendee profile: personal and contact details, notifications, settings and sign out. */
export function AccountView() {
  const account = useAttendee();
  const router = useRouter();
  const [confirmOut, setConfirmOut] = useState(false);

  if (account === undefined) return <Skeleton className="h-[420px] rounded-md" />;

  if (!account) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        ring
        icon={<LockIcon />}
        title="Sign in to manage your account"
        description="Sign in with your phone number or email."
        actions={
          <Button asChild>
            <Link href="/auth?next=/account">Sign in</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="flex flex-col items-start gap-4 self-start">
        <Avatar initials={initialsOf(account.name)} size={48} />
        <div className="min-w-0">
          <p className="m-0 type-h3 text-text">{account.name}</p>
          <p className="m-0 truncate type-body-sm text-text-soft">{account.email}</p>
          <p className="m-0 type-body-sm text-text-soft">+251 {groupPhone(account.phone)}</p>
          <p className="m-0 mt-2 type-body-sm text-text-faint">Member since {formatDate(account.createdAt)}</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/my-tickets">
              <CardIcon className="size-4" /> My tickets
            </Link>
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmOut(true)}>
            <LogoutIcon className="size-4" /> Sign out
          </Button>
        </div>
      </Card>

      <Card>
        <Tabs defaultValue="profile">
          <TabList aria-label="Account sections">
            <Tab value="profile">Profile</Tab>
            <Tab value="notifications">Notifications</Tab>
            <Tab value="settings">Settings</Tab>
          </TabList>
          <TabPanel value="profile">
            <ProfileForm key={account.id} account={account} />
          </TabPanel>
          <TabPanel value="notifications">
            <NotificationSettings account={account} />
          </TabPanel>
          <TabPanel value="settings">
            <div className="flex flex-col divide-y divide-border">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div>
                  <p className="m-0 type-body font-semibold text-text">Appearance</p>
                  <p className="m-0 type-body-sm text-text-soft">Light, dark, or follow your device.</p>
                </div>
                <ThemeSwitch />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="m-0 type-body font-semibold text-text">Sign out</p>
                  <p className="m-0 type-body-sm text-text-soft">Sign out of {account.name.split(" ")[0]}&rsquo;s account on this device.</p>
                </div>
                <Button variant="secondary" onClick={() => setConfirmOut(true)}>
                  Sign out
                </Button>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </Card>

      <ConfirmDialog
        open={confirmOut}
        onOpenChange={setConfirmOut}
        title="Sign out?"
        description="Your tickets stay safe in your account. Sign in again any time with a code."
        confirmLabel="Sign out"
        icon={<LogoutIcon />}
        onConfirm={() => {
          attendeeAuth.signOut();
          setConfirmOut(false);
          toast.info("Signed out");
          router.push("/");
        }}
      />
    </div>
  );
}

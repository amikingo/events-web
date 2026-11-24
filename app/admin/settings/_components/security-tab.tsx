"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "../../../../components/ui/button";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { EmptyState } from "../../../../components/ui/empty-state";
import { Field } from "../../../../components/ui/field";
import { PasswordInput } from "../../../../components/ui/password-input";
import { RadioGroup, RadioItem } from "../../../../components/ui/radio-group";
import { Select } from "../../../../components/ui/select";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Switch } from "../../../../components/ui/switch";
import { Table } from "../../../../components/ui/table";
import type { ColumnDef } from "../../../../components/ui/table";
import { toast } from "../../../../components/ui/toaster";
import { authService } from "@/app/auth/staff/auth-service";
import { settingsService } from "../../../../lib/services/settings-service";
import type { Session } from "../../../../lib/services/settings-service";
import { SampleNote, SettingsGroup, SettingsRow } from "./settings-ui";

interface SignIn {
  id: string;
  when: string;
  device: string;
  location: string;
  ok: boolean;
}

// Mock data — replace with your own queries.
const LOGIN_ACTIVITY: SignIn[] = [
  { id: "l1", when: "Today, 8:42 AM", device: "Chrome on Windows", location: "Addis Ababa", ok: true },
  { id: "l2", when: "Yesterday, 6:15 PM", device: "Safari on iPhone", location: "Addis Ababa", ok: true },
  { id: "l3", when: "Nov 6, 11:03 PM", device: "Unknown browser", location: "Lagos, Nigeria", ok: false },
  { id: "l4", when: "Nov 5, 9:20 AM", device: "Chrome on Windows", location: "Addis Ababa", ok: true },
  { id: "l5", when: "Nov 3, 2:48 PM", device: "Firefox on Linux", location: "Adama", ok: true },
];

const activityColumns: ColumnDef<SignIn>[] = [
  { key: "when", header: "When", primary: true, accessor: (r) => r.when },
  { key: "device", header: "Device", accessor: (r) => r.device },
  { key: "location", header: "Location", accessor: (r) => r.location },
  {
    key: "ok",
    header: "Result",
    mobile: "badge",
    filterValue: (r) => (r.ok ? "Signed in" : "Blocked"),
    render: (r) => <StatusPill kind="access" status={r.ok ? "signed-in" : "blocked"} />,
  },
];

export function SecurityTab() {
  const settings = useSyncExternalStore(
    (cb) => settingsService.subscribe(cb),
    () => settingsService.getSnapshot(),
    () => settingsService.getServerSnapshot(),
  );
  const { security, sessions } = settings;

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [changing, setChanging] = useState(false);

  // Dialogs
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const [signOutId, setSignOutId] = useState<string | null>(null);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  // Loading state for the activity table, so it never flashes empty first.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password.";
    if (next.length < 8) found.next = "Use at least 8 characters.";
    else if (next === current) found.next = "Choose a password you haven’t used here before.";
    if (confirm !== next) found.confirm = "The passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setChanging(true);
    try {
      const ok = await authService.changePassword(current, next);
      if (ok) {
        toast.success("Password changed");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setErrors({ current: "That is not your current password." });
      }
    } catch {
      toast.error("Could not change your password", { body: "Check your connection and try again." });
    } finally {
      setChanging(false);
    }
  }

  const others = sessions.filter((s) => !s.current);
  const pendingSession: Session | undefined = sessions.find((s) => s.id === signOutId);

  return (
    <div className="flex flex-col gap-4">
      <SampleNote>Sessions and sign-in history here are examples. Your choices are saved in this browser until you connect your own sign-in service.</SampleNote>

      <form onSubmit={changePassword} noValidate>
        <SettingsGroup
          title="Password"
          description="Use a password you don’t use anywhere else."
          footer={
            <>
              {(current || next || confirm) && (
                <Button type="button" variant="secondary" onClick={() => (setCurrent(""), setNext(""), setConfirm(""), setErrors({}))} disabled={changing}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={changing} loadingLabel="Updating" disabled={!(current || next || confirm)}>
                Update password
              </Button>
            </>
          }
        >
          <SettingsRow label="Current password" htmlFor="cur-pass">
            <Field error={errors.current}>
              <PasswordInput id="cur-pass" value={current} error={!!errors.current} onValueChange={(v) => (setCurrent(v), setErrors((x) => ({ ...x, current: undefined })))} autoComplete="current-password" aria-required="true" />
            </Field>
          </SettingsRow>
          <SettingsRow label="New password" htmlFor="new-pass" description="At least 8 characters.">
            <Field error={errors.next}>
              <PasswordInput id="new-pass" value={next} error={!!errors.next} onValueChange={(v) => (setNext(v), setErrors((x) => ({ ...x, next: undefined })))} autoComplete="new-password" aria-required="true" />
            </Field>
          </SettingsRow>
          <SettingsRow label="Confirm new password" htmlFor="conf-pass">
            <Field error={errors.confirm}>
              <PasswordInput id="conf-pass" value={confirm} error={!!errors.confirm} onValueChange={(v) => (setConfirm(v), setErrors((x) => ({ ...x, confirm: undefined })))} autoComplete="new-password" aria-required="true" />
            </Field>
          </SettingsRow>
        </SettingsGroup>
      </form>

      <SettingsGroup title="Two-step sign-in" description="Ask for a code from your phone, as well as your password.">
        <SettingsRow label="Ask for a code when I sign in" inline description={security.twoStep ? "On. Your account has an extra lock." : "Off. Your account is protected by your password alone."}>
          <Switch
            checked={security.twoStep}
            aria-label="Ask for a code when I sign in"
            onCheckedChange={(on) => {
              if (on) {
                settingsService.saveSecurity({ twoStep: true });
                toast.success("Two-step sign-in is on");
              } else setTurnOffOpen(true);
            }}
          />
        </SettingsRow>
        {security.twoStep && (
          <SettingsRow label="Where we send the code" description="Choose how you get your code.">
            <RadioGroup aria-label="Where we send the code" value={security.twoStepMethod} onValueChange={(v) => (settingsService.saveSecurity({ twoStepMethod: v as "app" | "sms" }), toast.success("Saved"))}>
              <RadioItem value="app" label="An authenticator app" />
              <RadioItem value="sms" label="A text message" />
            </RadioGroup>
          </SettingsRow>
        )}
      </SettingsGroup>

      <SettingsGroup title="Security preferences" description="These apply as soon as you change them.">
        <SettingsRow label="Tell me about new sign-ins" inline description="We email you when your account is used on a new device.">
          <Switch
            checked={security.alertNewSignIn}
            aria-label="Tell me about new sign-ins"
            onCheckedChange={(on) => (settingsService.saveSecurity({ alertNewSignIn: on }), toast.success(on ? "You’ll get sign-in alerts" : "Sign-in alerts are off"))}
          />
        </SettingsRow>
        <SettingsRow label="Sign out when inactive" htmlFor="sec-timeout" description="After this long without activity, you sign in again.">
          <Select
            id="sec-timeout"
            value={security.timeout}
            onValueChange={(v) => (settingsService.saveSecurity({ timeout: v }), toast.success("Saved"))}
            options={[
              { value: "15", label: "After 15 minutes" },
              { value: "60", label: "After 1 hour" },
              { value: "480", label: "After 8 hours" },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title="Active sessions"
        description="Devices that are signed in to your account right now."
        actions={
          others.length > 0 ? (
            <Button variant="secondary" onClick={() => setSignOutAllOpen(true)}>
              Sign out other sessions
            </Button>
          ) : undefined
        }
      >
        {sessions.map((s) => (
          <SettingsRow key={s.id} label={s.device} inline description={`${s.location} · ${s.lastActive}`}>
            {s.current ? (
              <StatusPill kind="access" status="current" />
            ) : (
              <Button variant="secondary" onClick={() => setSignOutId(s.id)}>
                Sign out
              </Button>
            )}
          </SettingsRow>
        ))}
        {others.length === 0 && (
          <div className="px-5 py-4">
            <EmptyState size="inline" title="No other sessions" description="You are only signed in on this device." />
          </div>
        )}
      </SettingsGroup>

      <Table
        title="Login activity"
        columns={activityColumns}
        data={LOGIN_ACTIVITY}
        getRowId={(r) => r.id}
        loading={loading}
        filters={false}
        pagination={false}
      />

      <ConfirmDialog
        open={turnOffOpen}
        onOpenChange={setTurnOffOpen}
        title="Turn off two-step sign-in?"
        description="Your account will be protected by your password alone."
        confirmLabel="Turn off"
        onConfirm={() => {
          setTurnOffOpen(false);
          settingsService.saveSecurity({ twoStep: false });
          toast.info("Two-step sign-in is off");
        }}
      />
      <ConfirmDialog
        open={signOutId !== null}
        onOpenChange={(open) => !open && setSignOutId(null)}
        title={pendingSession ? `Sign out ${pendingSession.device}?` : "Sign out this session?"}
        description="That device will need to sign in again."
        confirmLabel="Sign out"
        onConfirm={() => {
          if (signOutId) settingsService.signOutSession(signOutId);
          setSignOutId(null);
          toast.success("Session signed out");
        }}
      />
      <ConfirmDialog
        open={signOutAllOpen}
        onOpenChange={setSignOutAllOpen}
        title="Sign out all other sessions?"
        description={`${others.length} ${others.length === 1 ? "device" : "devices"} will need to sign in again. This device stays signed in.`}
        confirmLabel="Sign out all"
        onConfirm={() => {
          setSignOutAllOpen(false);
          settingsService.signOutOtherSessions();
          toast.success("Other sessions signed out");
        }}
      />
    </div>
  );
}

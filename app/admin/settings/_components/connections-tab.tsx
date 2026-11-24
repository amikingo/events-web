"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "../../../../components/ui/button";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { Field } from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import { Pill } from "../../../../components/ui/pill";
import { toast } from "../../../../components/ui/toaster";
import { settingsService } from "../../../../lib/services/settings-service";
import type { Connection } from "../../../../lib/services/settings-service";
import { SampleNote, SettingsGroup } from "./settings-ui";

function ConnectionRow({ connection, onDisconnect }: { connection: Connection; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(connection.account);
  const [error, setError] = useState<string>();
  const inputId = `conn-${connection.id}`;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!account.trim()) {
      setError("Enter your account or merchant ID.");
      return;
    }
    settingsService.setConnection(connection.id, true, account.trim());
    setOpen(false);
    toast.success(connection.connected ? `${connection.name} updated` : `${connection.name} connected`);
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="type-body font-medium text-text">{connection.name}</span>
            {connection.connected ? (
              <Pill tone="success" dot>
                Connected
              </Pill>
            ) : (
              <Pill dot>Not connected</Pill>
            )}
          </div>
          <span className="type-body-sm text-text-soft">{connection.connected ? `${connection.description} Account ${connection.account}.` : connection.description}</span>
        </div>
        <div className="flex flex-none items-center gap-2">
          {connection.connected ? (
            <>
              <Button variant="secondary" onClick={() => (setOpen((o) => !o), setAccount(connection.account), setError(undefined))} aria-expanded={open} aria-controls={`${inputId}-panel`}>
                Configure
              </Button>
              <Button variant="secondary" onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={() => (setOpen((o) => !o), setError(undefined))} aria-expanded={open} aria-controls={`${inputId}-panel`}>
              Connect
            </Button>
          )}
        </div>
      </div>

      {open && (
        <form id={`${inputId}-panel`} onSubmit={save} noValidate className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-4">
          <Field label="Account or merchant ID" htmlFor={inputId} required error={error} hint="You can find this in your provider’s dashboard.">
            <Input id={inputId} value={account} error={!!error} onChange={(e) => (setAccount(e.target.value), setError(undefined))} autoFocus aria-required="true" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{connection.connected ? "Save" : "Connect"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ConnectionsTab() {
  const connections = useSyncExternalStore(
    (cb) => settingsService.subscribe(cb),
    () => settingsService.getSnapshot().connections,
    () => settingsService.getServerSnapshot().connections,
  );
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);
  const connected = connections.filter((c) => c.connected);
  const available = connections.filter((c) => !c.connected);

  return (
    <div className="flex flex-col gap-4">
      <SampleNote>These connections are examples. Connecting one saves its ID in this browser. It does not contact the provider until you add your own integration.</SampleNote>

      <SettingsGroup title="Connected" description={connected.length ? `${connected.length} of ${connections.length} connected.` : "Nothing is connected yet."}>
        {connected.length === 0 ? (
          <p className="type-body m-0 px-5 py-4 text-text-soft">Connect a service below to get started.</p>
        ) : (
          connected.map((c) => <ConnectionRow key={c.id} connection={c} onDisconnect={() => setDisconnecting(c)} />)
        )}
      </SettingsGroup>

      {available.length > 0 && (
        <SettingsGroup title="Available" description="Services you can add.">
          {available.map((c) => (
            <ConnectionRow key={c.id} connection={c} onDisconnect={() => undefined} />
          ))}
        </SettingsGroup>
      )}

      <ConfirmDialog
        open={disconnecting !== null}
        onOpenChange={(open) => !open && setDisconnecting(null)}
        title={disconnecting ? `Disconnect ${disconnecting.name}?` : "Disconnect?"}
        description="Anything that uses this connection will stop working until you connect it again."
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (disconnecting) settingsService.setConnection(disconnecting.id, false, "");
          toast.success(`${disconnecting?.name} disconnected`);
          setDisconnecting(null);
        }}
      />
    </div>
  );
}

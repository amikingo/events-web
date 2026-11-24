"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../../../components/layouts/page-header";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { Tab, TabList, Tabs } from "../../../components/ui/tabs";
import { AppearanceTab } from "./_components/appearance-tab";
import { ConnectionsTab } from "./_components/connections-tab";
import { ProfileTab } from "./_components/profile-tab";
import { SecurityTab } from "./_components/security-tab";
import { TeamTab } from "./_components/team-tab";
import { WorkspaceTab } from "./_components/workspace-tab";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
  { id: "connections", label: "Connections" },
  { id: "team", label: "Team" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile");
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  // Whether the open tab has unsaved changes. A ref, so reporting it never re-renders the page.
  const dirty = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  // Closing or reloading the browser tab with unsaved changes asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function requestTab(next: string) {
    if (next === tab) return;
    if (dirty.current) setPendingTab(next as TabId);
    else setTab(next as TabId);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title="Settings" description="Manage your profile, your workspace, and how people sign in." />

      <Tabs value={tab} onValueChange={requestTab}>
        {/* The tab row scrolls sideways on a phone instead of wrapping or overflowing the page. */}
        <div className="-mx-1 overflow-x-auto px-1" role="presentation">
          <TabList>
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id}>
                {t.label}
              </Tab>
            ))}
          </TabList>
        </div>
      </Tabs>

      <div className="pb-8">
        {tab === "profile" && <ProfileTab onDirtyChange={onDirtyChange} />}
        {tab === "workspace" && <WorkspaceTab onDirtyChange={onDirtyChange} />}
        {tab === "security" && <SecurityTab />}
        {tab === "appearance" && <AppearanceTab />}
        {tab === "connections" && <ConnectionsTab />}
        {tab === "team" && <TeamTab />}
      </div>

      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(open) => !open && setPendingTab(null)}
        title="Discard changes?"
        description="You have changes on this tab that are not saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          if (pendingTab) {
            dirty.current = false;
            setTab(pendingTab);
          }
          setPendingTab(null);
        }}
      />
    </div>
  );
}

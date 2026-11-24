"use client";

import { useSyncExternalStore, useState } from "react";
import { AlertCard } from "../../../components/ui/alert-card";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { CheckIcon, DocIcon, ShieldIcon, WarnIcon } from "../../../components/ui/icons";
import { Pill } from "../../../components/ui/pill";
import { StepList } from "../../../components/ui/step-list";
import { Switch } from "../../../components/ui/switch";
import { Tab, TabList, TabPanel, Tabs } from "../../../components/ui/tabs";
import { TextLink } from "../../../components/ui/text-link";
import { toast } from "../../../components/ui/toaster";
import { notificationsService } from "../../../lib/services/notifications-service";
import type { NotificationItem } from "../../../types";

function useLiveNotifications(): NotificationItem[] {
  return useSyncExternalStore(
    (cb) => notificationsService.subscribe(cb),
    () => notificationsService.getSnapshot(),
    () => notificationsService.getSnapshot(),
  );
}

export default function NotificationsPage() {
  const notifications = useLiveNotifications();
  const [tab, setTab] = useState("all");

  // Notification Preference toggles
  const [criticalSms, setCriticalSms] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [batchSettlement, setBatchSettlement] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="m-0 type-h1 text-text">Notification & Communications Center</h1>
          <p className="m-0 mt-1 text-[13px] text-text-soft">
            System notices, cross-tenant operational alerts, security audit updates, and dispatch notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            onClick={async () => {
              await notificationsService.markAllAsRead();
              toast.success("All notifications marked as read");
            }}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <Tab value="all" count={unreadCount}>All Alerts</Tab>
          <Tab value="announcements">System Notices</Tab>
          <Tab value="timeline">Activity Timeline</Tab>
          <Tab value="preferences">Preferences</Tab>
        </TabList>

        {/* 1 · ALL ALERTS */}
        <TabPanel value="all">
          <div className="flex flex-col gap-3">
            {notifications.map((item) => (
              <Card
                key={item.id}
                className={`flex flex-col gap-2.5 p-4 transition-colors ${
                  !item.read ? "border-l-4 border-l-accent bg-surface" : "bg-surface/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill
                      tone={
                        item.category === "security"
                          ? "danger"
                          : item.category === "billing"
                            ? "accent"
                            : item.category === "task"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {item.category.toUpperCase()}
                    </Pill>
                    <span className="font-semibold text-text text-[13.5px]">{item.title}</span>
                  </div>
                  <span className="text-[11.5px] text-text-faint">{item.timestamp}</span>
                </div>

                <p className="m-0 text-[13px] text-text-soft">{item.description}</p>

                <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[12px]">
                  {!item.read ? (
                    <TextLink
                      onClick={async () => {
                        await notificationsService.markAsRead(item.id);
                        toast.info("Marked as read");
                      }}
                    >
                      Mark as read
                    </TextLink>
                  ) : (
                    <span className="text-text-faint">Read</span>
                  )}
                  {item.actionUrl && (
                    <a href={item.actionUrl} className="font-medium text-text-soft hover:underline">
                      View details →
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>

        {/* 2 · SYSTEM ANNOUNCEMENTS */}
        <TabPanel value="announcements">
          <div className="flex flex-col gap-4">
            <AlertCard
              tone="warning"
              title="Scheduled National Payment Gateway Maintenance"
              time="Nov 08, 02:00 AM - 03:30 AM EAT"
              body="Telebirr core switch upgrades will occur during this low-volume window. Automated retries will queue pending transactions and dispatches."
            />

            <AlertCard
              tone="success"
              title="Data Residency Audit Passed"
              time="Nov 04, 18:00 EAT"
              body="The Ministry of Innovation & Technology verified BrandOS sovereign storage compliance in the Addis Ababa data facility."
            />
          </div>
        </TabPanel>

        {/* 3 · ACTIVITY TIMELINE */}
        <TabPanel value="timeline">
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="m-0 text-[15px] font-semibold text-text">Operational Audit Stream</h3>
            <p className="m-0 text-[12.5px] text-text-soft">
              Real-time chronological events recorded across tenant environments.
            </p>

            <StepList
              steps={[
                {
                  label: "14:22 EAT — Super Admin (Abebe Bikila) updated security policy RBAC",
                  status: "done",
                },
                {
                  label: "11:05 EAT — Org Admin (Sara Hailu) exported monthly dispatch audit PDF",
                  status: "done",
                },
                {
                  label: "09:40 EAT — Example Logistics provisioned 4 new commercial vehicle assets",
                  status: "done",
                },
                {
                  label: "08:15 EAT — Automated midnight settlement reconciler processed 48 payments",
                  status: "done",
                },
              ]}
            />
          </Card>
        </TabPanel>

        {/* 4 · NOTIFICATION PREFERENCES */}
        <TabPanel value="preferences">
          <div className="max-w-[640px]">
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <h3 className="m-0 text-[15px] font-semibold text-text">Channel Subscription Settings</h3>
                <p className="m-0 text-[12.5px] text-text-soft">
                  Control how alerts and reports are dispatched to your team devices.
                </p>
              </div>

              <div className="flex flex-col gap-4 divide-y divide-border pt-1">
                <div className="pt-2">
                  <Switch
                    checked={criticalSms}
                    onCheckedChange={(c) => {
                      setCriticalSms(c);
                      toast.info(`Critical SMS alerts ${c ? "enabled" : "disabled"}`);
                    }}
                    label="Direct SMS alerts for critical fleet & security failures"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    checked={emailDigest}
                    onCheckedChange={(c) => {
                      setEmailDigest(c);
                      toast.info(`Daily email digest ${c ? "subscribed" : "unsubscribed"}`);
                    }}
                    label="Daily executive performance and dispatch summary email"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    checked={batchSettlement}
                    onCheckedChange={(c) => {
                      setBatchSettlement(c);
                      toast.info(`Settlement notifications ${c ? "enabled" : "disabled"}`);
                    }}
                    label="Instant notice upon batch merchant bank settlements"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    checked={securityAlerts}
                    onCheckedChange={(c) => {
                      setSecurityAlerts(c);
                      toast.info(`Security alerts ${c ? "enabled" : "disabled"}`);
                    }}
                    label="Two-factor authentication and token rotation audits"
                  />
                </div>
              </div>
            </Card>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}


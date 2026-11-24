"use client";

import { Button } from "../../../../components/ui/button";
import { Card, CardHeader } from "../../../../components/ui/card";
import { CardIcon } from "../../../../components/ui/icons";
import { KpiCard } from "../../../../components/ui/kpi-card";
import { Pill } from "../../../../components/ui/pill";
import { StatusPill } from "../../../../components/ui/status-pill";
import { ThemeSwitch } from "../../../../components/ui/theme-switch";
import { toast } from "../../../../components/ui/toaster";
import { SettingsGroup, SettingsRow } from "./settings-ui";

/** Theme only. There is one app shell and one type scale, so there is nothing else to choose here. */
export function AppearanceTab() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <SettingsGroup title="Theme" description="Applies as soon as you choose it.">
          <SettingsRow label="Color mode" description="Choose light, dark, or follow your device." stacked>
            <ThemeSwitch />
          </SettingsRow>
        </SettingsGroup>
      </div>

      <Card className="xl:sticky xl:top-4" aria-label="Live preview">
        <CardHeader title="Preview" subtitle="Updates as you choose." />
        <div className="flex flex-col gap-3">
          <KpiCard label="Total sales" value="248,780" unit="ETB" trend={{ direction: "up", value: "49%", label: "vs last week" }} icon={<CardIcon />} spark={[4, 5, 4, 6, 5, 7, 6, 9]} />
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="payment" status="paid" />
            <StatusPill kind="payment" status="pending" />
            <Pill>Admin</Pill>
          </div>
          <div className="flex gap-2">
            <Button className="flex-none" onClick={() => toast.success("This is how a message looks")}>
              Primary
            </Button>
            <Button variant="secondary" className="flex-none">
              Secondary
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

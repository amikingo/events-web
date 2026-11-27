"use client";

import { Banknote, Ticket } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { AreaTrendCard, DonutCard, LineTrendCard } from "./dashboard-charts";
import type { TicketReport } from "./use-ticket-report";

/** What to say instead of a chart: still counting, couldn't read, or nothing to show yet. */
function emptyFor(report: TicketReport, nothing: { title: string; text: string }) {
  if (report.loading) return { title: "Counting tickets…", text: "Reading the guest lists." };
  if (report.failed) return { title: "We couldn't load the tickets", text: "Reload the page to try again." };
  return nothing;
}

const note = (report: TicketReport) => (report.partial ? " Newest tickets only." : "");

export function TicketSalesCard({ report, className }: { report: TicketReport; className?: string }) {
  const ready = !report.loading && !report.failed;
  return (
    <AreaTrendCard
      className={className}
      title="Ticket sales"
      subtitle={`Confirmed tickets per day.${note(report)}`}
      icon={<Ticket />}
      tone="pink"
      headline={ready ? { value: formatNumber(report.recentTickets), label: "in the last 14 days" } : undefined}
      data={ready ? report.perDay : []}
      empty={emptyFor(report, { title: "No tickets in the last 14 days", text: "Sales show here as people register." })}
    />
  );
}

export function SourcesCard({ report }: { report: TicketReport }) {
  const ready = !report.loading && !report.failed;
  return (
    <DonutCard
      title="Where tickets come from"
      subtitle={`All confirmed tickets.${note(report)}`}
      icon={<Ticket />}
      tone="purple"
      parts={ready ? report.sources : []}
      totalLabel="Tickets"
      empty={emptyFor(report, { title: "No tickets yet", text: "Online, staff and free tickets show here." })}
    />
  );
}

export function RevenueCard({ report }: { report: TicketReport }) {
  const ready = !report.loading && !report.failed;
  const thisMonth = report.perMonth[report.perMonth.length - 1]?.value ?? 0;
  return (
    <LineTrendCard
      title="Revenue"
      subtitle={`Paid tickets per month, before fees.${report.otherCurrencies ? ` ${report.currency} only.` : ""}${note(report)}`}
      icon={<Banknote />}
      tone="green"
      headline={ready ? { value: formatCurrency(thisMonth, { unit: report.currency, decimals: Number.isInteger(thisMonth) ? 0 : 2 }), label: "this month" } : undefined}
      data={ready ? report.perMonth : []}
      empty={emptyFor(report, { title: "No paid tickets yet", text: "Revenue shows here once a paid ticket is confirmed." })}
    />
  );
}

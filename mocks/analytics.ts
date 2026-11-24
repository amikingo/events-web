import type { ChartRange, KpiMetric, ReportItem } from "../types";

export const MOCK_REPORTS: ReportItem[] = [
  {
    id: "REP-901",
    name: "Monthly Multi-Tenant Revenue & Fee Statement",
    category: "Financial",
    generatedAt: "2026-11-01",
    size: "3.4 MB",
    format: "PDF",
  },
  {
    id: "REP-902",
    name: "Fleet Diagnostic Audit & Emission Report",
    category: "Regulatory Audit",
    generatedAt: "2026-11-02",
    size: "1.8 MB",
    format: "PDF",
  },
  {
    id: "REP-903",
    name: "Telebirr Gateway Settlement & Reconciliation Dump",
    category: "Financial",
    generatedAt: "2026-11-03",
    size: "8.2 MB",
    format: "CSV",
  },
  {
    id: "REP-904",
    name: "Tenant Operations SLA Compliance Index",
    category: "SLA Performance",
    generatedAt: "2026-11-04",
    size: "890 KB",
    format: "PDF",
  },
];

export const MOCK_REVENUE_RANGES: ChartRange[] = [
  {
    label: "Last 7 days",
    value: "7",
    values: [62, 74, 58, 81, 69, 88, 96],
    axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    label: "Last 30 days",
    value: "30",
    values: [40, 48, 52, 59, 65, 61, 58, 70, 75, 82, 88, 96],
    axis: ["Week 1", "Week 2", "Week 3", "Week 4"],
  },
  {
    label: "Quarterly",
    value: "90",
    values: [32, 45, 58, 62, 70, 85, 94],
    axis: ["Aug", "Sep", "Oct", "Nov"],
  },
];

export const MOCK_THROUGHPUT_RANGES: ChartRange[] = [
  {
    label: "Requests / hr",
    value: "hourly",
    values: [1200, 1450, 1800, 2100, 1950, 2400, 2800],
    axis: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
  },
];

export const MOCK_ANALYTICS_KPIS: KpiMetric[] = [
  {
    label: "Total gross",
    value: "1,842,500",
    unit: "ETB",
    trend: { direction: "up", value: "18.4%", label: "vs target" },
  },
  {
    label: "Peak throughput",
    value: "480",
    unit: "req/s",
    trend: { direction: "up", value: "8.1%", label: "stable" },
  },
  {
    label: "Avg settlement",
    value: "1.2",
    unit: "hrs",
    trend: { direction: "down", value: "34%", label: "faster" },
  },
  {
    label: "SLA pass rate",
    value: "99.94%",
    trend: { value: "0%", label: "excellent" },
  },
];


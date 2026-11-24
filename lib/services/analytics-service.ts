import type { KpiMetric, ChartRange, ActivityItem } from "@/types";

class AnalyticsService {
  async getKpis(): Promise<KpiMetric[]> {
    return [
      {
        label: "Total revenue",
        value: "184,250",
        unit: "ETB",
        trend: { direction: "up", value: "12.4%", label: "vs last month" },
      },
      {
        label: "Total bookings",
        value: "1,320",
        trend: { direction: "up", value: "8.1%", label: "vs last month" },
      },
      {
        label: "Refund requests",
        value: "42",
        trend: { direction: "down", value: "3.2%", label: "vs last month" },
      },
      {
        label: "Active accounts",
        value: "95.8%",
        trend: { direction: "up", value: "1.5%", label: "settlement rate" },
      },
    ];
  }

  async getRevenueRanges(): Promise<ChartRange[]> {
    return [
      {
        label: "Last 7 days",
        value: "7",
        values: [62, 74, 58, 81, 69, 88, 96],
        axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
      {
        label: "Last 14 days",
        value: "14",
        values: [48, 55, 61, 52, 70, 66, 59, 62, 74, 58, 81, 69, 88, 96],
        axis: ["Oct 18", "Oct 24", "Oct 31"],
      },
      {
        label: "Last 30 days",
        value: "30",
        values: [40, 48, 52, 59, 65, 61, 58, 70, 75, 82, 88, 96],
        axis: ["Week 1", "Week 2", "Week 3", "Week 4"],
      },
    ];
  }

  async getRecentActivity(): Promise<ActivityItem[]> {
    return [
      {
        id: "act_1",
        method: "telebirr",
        name: "Example Clinic · Floral Ritual",
        meta: "Telebirr · 2 min ago",
        amount: "+2,550",
        status: "paid",
      },
      {
        id: "act_2",
        method: "cbe",
        name: "Addis Sport Park · Court 3",
        meta: "CBE Birr · 14 min ago",
        amount: "+800",
        status: "pending",
      },
      {
        id: "act_3",
        method: "wallet",
        name: "Refund · Hair Cut",
        meta: "Wallet · 1 hr ago",
        amount: "−450",
        negative: true,
        status: "refunded",
      },
      {
        id: "act_4",
        method: "telebirr",
        name: "Dire Dawa City · Merchant Payout",
        meta: "Telebirr · 3 hrs ago",
        amount: "+38,900",
        status: "paid",
      },
    ];
  }
}

export const analyticsService = new AnalyticsService();


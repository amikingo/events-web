import type { NotificationItem } from "@/types";

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NOTIF-01",
    title: "Telebirr Gateway Maintenance",
    description: "Scheduled maintenance window on Sunday, Nov 08 between 02:00 AM and 03:30 AM EAT.",
    category: "system",
    timestamp: "10 minutes ago",
    read: false,
    actionUrl: "/admin/dashboard",
  },
  {
    id: "NOTIF-02",
    title: "Critical Fleet Audit Flagged",
    description: "Vehicle ET-3-19402 failed annual emissions test with 4 recorded defects.",
    category: "task",
    timestamp: "1 hour ago",
    read: false,
    actionUrl: "/operations",
  },
  {
    id: "NOTIF-03",
    title: "New Organization Provisioned",
    description: "Example Logistics completed tenant verification and onboarded 18 members.",
    category: "billing",
    timestamp: "3 hours ago",
    read: true,
    actionUrl: "/organizations",
  },
  {
    id: "NOTIF-04",
    title: "Security Token Rotated",
    description: "Primary JWT secret and session verification certificates refreshed successfully.",
    category: "security",
    timestamp: "Yesterday at 17:00",
    read: true,
    actionUrl: "/admin/settings",
  },
];


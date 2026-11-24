export type Role = "Super Admin" | "Org Admin" | "Admin" | "Manager" | "Staff" | "Auditor";

export type Status = "active" | "inactive" | "suspended" | "pending";

export interface User {
  id: string; // e.g. "USR-001"
  name: string;
  email: string;
  initials: string;
  role: Role;
  status: Status;
  department: string;
  organizationId: string;
  organizationName: string;
  phone: string;
  avatarUrl?: string;
  lastLogin: string;
  createdAt: string;
}

export interface Organization {
  id: string; // e.g. "ORG-101"
  name: string;
  slug: string;
  tier: "Enterprise" | "Scale" | "Starter";
  status: "verified" | "pending" | "suspended";
  membersCount: number;
  region: string;
  billingEmail: string;
  phone: string;
  createdAt: string;
  features: string[];
}

export interface Team {
  id: string; // e.g. "TEAM-01"
  name: string;
  lead: string;
  leadEmail: string;
  membersCount: number;
  department: string;
  description: string;
  permissionsCount: number;
  status: "active" | "archived";
}

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in_progress" | "review" | "completed" | "blocked";

export interface OperationTask {
  id: string; // e.g. "TSK-802"
  title: string;
  assignee: string;
  assigneeInitials: string;
  priority: TaskPriority;
  status: TaskStatus;
  domain: "Fleet Logistics" | "Merchant Settlement" | "Compliance Audit" | "Customer Support";
  dueDate: string;
  progress: number; // 0-100
  notes: string;
}

export interface ServiceRequest {
  id: string; // e.g. "REQ-401"
  requester: string;
  type: "Account Access" | "Hardware Token" | "Refund Clearance" | "Custom Report";
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  priority: "high" | "normal";
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: "security" | "system" | "task" | "billing";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface KpiMetric {
  label: string;
  value: string;
  unit?: string;
  trend?: {
    direction?: "up" | "down";
    value: string;
    label: string;
  };
}

export interface ChartRange {
  label: string;
  value: string;
  values: number[];
  axis: string[];
}

export interface ActivityItem {
  id: string;
  method: "telebirr" | "cbe" | "wallet";
  name: string;
  meta: string;
  amount: string;
  negative?: boolean;
  status: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PermissionMatrixItem {
  domain: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  admin: boolean;
}

export interface Booking {
  id: string;
  customer: string;
  phone: string;
  service: string;
  city: string;
  zone: string;
  date: string;
  timeSlot: string;
  price: number;
  status: "confirmed" | "in_progress" | "pending" | "completed" | "cancelled";
  technician: string;
}

export interface InspectionRecord {
  id: string;
  assetName: string;
  plateNumber: string;
  technician: string;
  inspectionType: string;
  score: number;
  status: "passed" | "pending" | "failed";
  date: string;
  defectsCount: number;
}

export interface Payment {
  id: string;
  customer: string;
  phone: string;
  method: string;
  amount: number;
  fee: number;
  status: "paid" | "pending" | "failed" | "refunded";
  date: string;
  reference: string;
  note: string;
}

export interface PaymentQueryOptions {
  search?: string;
  status?: string;
  method?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReportItem {
  id: string;
  name: string;
  category: "Financial" | "Operational" | "Regulatory Audit" | "SLA Performance";
  generatedAt: string;
  size: string;
  format: "PDF" | "CSV" | "XLSX";
}

export type BusinessDomain = "enterprise" | "automotive" | "healthcare" | "hospitality" | "fintech";

export interface DomainLabels {
  bookings?: string;
  operations?: string;
  customers?: string;
  finance?: string;
  analytics?: string;
}

export interface DomainProfile {
  id: BusinessDomain;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  currency: string;
  timezone: string;
  enabledModules: string[];
  labels: DomainLabels;
}


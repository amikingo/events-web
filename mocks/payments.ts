import type { Payment } from "../types";

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "PAY-8841",
    customer: "Example Clinic",
    phone: "+251 911 204 412",
    method: "Telebirr",
    amount: 2550,
    fee: 38,
    status: "paid",
    date: "2026-11-03",
    reference: "TB-77A19C",
    note: "Full package spa booking payment.",
  },
  {
    id: "PAY-8840",
    customer: "Addis Sport Park",
    phone: "+251 912 330 118",
    method: "CBE Birr",
    amount: 800,
    fee: 12,
    status: "pending",
    date: "2026-11-03",
    reference: "CBE-20931",
    note: "Waiting for bank confirmation.",
  },
  {
    id: "PAY-8839",
    customer: "Bole Branch Cafe",
    phone: "+251 913 774 205",
    method: "Wallet",
    amount: 1200,
    fee: 0,
    status: "failed",
    date: "2026-11-02",
    reference: "CW-5521",
    note: "Insufficient wallet balance.",
  },
  {
    id: "PAY-8838",
    customer: "Dire Dawa City Mall",
    phone: "+251 116 670 009",
    method: "Telebirr",
    amount: 38900,
    fee: 584,
    status: "paid",
    date: "2026-11-01",
    reference: "TB-77A0B2",
    note: "Monthly merchant settlement.",
  },
  {
    id: "PAY-8837",
    customer: "Awash Delivery Fleet",
    phone: "+251 922 884 102",
    method: "CBE Birr",
    amount: 4500,
    fee: 67,
    status: "refunded",
    date: "2026-10-31",
    reference: "CBE-19842",
    note: "Customer cancelled prior to dispatch.",
  },
  {
    id: "PAY-8836",
    customer: "Kazanchis Wellness Hub",
    phone: "+251 911 405 918",
    method: "Telebirr",
    amount: 14200,
    fee: 213,
    status: "paid",
    date: "2026-10-30",
    reference: "TB-76E991",
    note: "Quarterly subscription renewal.",
  },
];

export interface PaymentRailConfig {
  id: string;
  name: string;
  logo: "telebirr" | "cbe" | "cheche";
  settlementSpeed: string;
  feePercentage: number;
  status: "operational" | "degraded" | "maintenance";
}

export const PAYMENT_RAILS_CONFIG: PaymentRailConfig[] = [
  {
    id: "telebirr",
    name: "Telebirr SuperApp Switch",
    logo: "telebirr",
    settlementSpeed: "Instant (< 1s)",
    feePercentage: 1.5,
    status: "operational",
  },
  {
    id: "cbe",
    name: "Commercial Bank of Ethiopia (CBE Birr)",
    logo: "cbe",
    settlementSpeed: "Batch (T+0, 15 min)",
    feePercentage: 1.2,
    status: "operational",
  },
  {
    id: "wallet",
    name: "Internal Ledger Wallet",
    logo: "cheche",
    settlementSpeed: "Real-time zero-fee",
    feePercentage: 0,
    status: "operational",
  },
];


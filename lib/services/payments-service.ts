import type { Payment, PaymentQueryOptions, PaginatedResult } from "@/types";
import { MOCK_PAYMENTS } from "@/mocks/payments";

class PaymentsService {
  private data: Payment[] = [...MOCK_PAYMENTS];
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  getSnapshot(): Payment[] {
    return this.data;
  }

  async getAll(): Promise<Payment[]> {
    return [...this.data];
  }

  async query(options: PaymentQueryOptions = {}): Promise<PaginatedResult<Payment>> {
    const { search = "", status, method, page = 1, limit = 10, sortBy = "date", sortOrder = "desc" } = options;

    let filtered = [...this.data];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.reference.toLowerCase().includes(q),
      );
    }

    if (status) {
      filtered = filtered.filter((p) => p.status.toLowerCase() === status.toLowerCase());
    }

    if (method) {
      filtered = filtered.filter((p) => p.method.toLowerCase() === method.toLowerCase());
    }

    filtered.sort((a, b) => {
      const key = sortBy as keyof Payment;
      const aVal = a[key];
      const bVal = b[key];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(id: string): Promise<Payment | null> {
    return this.data.find((p) => p.id === id) ?? null;
  }

  async create(payload: Omit<Payment, "id" | "date" | "fee">): Promise<Payment> {
    const nextCode = "PAY-" + Math.floor(8842 + Math.random() * 1000);
    const newPayment: Payment = {
      ...payload,
      id: nextCode,
      date: new Date().toISOString().split("T")[0]!,
      fee: Math.round(payload.amount * 0.015),
    };

    this.data = [newPayment, ...this.data];
    this.notify();
    return newPayment;
  }

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const index = this.data.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Payment with ID ${id} not found.`);
    }

    const updated = { ...this.data[index]!, ...updates };
    this.data = [...this.data.slice(0, index), updated, ...this.data.slice(index + 1)];
    this.notify();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.data = this.data.filter((p) => p.id !== id);
    this.notify();
    return true;
  }
}

export const paymentsService = new PaymentsService();

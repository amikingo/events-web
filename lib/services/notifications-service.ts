import type { NotificationItem } from "@/types";
import { MOCK_NOTIFICATIONS } from "@/mocks/notifications";

class NotificationsService {
  private notifications: NotificationItem[] = [...MOCK_NOTIFICATIONS];
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

  getSnapshot(): NotificationItem[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  async markAsRead(id: string): Promise<void> {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.notifications = [...this.notifications];
      this.notify();
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notify();
  }
}

export const notificationsService = new NotificationsService();


/**
 * People who can sign in to the product. This is an in-memory store with example data.
 * To connect your API, keep the method names and replace the bodies.
 */

export type MemberRole = "Admin" | "Manager" | "Staff";
export type MemberStatus = "active" | "invited" | "inactive" | "suspended";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  department: string;
  status: MemberStatus;
  joined: string; // ISO date
  lastActive: string; // ISO date
  note: string;
}

// Mock data — replace with your own queries.
const MEMBERS: Member[] = [
  { id: "USR-001", name: "Meron Haile", email: "meron.haile@example.com", phone: "+251 911 204 412", role: "Admin", department: "Management", status: "active", joined: "2026-01-12", lastActive: "2026-11-08", note: "" },
  { id: "USR-002", name: "Yonas Kebede", email: "yonas.kebede@example.com", phone: "+251 922 118 530", role: "Manager", department: "Sales", status: "active", joined: "2026-02-03", lastActive: "2026-11-07", note: "Leads the Addis Ababa sales team." },
  { id: "USR-003", name: "Liya Mengistu", email: "liya.mengistu@example.com", phone: "+251 933 771 204", role: "Staff", department: "Support", status: "active", joined: "2026-03-18", lastActive: "2026-11-08", note: "" },
  { id: "USR-004", name: "Dawit Alemu", email: "dawit.alemu@example.com", phone: "+251 944 305 618", role: "Staff", department: "Finance", status: "invited", joined: "2026-11-05", lastActive: "2026-11-05", note: "Invitation sent. Waiting for them to accept." },
  { id: "USR-005", name: "Selam Tadesse", email: "selam.tadesse@example.com", phone: "+251 955 482 097", role: "Manager", department: "Operations", status: "inactive", joined: "2025-09-21", lastActive: "2026-08-14", note: "On leave until January." },
  { id: "USR-006", name: "Abel Girma", email: "abel.girma@example.com", phone: "+251 966 590 341", role: "Staff", department: "Support", status: "suspended", joined: "2026-04-02", lastActive: "2026-10-01", note: "Suspended after a security review." },
];

class MembersService {
  private data: Member[] = [...MEMBERS];
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** The current list. React reads this through useSyncExternalStore, so it must return the same array until something changes. */
  getSnapshot(): Member[] {
    return this.data;
  }

  create(member: Member): void {
    this.data = [member, ...this.data];
    this.notify();
  }

  update(id: string, changes: Partial<Member>): void {
    this.data = this.data.map((m) => (m.id === id ? { ...m, ...changes } : m));
    this.notify();
  }

  nextId(): string {
    const max = this.data.reduce((n, m) => Math.max(n, Number(m.id.replace("USR-", "")) || 0), 0);
    return `USR-${String(max + 1).padStart(3, "0")}`;
  }
}

export const membersService = new MembersService();

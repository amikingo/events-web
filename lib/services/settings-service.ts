/**
 * Settings that have no backend yet: workspace details, security preferences, sessions and connections.
 * They are saved in this browser (localStorage) so a change stays after a reload.
 * To connect your API, keep the method names and replace the bodies.
 */

export interface WorkspaceSettings {
  name: string;
  /** A small image as a data URL, or null for none. */
  logo: string | null;
  legalName: string;
  industry: string;
  size: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  weekStart: "monday" | "sunday";
}

export interface SecuritySettings {
  twoStep: boolean;
  twoStepMethod: "app" | "sms";
  alertNewSignIn: boolean;
  /** Minutes of inactivity before signing out. */
  timeout: string;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface Connection {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  /** The account or merchant ID the user entered. */
  account: string;
}

export interface SettingsState {
  workspace: WorkspaceSettings;
  security: SecuritySettings;
  /** The profile photo as a data URL, or null for initials. */
  avatar: string | null;
  sessions: Session[];
  connections: Connection[];
}

// Mock data — replace with your own queries.
const DEFAULTS: SettingsState = {
  workspace: {
    name: "Your Brand",
    logo: null,
    legalName: "Example Company PLC",
    industry: "retail",
    size: "11-50",
    email: "hello@example.com",
    phone: "",
    address: "Bole, Addis Ababa",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    weekStart: "monday",
  },
  security: { twoStep: true, twoStepMethod: "app", alertNewSignIn: true, timeout: "60" },
  avatar: null,
  sessions: [
    { id: "s1", device: "Chrome on Windows", location: "Addis Ababa, Ethiopia", lastActive: "Active now", current: true },
    { id: "s2", device: "Safari on iPhone", location: "Addis Ababa, Ethiopia", lastActive: "2 hours ago", current: false },
    { id: "s3", device: "Firefox on Linux", location: "Adama, Ethiopia", lastActive: "3 days ago", current: false },
  ],
  connections: [
    { id: "telebirr", name: "Telebirr", description: "Accept payments and send payouts.", connected: true, account: "TB-204412" },
    { id: "cbe", name: "CBE Birr", description: "Accept payments from bank accounts.", connected: true, account: "CBE-118530" },
    { id: "sms", name: "Text messages", description: "Send sign-in codes and notices by SMS.", connected: false, account: "" },
    { id: "email", name: "Email sending", description: "Send receipts and invitations from your own address.", connected: false, account: "" },
    { id: "webhooks", name: "Webhooks", description: "Tell your other systems when something happens.", connected: false, account: "" },
  ],
};

const STORAGE_KEY = "brandos_settings_v1";

class SettingsService {
  private state: SettingsState = DEFAULTS;
  private loaded = false;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Same object until something changes, as useSyncExternalStore needs. */
  getSnapshot(): SettingsState {
    if (!this.loaded && typeof window !== "undefined") {
      this.loaded = true;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) this.state = { ...DEFAULTS, ...JSON.parse(raw) };
      } catch {
        /* storage unavailable or corrupt: stay on the defaults */
      }
    }
    return this.state;
  }

  getServerSnapshot(): SettingsState {
    return DEFAULTS;
  }

  private commit(next: SettingsState): void {
    this.state = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable: the change still applies for this visit */
    }
    this.listeners.forEach((l) => l());
  }

  saveWorkspace(workspace: WorkspaceSettings): void {
    this.commit({ ...this.getSnapshot(), workspace });
  }

  saveSecurity(changes: Partial<SecuritySettings>): void {
    const s = this.getSnapshot();
    this.commit({ ...s, security: { ...s.security, ...changes } });
  }

  setAvatar(avatar: string | null): void {
    this.commit({ ...this.getSnapshot(), avatar });
  }

  signOutSession(id: string): void {
    const s = this.getSnapshot();
    this.commit({ ...s, sessions: s.sessions.filter((x) => x.id !== id || x.current) });
  }

  signOutOtherSessions(): void {
    const s = this.getSnapshot();
    this.commit({ ...s, sessions: s.sessions.filter((x) => x.current) });
  }

  setConnection(id: string, connected: boolean, account: string): void {
    const s = this.getSnapshot();
    this.commit({ ...s, connections: s.connections.map((c) => (c.id === id ? { ...c, connected, account } : c)) });
  }
}

export const settingsService = new SettingsService();

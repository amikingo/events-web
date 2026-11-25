import { createOrganization, getOrganization, listOrganizations } from "@/lib/api/organizations";
import type { Organization, OrganizationInput } from "@/lib/api/organizations";

/**
 * The organizations the signed-in person can see: every one for a platform role, only their own for a tenant role.
 * Same store shape as the other services (`subscribe` + `getSnapshot`); the snapshot is the same object until
 * something changes.
 */
export interface OrganizationsState {
  /** `"all"` for a platform role, or the one organization id a tenant role may read. */
  scope: string | null;
  organizations: Organization[];
  status: "idle" | "loading" | "ready" | "error";
  /** The error from the last failed load, for `describeApiError`. */
  error: unknown;
}

const INITIAL: OrganizationsState = { scope: null, organizations: [], status: "idle", error: null };

class OrganizationsService {
  private state: OrganizationsState = INITIAL;
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): OrganizationsState => this.state;

  private set(next: Partial<OrganizationsState>): void {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  /** `scope`: `"all"` lists everything (platform roles); an id reads just that organization (tenant roles). */
  async load(scope: string, { force = false } = {}): Promise<void> {
    const { scope: current, status } = this.state;
    if (!force && current === scope && (status === "loading" || status === "ready")) return;

    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.set({ scope, status: "loading", error: null, organizations: current === scope ? this.state.organizations : [] });
    try {
      const organizations = scope === "all" ? await listOrganizations(controller.signal) : [await getOrganization(scope, controller.signal)];
      if (controller.signal.aborted) return;
      this.set({ organizations, status: "ready" });
    } catch (error) {
      if (controller.signal.aborted) return;
      this.set({ status: "error", error });
    }
  }

  /** Forget everything (sign out). */
  reset(): void {
    this.controller?.abort();
    this.set(INITIAL);
  }

  async create(input: OrganizationInput): Promise<Organization> {
    const { organization } = await createOrganization(input);
    this.set({ organizations: [organization, ...this.state.organizations] });
    return organization;
  }
}

export const organizationsService = new OrganizationsService();

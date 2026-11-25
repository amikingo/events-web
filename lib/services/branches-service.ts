import { createBranch, listBranches, setBranchActive, updateBranch } from "@/lib/api/branches";
import type { Branch, BranchInput } from "@/lib/api/branches";

/**
 * The branches of the signed-in organization, loaded from events-api. Same store shape as the other services
 * (`subscribe` + `getSnapshot`, read through `useSyncExternalStore`), so every page and every copy of a page that Next
 * keeps alive sees the same rows. `getSnapshot` returns the same object until something changes.
 */
export interface BranchesState {
  organizationId: string | null;
  branches: Branch[];
  status: "idle" | "loading" | "ready" | "error";
  /** The error from the last failed load, for `describeApiError`. */
  error: unknown;
}

const INITIAL: BranchesState = { organizationId: null, branches: [], status: "idle", error: null };

class BranchesService {
  private state: BranchesState = INITIAL;
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): BranchesState => this.state;

  private set(next: Partial<BranchesState>): void {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  /** Loads the organization's branches. Asking again for the same organization while it loads or is ready does nothing. */
  async load(organizationId: string, { force = false } = {}): Promise<void> {
    const { organizationId: current, status } = this.state;
    if (!force && current === organizationId && (status === "loading" || status === "ready")) return;

    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.set({ organizationId, status: "loading", error: null, branches: current === organizationId ? this.state.branches : [] });
    try {
      const branches = await listBranches(organizationId, controller.signal);
      if (controller.signal.aborted) return;
      this.set({ branches, status: "ready" });
    } catch (error) {
      if (controller.signal.aborted) return;
      this.set({ status: "error", error });
    }
  }

  /** Forget everything (sign out, or another organization). */
  reset(): void {
    this.controller?.abort();
    this.set(INITIAL);
  }

  private replace(branch: Branch): void {
    this.set({ branches: this.state.branches.map((b) => (b.id === branch.id ? branch : b)) });
  }

  async create(organizationId: string, input: BranchInput): Promise<Branch> {
    const branch = await createBranch(organizationId, input);
    this.set({ branches: [branch, ...this.state.branches] });
    return branch;
  }

  async update(organizationId: string, branchId: string, changes: Partial<BranchInput>): Promise<Branch> {
    const branch = await updateBranch(organizationId, branchId, changes);
    this.replace(branch);
    return branch;
  }

  async setActive(organizationId: string, branchId: string, isActive: boolean): Promise<Branch> {
    const branch = await setBranchActive(organizationId, branchId, isActive);
    this.replace(branch);
    return branch;
  }
}

export const branchesService = new BranchesService();

import { ApiError, apiRequest, registerRefresher, setAccessToken } from "@/lib/api/client";
import { clearSessionRoles, setSessionRoles } from "@/lib/api/session-store";

/** Shapes of `POST /v1/auth/staff/login|refresh|switch-assignment` and `GET /v1/auth/staff/me`. */
export interface ApiProfile {
  id: string;
  mobile: string | null;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
}

export interface ApiAssignment {
  id: string;
  organization_id: string | null;
  branch_id: string | null;
  role: { id: string; code: string; name: string };
  organization: { id: string; name: string } | null;
  branch: { id: string; code: string; name: string } | null;
}

export interface StaffToken {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: ApiProfile;
  assignment: ApiAssignment;
  assignments: ApiAssignment[];
}

/** One entry of the menu the API builds for the role in use: already filtered by what the role may view, and ordered. */
export interface NavigationNode {
  id: string;
  /** The module code, the same one permissions use (`BRANCHES`). */
  code: string;
  module_name: string;
  /** The page's path in the API's own naming (`/branches`). `null` for a container that only groups pages. */
  route_name: string | null;
  /** A Lucide icon name (`Building2`). The web app has its own icons, so it maps these. */
  icon: string | null;
  parent_id: string | null;
  sno: number;
  children: NavigationNode[];
}

export interface StaffMe {
  user: ApiProfile;
  assignment: ApiAssignment;
  assignments: ApiAssignment[];
  /** Flat permissions and nested navigation: for showing menus only. The server enforces permissions anyway. */
  permissions: Record<string, unknown>;
  navigation: NavigationNode[];
}

/**
 * The current assignment id is not a secret. It is kept in localStorage so a refresh after a page reload can send it;
 * otherwise a person with several roles gets `409 staff_context_required`. The access token is never stored.
 */
const ASSIGNMENT_KEY = "assignmentId";

function rememberedAssignment(): string | null {
  try {
    return window.localStorage.getItem(ASSIGNMENT_KEY);
  } catch {
    return null;
  }
}

function rememberAssignment(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ASSIGNMENT_KEY, id);
    else window.localStorage.removeItem(ASSIGNMENT_KEY);
  } catch {
    // Storage can be unavailable (private mode). Refresh still works; several-role users may be asked to pick again.
  }
}

function keepToken(result: StaffToken): StaffToken {
  setAccessToken(result.accessToken);
  rememberAssignment(result.assignment.id);
  setSessionRoles(result.assignments, result.assignment.id);
  return result;
}

/** `mobile` can be `09…` or `+251…`. */
export async function loginStaff(mobile: string, password: string): Promise<StaffToken> {
  const result = await apiRequest<StaffToken>("/v1/auth/staff/login", {
    method: "POST",
    auth: false,
    body: { mobile, password, platform: "web", device_name: "Web browser" },
  });
  return keepToken(result);
}

/** Throws `refresh_token_missing` / `refresh_token_invalid` (go to sign-in) or `staff_context_required` (pick a role). */
export async function refreshStaff(assignmentId?: string): Promise<StaffToken> {
  const id = assignmentId ?? rememberedAssignment();
  try {
    const result = await apiRequest<StaffToken>("/v1/auth/staff/refresh", {
      method: "POST",
      auth: false,
      body: id ? { assignment_id: id } : {},
    });
    return keepToken(result);
  } catch (error) {
    setAccessToken(null);
    clearSessionRoles();
    // The session is over, or the remembered role is gone: forget it so the next sign-in starts clean.
    if (error instanceof ApiError && ["refresh_token_missing", "refresh_token_invalid", "staff_assignment_not_found"].includes(error.code)) {
      rememberAssignment(null);
    }
    throw error;
  }
}

/**
 * Clears the in-memory token and the remembered role first, whatever the server answers. The server call is best
 * effort: if it fails the person is still signed out here, and the refresh cookie simply expires on its own.
 */
export async function logoutStaff(): Promise<void> {
  setAccessToken(null);
  rememberAssignment(null);
  clearSessionRoles();
  try {
    await apiRequest<{ revoked: boolean }>("/v1/auth/staff/logout", { method: "POST", auth: false });
  } catch {
    // Nothing for the person to do about it.
  }
}

export function getStaffMe(): Promise<StaffMe> {
  return apiRequest<StaffMe>("/v1/auth/staff/me");
}

export async function switchStaffAssignment(assignmentId: string): Promise<StaffToken> {
  const result = await apiRequest<StaffToken>("/v1/auth/staff/switch-assignment", {
    method: "POST",
    body: { assignment_id: assignmentId },
  });
  return keepToken(result);
}

registerRefresher(async (assignmentId) => {
  await refreshStaff(assignmentId);
});

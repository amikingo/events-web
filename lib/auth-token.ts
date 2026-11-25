/**
 * Parsers that turn the API's login, refresh, switch-assignment and `/me` payloads into typed values.
 *
 * They tolerate older and looser shapes on purpose: snake_case token fields (`access_token`, `expires_in`), an
 * organization without `has_branches`, names sent as `{ en, am }` objects, a missing `assignment` when
 * `assignments` is there. A payload that is missing what a session cannot work without (the token, the user id, a
 * role) throws, because guessing those would hide a broken contract.
 */

export interface StaffProfile {
  id: string;
  mobile: string | null;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
}

/** One of the roles a person holds: which role, in which organization and branch. */
export interface StaffAssignment {
  id: string;
  organizationId: string | null;
  branchId: string | null;
  role: { id: string; code: string; name: string };
  /** `hasBranches: false` (most organizers): hide every branch screen, picker and column. */
  organization: { id: string; name: string; hasBranches: boolean } | null;
  branch: { id: string; code: string; name: string } | null;
}

/** What login, refresh and switch-assignment return. */
export interface StaffToken {
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: StaffProfile;
  assignment: StaffAssignment;
  assignments: StaffAssignment[];
}

export type PermissionAction = "view" | "create" | "update" | "delete" | "import" | "export" | "notify";
export type PermissionMatrix = Partial<Record<PermissionAction, boolean>>;

/** One entry of the menu the API builds for the role in use: already filtered by `view`, and ordered by `sno`. */
export interface NavigationNode {
  id: string;
  /** The module code, the same one permissions use (`EVENTS`). */
  code: string;
  moduleName: string;
  /** The page's path in the API's naming (`/events`). `null` for a container that only groups pages. */
  routeName: string | null;
  /** A Lucide icon name (`Calendar`); the app maps icons by module code instead. */
  icon: string | null;
  parentId: string | null;
  sno: number;
  children: NavigationNode[];
}

/** `GET /v1/auth/staff/me`. */
export interface StaffSession {
  user: StaffProfile;
  assignment: StaffAssignment;
  assignments: StaffAssignment[];
  /** Module code → effective actions for the role in use. */
  permissions: Record<string, PermissionMatrix>;
  navigation: NavigationNode[];
}

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
/** A name may arrive as a plain string or as `{ en, am }`: keep the English one, else the Amharic one. */
const name = (v: unknown): string | null => (isObject(v) ? (str(v.en) ?? str(v.am)) : str(v));
const pick = (o: Raw, ...keys: string[]): unknown => keys.map((k) => o[k]).find((v) => v !== undefined);

class MalformedPayloadError extends Error {
  constructor(what: string) {
    super(`The server sent a ${what} this app can't read.`);
    this.name = "MalformedPayloadError";
  }
}

function parseProfile(raw: unknown): StaffProfile {
  if (!isObject(raw)) throw new MalformedPayloadError("profile");
  const id = str(raw.id) ?? str(raw.user_id) ?? str(raw.sub);
  if (!id) throw new MalformedPayloadError("profile");
  return { id, mobile: str(raw.mobile), firstname: name(raw.firstname), middlename: name(raw.middlename), lastname: name(raw.lastname) };
}

function parseAssignment(raw: unknown): StaffAssignment {
  if (!isObject(raw) || !str(raw.id) || !isObject(raw.role)) throw new MalformedPayloadError("role assignment");
  const role = raw.role;
  const org = isObject(raw.organization) ? raw.organization : null;
  const branch = isObject(raw.branch) ? raw.branch : null;
  return {
    id: raw.id as string,
    organizationId: str(pick(raw, "organization_id", "organizationId")),
    branchId: str(pick(raw, "branch_id", "branchId")),
    role: { id: str(role.id) ?? "", code: str(role.code) ?? "", name: str(role.name) ?? str(role.code) ?? "Role" },
    organization: org
      ? { id: str(org.id) ?? "", name: name(org.name) ?? "Organization", hasBranches: pick(org, "has_branches", "hasBranches") === true }
      : null,
    branch: branch ? { id: str(branch.id) ?? "", code: str(branch.code) ?? "", name: name(branch.name) ?? "" } : null,
  };
}

function parseAssignments(raw: Raw): { assignment: StaffAssignment; assignments: StaffAssignment[] } {
  const list = Array.isArray(raw.assignments) ? raw.assignments.map(parseAssignment) : [];
  const assignment = raw.assignment !== undefined && raw.assignment !== null ? parseAssignment(raw.assignment) : list[0];
  if (!assignment) throw new MalformedPayloadError("session without a role");
  return { assignment, assignments: list.length > 0 ? list : [assignment] };
}

/** Login, refresh and switch-assignment payloads (the `data` of the envelope). */
export function parseStaffToken(raw: unknown): StaffToken {
  if (!isObject(raw)) throw new MalformedPayloadError("sign-in response");
  const accessToken = str(pick(raw, "accessToken", "access_token", "token"));
  if (!accessToken) throw new MalformedPayloadError("sign-in response without a token");
  const expires = Number(pick(raw, "expiresIn", "expires_in"));
  return {
    accessToken,
    // Unknown lifetime: assume the API's documented default (15 minutes) so refresh still gets scheduled.
    expiresIn: Number.isFinite(expires) && expires > 0 ? expires : 900,
    user: parseProfile(raw.user),
    ...parseAssignments(raw),
  };
}

function parseNavigation(raw: unknown): NavigationNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObject).map((n) => ({
    id: str(n.id) ?? str(n.code) ?? "",
    code: str(n.code) ?? "",
    moduleName: name(pick(n, "module_name", "moduleName")) ?? str(n.code) ?? "",
    routeName: str(pick(n, "route_name", "routeName")),
    icon: str(n.icon),
    parentId: str(pick(n, "parent_id", "parentId")),
    sno: Number(n.sno) || 0,
    children: parseNavigation(n.children),
  }));
}

function parsePermissions(raw: unknown): Record<string, PermissionMatrix> {
  if (!isObject(raw)) return {};
  const actions: PermissionAction[] = ["view", "create", "update", "delete", "import", "export", "notify"];
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, m]) => isObject(m))
      .map(([code, m]) => [code, Object.fromEntries(actions.map((a) => [a, (m as Raw)[a] === true]))]),
  );
}

/** `/me` payload (the `data` of the envelope). */
export function parseStaffSession(raw: unknown): StaffSession {
  if (!isObject(raw)) throw new MalformedPayloadError("session");
  return {
    user: parseProfile(raw.user),
    ...parseAssignments(raw),
    permissions: parsePermissions(raw.permissions),
    navigation: parseNavigation(raw.navigation),
  };
}

/**
 * An organization's staff: who holds which role (module USER_ROLES, menu "Staff Assignments"). A person is named by
 * their mobile number; the API looks it up in Cheche's account system itself, so a user id from the browser is never
 * sent or trusted. The API never creates accounts.
 *
 *   GET   /v1/organizations/:organizationId/staff-assignments               ?is_active&page&pageSize
 *   GET   /v1/organizations/:organizationId/staff-lookup                    ?mobile=  who uses this number
 *   POST  /v1/organizations/:organizationId/staff-assignments               { mobile, role_id, branch_id? }  201 given, 200 already had it
 *   PATCH /v1/organizations/:organizationId/staff-assignments/:assignmentId { role_id?, branch_id? }  branch_id null = whole organization
 *   PATCH /v1/organizations/:organizationId/staff-assignments/:assignmentId/status   { is_active }
 *
 * A changed role applies on the person's next request.
 */
import { apiPage, apiRequest, apiRequestWithStatus, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

/** The name and mobile from the account system. `null` when it couldn't be read just now: show the row with a dash. */
export type StaffProfile = { firstname: string | null; middlename: string | null; lastname: string | null; mobile: string | null } | null;

export interface StaffAssignment {
  id: string;
  user_id: string;
  is_active: boolean;
  role: { id: string; code: string; name: string };
  /** null: the role applies to the whole organization. */
  branch: { id: string; code: string; name: string } | null;
  profile: StaffProfile;
}

/** Who uses a mobile number, so the owner can confirm it's the right person before giving a role. */
export interface StaffLookup {
  user_id: string;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
  mobile: string | null;
}

export interface NewStaffAccountInput {
  firstname: string;
  middlename?: string | null;
  lastname: string;
  password: string;
}

export interface StaffProfileUpdateInput {
  firstname?: string;
  middlename?: string | null;
  lastname?: string;
}

export interface StaffAssignmentInput {
  /** `09…` or `+251…`. */
  mobile: string;
  role_id: string;
  /** Only when the organization has branches. */
  branch_id?: string;
  /** Create a new Cheche account when `staff-lookup` reports 404 `central_account_not_found`. */
  new_account?: NewStaffAccountInput;
}

export type StaffAssignmentWithAccountCreated = StaffAssignment & { account_created?: boolean };

export interface StaffListParams {
  page: number;
  pageSize: number;
  isActive?: boolean;
  roleId?: string;
  branchId?: string;
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}`;

export function listStaffAssignments(organizationId: string, params: StaffListParams, signal?: AbortSignal): Promise<Paginated<StaffAssignment>> {
  return apiPage<StaffAssignment>(`${base(organizationId)}/staff-assignments`, {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: {
      is_active: params.isActive === undefined ? undefined : String(params.isActive),
      role_id: params.roleId,
      branch_id: params.branchId,
    },
    signal,
  });
}

export function getStaffAssignment(organizationId: string, assignmentId: string, signal?: AbortSignal): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${base(organizationId)}/staff-assignments/${assignmentId}`, { signal });
}

/** `404 central_account_not_found` when nobody uses that number. */
export function lookUpStaff(organizationId: string, mobile: string, signal?: AbortSignal): Promise<StaffLookup> {
  return apiRequest<StaffLookup>(`${base(organizationId)}/staff-lookup?mobile=${encodeURIComponent(mobile)}`, { signal });
}

/** `roleGiven` is true for 201 (a new assignment, or an old one brought back) and false for 200 (they already had it). */
export async function assignStaff(
  organizationId: string,
  input: StaffAssignmentInput,
): Promise<{ assignment: StaffAssignmentWithAccountCreated; roleGiven: boolean; accountCreated: boolean }> {
  const { data, status } = await apiRequestWithStatus<StaffAssignmentWithAccountCreated>(`${base(organizationId)}/staff-assignments`, {
    method: "POST",
    body: input,
  });
  return { assignment: data, roleGiven: status === 201, accountCreated: Boolean(data.account_created) };
}

/** Names only: never changes mobile, email, password, or status. `409 central_auth_refused` when refused. */
export function updateStaffProfile(organizationId: string, assignmentId: string, changes: StaffProfileUpdateInput): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${base(organizationId)}/staff-assignments/${assignmentId}/profile`, {
    method: "PATCH",
    body: changes,
  });
}

export type StaffOverrideAction = "view" | "create" | "update" | "delete" | "import" | "export" | "notify";

export interface StaffOverrideModule {
  module_code: string;
  module_name: string;
  actions: StaffOverrideAction[];
  role: Record<StaffOverrideAction, boolean>;
  override: Record<StaffOverrideAction, boolean | null>;
  effective: Record<StaffOverrideAction, boolean>;
}

export interface StaffOverrides {
  assignment_id: string;
  role: { id: string; code: string; name: string };
  overridable: boolean;
  modules: StaffOverrideModule[];
}

export interface StaffOverrideInput {
  module_code: string;
  view?: boolean | null;
  create?: boolean | null;
  update?: boolean | null;
  delete?: boolean | null;
  import?: boolean | null;
  export?: boolean | null;
  notify?: boolean | null;
}

export type StaffAssignmentUpdateResult = StaffAssignment & { role_changed?: boolean; override_count?: number };

/** `branch_id: null` makes the role organization-wide again. */
export function changeStaffAssignment(organizationId: string, assignmentId: string, changes: { role_id?: string; branch_id?: string | null }): Promise<StaffAssignmentUpdateResult> {
  return apiRequest<StaffAssignmentUpdateResult>(`${base(organizationId)}/staff-assignments/${assignmentId}`, { method: "PATCH", body: changes });
}

export async function changeStaffAssignmentWithMessage(
  organizationId: string,
  assignmentId: string,
  changes: { role_id?: string; branch_id?: string | null },
): Promise<{ assignment: StaffAssignmentUpdateResult; message?: string }> {
  const { data, message } = await apiRequestWithStatus<StaffAssignmentUpdateResult>(`${base(organizationId)}/staff-assignments/${assignmentId}`, {
    method: "PATCH",
    body: changes,
  });
  return { assignment: data, message };
}

/** `409 last_owner_assignment` when it's the only active Owner. */
export function setStaffActive(organizationId: string, assignmentId: string, isActive: boolean): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${base(organizationId)}/staff-assignments/${assignmentId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

export function getStaffOverrides(organizationId: string, assignmentId: string, signal?: AbortSignal): Promise<StaffOverrides> {
  return apiRequest<StaffOverrides>(`${base(organizationId)}/staff-assignments/${assignmentId}/overrides`, { signal });
}

export function replaceStaffOverrides(organizationId: string, assignmentId: string, overrides: StaffOverrideInput[]): Promise<StaffOverrides> {
  return apiRequest<StaffOverrides>(`${base(organizationId)}/staff-assignments/${assignmentId}/overrides`, {
    method: "PUT",
    body: { overrides },
  });
}

/** `409 last_owner_assignment` or `409 own_assignment`. Returns 204. */
export function deleteStaffAssignment(organizationId: string, assignmentId: string): Promise<void> {
  return apiRequest<void>(`${base(organizationId)}/staff-assignments/${assignmentId}`, { method: "DELETE" });
}

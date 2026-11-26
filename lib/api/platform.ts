/**
 * Platform roles and platform staff (Phase 2e, step 5): platform scope only (`/v1/platform/*`).
 * Only signed-in users with a platform assignment (`organization_id === null`) may use these.
 */
import { apiPage, apiRequest, apiRequestWithStatus, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { ModuleNode } from "@/lib/api/modules";
import type { GrantableModule, Role, RoleGrantInput, RoleUpdateInput } from "@/lib/api/roles";
import type { NewStaffAccountInput, StaffAssignment, StaffAssignmentWithAccountCreated } from "@/lib/api/staff";

const BASE = "/v1/platform";
const ALL_ACTIONS = ["view", "create", "update", "delete", "import", "export", "notify"] as const;

export interface PlatformRoleCreateInput {
  code: string;
  name: string;
  description?: string;
  grants: RoleGrantInput[];
}

export function listPlatformRoles(signal?: AbortSignal): Promise<Role[]> {
  return apiRequest<Role[]>(`${BASE}/roles`, { signal });
}

export function getPlatformRole(roleId: string, signal?: AbortSignal): Promise<Role> {
  return apiRequest<Role>(`${BASE}/roles/${roleId}`, { signal });
}

export function createPlatformRole(input: PlatformRoleCreateInput): Promise<Role> {
  return apiRequest<Role>(`${BASE}/roles`, { method: "POST", body: input });
}

export function updatePlatformRole(roleId: string, changes: RoleUpdateInput): Promise<Role> {
  return apiRequest<Role>(`${BASE}/roles/${roleId}`, { method: "PATCH", body: changes });
}

export function changePlatformRoleStatus(roleId: string, isActive: boolean): Promise<Role> {
  return apiRequest<Role>(`${BASE}/roles/${roleId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

/** Flattens `GET /v1/modules` into active permission modules with all 7 grantable actions for platform roles. */
export function platformGrantableModulesFromTree(nodes: ModuleNode[]): GrantableModule[] {
  const result: GrantableModule[] = [];
  const walk = (list: ModuleNode[]) => {
    for (const node of list) {
      if (node.is_active && node.is_permission) {
        result.push({
          module_code: node.code,
          module_name: node.module_name,
          sno: node.sno,
          actions: [...ALL_ACTIONS],
        });
      }
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

export interface PlatformStaffListParams {
  page: number;
  pageSize: number;
  isActive?: boolean;
  roleId?: string;
}

export interface PlatformStaffCreateInput {
  mobile: string;
  role_id: string;
  new_account?: NewStaffAccountInput;
}

export function listPlatformStaff(params: PlatformStaffListParams, signal?: AbortSignal): Promise<Paginated<StaffAssignment>> {
  return apiPage<StaffAssignment>(`${BASE}/staff-assignments`, {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: {
      is_active: params.isActive === undefined ? undefined : String(params.isActive),
      role_id: params.roleId,
    },
    signal,
  });
}

export function getPlatformStaff(assignmentId: string, signal?: AbortSignal): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${BASE}/staff-assignments/${assignmentId}`, { signal });
}

export async function assignPlatformStaff(
  input: PlatformStaffCreateInput,
): Promise<{ assignment: StaffAssignmentWithAccountCreated; roleGiven: boolean; accountCreated: boolean }> {
  const { data, status } = await apiRequestWithStatus<StaffAssignmentWithAccountCreated>(`${BASE}/staff-assignments`, {
    method: "POST",
    body: input,
  });
  return { assignment: data, roleGiven: status === 201, accountCreated: Boolean(data.account_created) };
}

export function updatePlatformStaff(assignmentId: string, roleId: string): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${BASE}/staff-assignments/${assignmentId}`, {
    method: "PATCH",
    body: { role_id: roleId },
  });
}

export function setPlatformStaffActive(assignmentId: string, isActive: boolean): Promise<StaffAssignment> {
  return apiRequest<StaffAssignment>(`${BASE}/staff-assignments/${assignmentId}/status`, {
    method: "PATCH",
    body: { is_active: isActive },
  });
}

export function deletePlatformStaff(assignmentId: string): Promise<void> {
  return apiRequest<void>(`${BASE}/staff-assignments/${assignmentId}`, { method: "DELETE" });
}

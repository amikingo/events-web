/**
 * Modules (Phase 2d, extended in Phase 2e):
 *
 *   GET   /v1/modules                  every module as a tree
 *   POST  /v1/modules                  create a module
 *   PATCH /v1/modules/:moduleId        edit display and structural fields
 *   PATCH /v1/modules/:moduleId/status switch on or off (`always_on` and parent/child rules apply)
 */
import { apiRequest, apiRequestWithStatus } from "@/lib/api-client";

export interface ModuleNode {
  id: string;
  code: string;
  module_name: string;
  description: string | null;
  parent_id: string | null;
  sno: number;
  icon: string | null;
  route_name: string | null;
  is_menu: boolean;
  is_permission: boolean;
  is_active: boolean;
  /** Core modules checked in code: route_name and is_permission are fixed. */
  is_core: boolean;
  /** Required by admin screens: cannot be switched off. */
  always_on: boolean;
  children: ModuleNode[];
}

export interface ModuleCreateInput {
  code: string;
  module_name: string;
  description?: string | null;
  parent_id?: string | null;
  sno?: number;
  icon?: string | null;
  route_name?: string | null;
  is_menu: boolean;
  is_permission: boolean;
}

export interface ModuleUpdateInput {
  module_name?: string;
  description?: string | null;
  sno?: number;
  icon?: string | null;
  parent_id?: string | null;
  route_name?: string | null;
  is_menu?: boolean;
  is_permission?: boolean;
}

export function listModules(signal?: AbortSignal): Promise<ModuleNode[]> {
  return apiRequest<ModuleNode[]>("/v1/modules", { signal });
}

export function createModule(input: ModuleCreateInput): Promise<ModuleNode> {
  return apiRequest<ModuleNode>("/v1/modules", { method: "POST", body: input });
}

export function updateModule(moduleId: string, changes: ModuleUpdateInput): Promise<ModuleNode> {
  return apiRequest<ModuleNode>(`/v1/modules/${moduleId}`, {
    method: "PATCH",
    body: changes,
  });
}

export async function changeModuleStatus(moduleId: string, isActive: boolean): Promise<{ module: ModuleNode; message?: string }> {
  const { data, message } = await apiRequestWithStatus<ModuleNode>(`/v1/modules/${moduleId}/status`, {
    method: "PATCH",
    body: { is_active: isActive },
  });
  return { module: data, message };
}

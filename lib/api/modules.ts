/**
 * Modules (Phase 2d, Super Admin):
 *
 *   GET   /v1/modules             every module as a tree
 *   PATCH /v1/modules/:moduleId   edit display name, description, order (`sno`), icon
 */
import { apiRequest } from "@/lib/api-client";

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
  children: ModuleNode[];
}

export interface ModuleUpdateInput {
  module_name?: string;
  description?: string | null;
  sno?: number;
  icon?: string | null;
}

export function listModules(signal?: AbortSignal): Promise<ModuleNode[]> {
  return apiRequest<ModuleNode[]>("/v1/modules", { signal });
}

export function updateModule(moduleId: string, changes: ModuleUpdateInput): Promise<Omit<ModuleNode, "children"> & { children?: ModuleNode[] }> {
  return apiRequest<Omit<ModuleNode, "children"> & { children?: ModuleNode[] }>(`/v1/modules/${moduleId}`, {
    method: "PATCH",
    body: changes,
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, createElement, useState } from "react";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EditIcon, PlusIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { parseRecordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { describeApiError } from "@/lib/api/errors";
import { changeModuleStatus, createModule, listModules, updateModule } from "@/lib/api/modules";
import type { ModuleCreateInput, ModuleNode, ModuleUpdateInput } from "@/lib/api/modules";
import { MODULE_CODES } from "@/lib/constants/modules";
import { moduleQk } from "@/lib/query-keys";
import { iconForModule } from "@/lib/rbac/module-sidebar";
import { ModuleForm } from "./module-form";

const BASE = "/admin/access/modules";
const MODULE = MODULE_CODES.MODULES;
const CORE_TOOLTIP = "The app depends on this module. Its route and permission setting can't change.";

function go(path: string) {
  window.history.pushState(null, "", path);
}

function findModule(nodes: ModuleNode[], id: string): ModuleNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findModule(node.children, id);
    if (found) return found;
  }
  return undefined;
}

function kindOf(node: ModuleNode): "Permission module" | "Link" | "Menu group" {
  if (node.is_permission) return "Permission module";
  if (node.route_name) return "Link";
  return "Menu group";
}

function ModuleRow({
  node,
  depth,
  canUpdate,
  onToggleStatus,
}: {
  node: ModuleNode;
  depth: number;
  canUpdate: boolean;
  onToggleStatus: (node: ModuleNode, isActive: boolean) => void;
}) {
  const isGroup = node.children.length > 0 && !node.route_name;

  return (
    <div
      className={
        isGroup
          ? "flex flex-col gap-3 bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between"
      }
      style={depth > 0 ? { paddingLeft: `${Math.min(depth, 3) * 20 + 16}px` } : undefined}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-sm border border-border bg-surface text-text-soft"
          aria-hidden="true"
        >
          {createElement(iconForModule(node.code, node.icon), { className: "size-4" })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={isGroup ? "type-body font-semibold text-text" : "type-body font-medium text-text"}>
              {node.module_name}
            </span>
            <code className="text-[11.5px] text-text-faint">{node.code}</code>
            <Pill size="sm">{kindOf(node)}</Pill>
            {node.is_core && (
              <Tooltip content={CORE_TOOLTIP}>
                <span tabIndex={0} className="inline-flex">
                  <Pill size="sm">Core</Pill>
                </span>
              </Tooltip>
            )}
            {node.always_on && <Pill size="sm">Always on</Pill>}
          </div>
          {node.description && <p className="m-0 mt-0.5 type-body-sm text-text-soft">{node.description}</p>}
          {node.route_name && <p className="m-0 mt-0.5 font-mono text-[11.5px] text-text-faint">{node.route_name}</p>}
          {canUpdate && node.always_on && (
            <p className="m-0 mt-0.5 text-[11.5px] text-text-faint">The admin screens need this module, so it stays on.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pl-11 sm:pl-0">
        <span className="type-body-sm tabular-nums text-text-faint">Order {node.sno}</span>
        <StatusPill kind="account" status={node.is_active ? "active" : "inactive"} size="sm" />
        {canUpdate && (
          <>
            <Button variant="secondary" onClick={() => go(`${BASE}/${node.id}/edit`)}>
              <EditIcon className="size-3.5" />
              Edit
            </Button>
            {!node.always_on && (
              <Button variant="secondary" onClick={() => onToggleStatus(node, !node.is_active)}>
                {node.is_active ? "Switch off" : "Switch on"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ModuleBranch({
  nodes,
  depth = 0,
  canUpdate,
  onToggleStatus,
}: {
  nodes: ModuleNode[];
  depth?: number;
  canUpdate: boolean;
  onToggleStatus: (node: ModuleNode, isActive: boolean) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id} className="divide-y divide-border">
          <ModuleRow node={node} depth={depth} canUpdate={canUpdate} onToggleStatus={onToggleStatus} />
          {node.children.length > 0 && (
            <ModuleBranch nodes={node.children} depth={depth + 1} canUpdate={canUpdate} onToggleStatus={onToggleStatus} />
          )}
        </div>
      ))}
    </>
  );
}

function ModulesView() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);
  const canCreate = can("create", MODULE);
  const canUpdate = can("update", MODULE);
  const [statusTarget, setStatusTarget] = useState<{ mod: ModuleNode; isActive: boolean } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: moduleQk.tree(),
    queryFn: ({ signal }) => listModules(signal),
  });
  const tree = query.data ?? [];

  const refreshTreeAndMenu = async () => {
    await queryClient.invalidateQueries({ queryKey: moduleQk.all() });
    await queryClient.refetchQueries({ queryKey: ["user", "effective-access"] });
  };

  const create = useMutation({
    mutationFn: (input: ModuleCreateInput) => createModule(input),
    onSuccess: refreshTreeAndMenu,
  });

  const save = useMutation({
    mutationFn: ({ moduleId, changes }: { moduleId: string; changes: ModuleUpdateInput }) => updateModule(moduleId, changes),
    onSuccess: refreshTreeAndMenu,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ moduleId, isActive }: { moduleId: string; isActive: boolean }) => changeModuleStatus(moduleId, isActive),
    onSuccess: async ({ module: updated, message }) => {
      await refreshTreeAndMenu();
      setStatusTarget(null);
      setStatusError(null);
      toast.success(updated.is_active ? "Module switched on" : "Module switched off", message ? { body: message } : undefined);
    },
    onError: (err) => {
      setStatusError(describeApiError(err, "module"));
    },
  });

  if (query.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load modules"
        description={describeApiError(query.error, "module")}
        actions={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  if (location.mode === "create") {
    if (!canCreate) {
      return (
        <EmptyState
          size="lg"
          title="You don't have permission to create modules"
          description="Ask a Super Admin for Modules create access."
          actions={<Button onClick={() => go(BASE)}>Back to modules</Button>}
        />
      );
    }
    return (
      <ModuleForm
        key="new"
        tree={tree}
        onCancel={() => go(BASE)}
        onCreate={async (input) => {
          await create.mutateAsync(input);
          toast.success("Module created", { body: "The navigation menu has been refreshed." });
          go(BASE);
        }}
        onUpdate={async () => undefined}
      />
    );
  }

  if (location.mode === "edit" || location.mode === "page") {
    if (!canUpdate) {
      return (
        <EmptyState
          size="lg"
          title="You don't have permission to edit modules"
          description="Ask a Super Admin for Modules update access."
          actions={<Button onClick={() => go(BASE)}>Back to modules</Button>}
        />
      );
    }
    const existing = findModule(tree, String(location.id));
    if (!existing) {
      if (query.isPending) return null;
      return (
        <EmptyState
          size="lg"
          title="This module doesn't exist"
          description="It may not be available. Go back to the module list."
          actions={<Button onClick={() => go(BASE)}>Back to modules</Button>}
        />
      );
    }

    return (
      <ModuleForm
        key={existing.id}
        mod={existing}
        tree={tree}
        onCancel={() => go(BASE)}
        onCreate={async () => undefined}
        onUpdate={async (changes) => {
          if (Object.keys(changes).length > 0) {
            await save.mutateAsync({ moduleId: existing.id, changes });
            toast.success("Module updated", { body: "The navigation menu has been refreshed." });
          }
          go(BASE);
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 m-0 text-text">Modules</h1>
            <p className="type-body m-0 text-text-soft">
              Manage menu structure, routes, permissions and availability across the admin workspace.
            </p>
          </div>
          <Can I="create" a={MODULE}>
            <Button onClick={() => go(`${BASE}/new`)}>
              <PlusIcon className="size-4" />
              New module
            </Button>
          </Can>
        </div>

        <Card>
          <CardHeader title="Navigation & permissions" subtitle="Groups and their modules, switched-off ones included, in menu order." />
          {query.isPending ? (
            <SkeletonStack>
              <Skeleton shape="block" />
              <Skeleton shape="block" />
              <Skeleton shape="block" />
            </SkeletonStack>
          ) : tree.length === 0 ? (
            <EmptyState size="sm" title="No modules" description="No modules were returned by the server." />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-sm border border-border">
              <ModuleBranch
                nodes={tree}
                canUpdate={canUpdate}
                onToggleStatus={(mod, isActive) => {
                  setStatusError(null);
                  setStatusTarget({ mod, isActive });
                }}
              />
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusError(null);
          }
        }}
        tone={statusTarget?.isActive ? "accent" : "warning"}
        title={statusTarget ? (statusTarget.isActive ? `Switch on ${statusTarget.mod.module_name}?` : `Switch off ${statusTarget.mod.module_name}?`) : ""}
        description={
          statusTarget
            ? statusTarget.isActive
              ? `Switch on ${statusTarget.mod.module_name}? Everyone whose role gives access gets it back.`
              : `Switch off ${statusTarget.mod.module_name}? Nobody will be able to use it, the Super Admin included, and it leaves every menu. Roles keep their access for when you switch it back on.`
            : undefined
        }
        confirmLabel={statusTarget?.isActive ? "Switch on" : "Switch off"}
        loading={toggleStatus.isPending}
        loadingLabel={statusTarget?.isActive ? "Switching on" : "Switching off"}
        error={statusError ?? undefined}
        onConfirm={() => {
          if (!statusTarget) return;
          setStatusError(null);
          toggleStatus.mutate({ moduleId: statusTarget.mod.id, isActive: statusTarget.isActive });
        }}
      />
    </>
  );
}

export default function ModulesPage() {
  return (
    <Suspense>
      <ModulesView />
    </Suspense>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, createElement } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EditIcon } from "@/components/ui/icons";
import { parseRecordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { listModules, updateModule } from "@/lib/api/modules";
import type { ModuleNode, ModuleUpdateInput } from "@/lib/api/modules";
import { MODULE_CODES } from "@/lib/constants/modules";
import { moduleQk } from "@/lib/query-keys";
import { iconForModule } from "@/lib/rbac/module-sidebar";
import { ModuleForm } from "./module-form";

const BASE = "/admin/access/modules";
const MODULE = MODULE_CODES.MODULES;

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

function ModuleRow({
  node,
  depth,
  canUpdate,
}: {
  node: ModuleNode;
  depth: number;
  canUpdate: boolean;
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
          </div>
          {node.description && <p className="m-0 mt-0.5 type-body-sm text-text-soft">{node.description}</p>}
          {node.route_name && <p className="m-0 mt-0.5 font-mono text-[11.5px] text-text-faint">{node.route_name}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-11 sm:pl-0">
        <span className="type-body-sm tabular-nums text-text-faint">Order {node.sno}</span>
        <StatusPill kind="account" status={node.is_active ? "active" : "inactive"} size="sm" />
        {canUpdate && (
          <Button variant="secondary" onClick={() => go(`${BASE}/${node.id}/edit`)}>
            <EditIcon className="size-3.5" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function ModuleBranch({
  nodes,
  depth = 0,
  canUpdate,
}: {
  nodes: ModuleNode[];
  depth?: number;
  canUpdate: boolean;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id} className="divide-y divide-border">
          <ModuleRow node={node} depth={depth} canUpdate={canUpdate} />
          {node.children.length > 0 && <ModuleBranch nodes={node.children} depth={depth + 1} canUpdate={canUpdate} />}
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
  const canUpdate = can("update", MODULE);

  const query = useQuery({
    queryKey: moduleQk.tree(),
    queryFn: ({ signal }) => listModules(signal),
  });
  const tree = query.data ?? [];

  const save = useMutation({
    mutationFn: ({ moduleId, changes }: { moduleId: string; changes: ModuleUpdateInput }) => updateModule(moduleId, changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleQk.all() });
      // Refresh `/me` so the sidebar picks up the updated module name, order and icon immediately.
      void queryClient.invalidateQueries({ queryKey: ["user", "effective-access"] });
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

  if (location.mode === "edit" || location.mode === "page") {
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
        onCancel={() => go(BASE)}
        onSave={async (changes) => {
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 m-0 text-text">Modules</h1>
        <p className="type-body m-0 text-text-soft">
          Customize module names, descriptions, icons and menu order across the admin workspace.
        </p>
      </div>

      <Card>
        <CardHeader title="Navigation & permissions" subtitle="Groups and their modules, in the order they appear in the menu." />
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
            <ModuleBranch nodes={tree} canUpdate={canUpdate} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ModulesPage() {
  return (
    <Suspense>
      <ModulesView />
    </Suspense>
  );
}

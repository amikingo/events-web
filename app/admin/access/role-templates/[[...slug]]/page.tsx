"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Copy } from "lucide-react";
import { InfoIcon, PlusIcon, ShieldIcon } from "@/components/ui/icons";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { listGrantableModules } from "@/lib/api/roles";
import {
  changeRoleTemplateStatus,
  createRoleTemplate,
  listRoleTemplates,
  updateRoleTemplate,
} from "@/lib/api/role-templates";
import type {
  RoleTemplate,
  RoleTemplateCreateInput,
  RoleTemplateGrant,
  RoleTemplateUpdateInput,
} from "@/lib/api/role-templates";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatNumber } from "@/lib/format";
import { useOrganization } from "@/lib/organization-context";
import { roleQk, roleTemplateQk } from "@/lib/query-keys";
import { DEFAULT_GRANTABLE_FALLBACK } from "@/app/admin/access/_components/grant-grid";
import { RoleTemplateForm } from "./role-template-form";

const BASE = "/admin/access/role-templates";
const MODULE = MODULE_CODES.ROLE_TEMPLATES;
const ACTIONS = ["view", "create", "update", "delete", "import", "export", "notify"] as const;

const statusPill = (t: RoleTemplate) => <StatusPill kind="account" status={t.is_active ? "active" : "inactive"} />;
const allowed = (g: RoleTemplateGrant) =>
  ACTIONS.filter((a) => g[a])
    .map((a) => a[0]!.toUpperCase() + a.slice(1))
    .join(", ");
const activeGrants = (t: RoleTemplate) => t.grants.filter((g) => ACTIONS.some((a) => g[a]));

const columns: ColumnDef<RoleTemplate>[] = [
  {
    key: "name",
    header: "Template",
    primary: true,
    filterValue: (t) => t.name,
    accessor: (t) => (
      <div className="flex items-center gap-3">
        <Avatar initials={t.name.slice(0, 2).toUpperCase()} size={32} />
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-body font-medium text-text">{t.name}</span>
            {t.for_new_organizations && (
              <Pill tone="neutral" size="sm">
                For new organizations
              </Pill>
            )}
          </div>
          <span className="type-body-sm text-text-faint">{t.description ?? "No description"}</span>
        </div>
      </div>
    ),
  },
  { key: "code", header: "Code", accessor: (t) => <span className="font-mono">{t.code}</span> },
  { key: "modules", header: "Modules", numeric: true, filterValue: (t) => t.grant_count, accessor: (t) => formatNumber(t.grant_count) },
  { key: "status", header: "Status", filterValue: (t) => (t.is_active ? "active" : "inactive"), render: statusPill },
];

function go(path: string) {
  window.history.pushState(null, "", path);
}

function TemplateGrants({ template }: { template: RoleTemplate }) {
  const rows = activeGrants(template);
  return (
    <div className="flex flex-col gap-4">
      <Note icon={<InfoIcon />}>Roles made from a template are copies. Editing a template never changes them.</Note>
      <div>
        <RecordHeading>What this template gives</RecordHeading>
        {rows.length === 0 ? (
          <EmptyState size="sm" icon={<ShieldIcon />} title="No access" description="Roles made from this template start with no access." />
        ) : (
          <RecordKv items={rows.map((g) => ({ label: g.module_name, value: allowed(g) }))} />
        )}
        {template.locked && (
          <Note icon={<InfoIcon />}>The Owner template always has full access and can&apos;t be changed.</Note>
        )}
      </div>
    </div>
  );
}

function RoleTemplatesView() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const { organizationId, choices } = useOrganization();
  const location = parseRecordPath(BASE, pathname);

  const [statusTarget, setStatusTarget] = useState<{ template: RoleTemplate; isActive: boolean } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isFormMode = location.mode === "create" || location.mode === "edit";
  const orgForGrantables = organizationId ?? choices[0]?.id ?? null;

  const query = useQuery({
    queryKey: roleTemplateQk.list(),
    queryFn: ({ signal }) => listRoleTemplates(signal),
  });
  const grantable = useQuery({
    queryKey: orgForGrantables ? roleQk.grantableModules(orgForGrantables) : ["roles", "grantable-modules", "none"],
    queryFn: ({ signal }) => listGrantableModules(orgForGrantables!, signal),
    enabled: isFormMode && Boolean(orgForGrantables),
  });
  const templates = query.data ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: roleTemplateQk.all() });
  };

  const create = useMutation({
    mutationFn: (input: RoleTemplateCreateInput) => createRoleTemplate(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ templateId, changes }: { templateId: string; changes: RoleTemplateUpdateInput }) => updateRoleTemplate(templateId, changes),
    onSuccess: invalidate,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ templateId, isActive }: { templateId: string; isActive: boolean }) => changeRoleTemplateStatus(templateId, isActive),
    onSuccess: (updated) => {
      invalidate();
      setStatusTarget(null);
      setStatusError(null);
      toast.success(updated.is_active ? "Template switched on" : "Template switched off");
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.code === "role_locked" || err.code === "permission_denied")) {
        setStatusTarget(null);
        setStatusError(null);
        toast.error(describeApiError(err, "template"));
        return;
      }
      setStatusError(describeApiError(err, "template"));
    },
  });

  if (query.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load role templates"
        description={describeApiError(query.error, "template")}
        actions={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newTemplateButton = (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        <PlusIcon className="size-4" />
        New template
      </Button>
    </Can>
  );

  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? templates.find((t) => t.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (query.isPending) return null;
      return (
        <EmptyState
          size="lg"
          title="This template doesn't exist"
          description="It may have been removed. Go back to the list."
          actions={<Button onClick={() => go(BASE)}>Back to templates</Button>}
        />
      );
    }
    if (existing?.locked) {
      return (
        <EmptyState
          size="lg"
          icon={<ShieldIcon />}
          title="The Owner template can't be changed"
          description="The Owner template always has full access and can't be changed."
          actions={<Button onClick={() => go(`${BASE}/${existing.id}`)}>Back to template</Button>}
        />
      );
    }
    if (orgForGrantables && grantable.isPending) {
      return (
        <SkeletonStack>
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonStack>
      );
    }
    if (orgForGrantables && grantable.isError) {
      return (
        <EmptyState
          size="lg"
          tone="danger"
          title="We couldn't load the module list"
          description={describeApiError(grantable.error, "template")}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => go(existing ? `${BASE}/${existing.id}` : BASE)}>
                Cancel
              </Button>
              <Button onClick={() => void grantable.refetch()}>Try again</Button>
            </div>
          }
        />
      );
    }
    const resolvedModules = orgForGrantables && grantable.data ? grantable.data : [...DEFAULT_GRANTABLE_FALLBACK];
    return (
      <RoleTemplateForm
        key={`${existing?.id ?? "new"}:${resolvedModules.map((m) => m.module_code).join(",")}`}
        template={existing}
        grantableModules={resolvedModules}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onCreate={async (input) => {
          const created = await create.mutateAsync(input);
          toast.success("Template created");
          go(`${BASE}/${created.id}`);
        }}
        onUpdate={async (changes) => {
          const saved = Object.keys(changes).length ? await update.mutateAsync({ templateId: existing!.id, changes }) : existing!;
          toast.success("Changes saved");
          go(`${BASE}/${saved.id}`);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Note icon={<InfoIcon />}>Roles made from a template are copies. Editing a template never changes them.</Note>

      <RecordWorkspace
        fit
        inlineToasts={false}
        className={location.mode === "list" ? undefined : "h-[calc(100vh-310px)] min-h-[520px]"}
        records={templates}
        getId={(t) => t.id}
        noun="template"
        listLabel="Role templates"
        location={location}
        onLocationChange={(next) => go(recordPath(BASE, next))}
        list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
          <Table
            columns={columns}
            data={templates}
            getRowId={(t) => t.id}
            title="Role templates"
            loading={query.isPending}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            emptyState={
              <EmptyState
                icon={<Copy className="size-5" />}
                title="No templates yet"
                description="Create a template for common roles so new organizations start with them."
                actions={newTemplateButton}
              />
            }
            toolbarActions={newTemplateButton}
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(t, api) => ({
          avatar: <Avatar initials={t.name.slice(0, 2).toUpperCase()} size={48} />,
          name: t.name,
          status: statusPill(t),
          meta: (
            <span className="inline-flex flex-wrap items-center gap-2">
              <code>{t.code}</code>
              {t.for_new_organizations && (
                <Pill tone="neutral" size="sm">
                  For new organizations
                </Pill>
              )}
            </span>
          ),
          primary: !t.locked && canUpdate ? { label: "Edit template", onClick: () => api.edit(t) } : undefined,
          menu:
            t.locked || !canUpdate
              ? []
              : [
                  t.is_active
                    ? {
                        label: "Switch off",
                        destructive: true,
                        onClick: () => {
                          setStatusError(null);
                          setStatusTarget({ template: t, isActive: false });
                        },
                      }
                    : {
                        label: "Switch on",
                        onClick: () => {
                          setStatusError(null);
                          setStatusTarget({ template: t, isActive: true });
                        },
                      },
                ],
        })}
        stats={(t) => [
          { label: "Modules", value: String(t.grant_count) },
          { label: "New orgs", value: t.for_new_organizations ? "Yes" : "No" },
          { label: "Status", value: t.is_active ? "Active" : "Switched off" },
        ]}
        panel={(t) => <TemplateGrants template={t} />}
        page={{
          tabs: [{ id: "access", label: "Access" }],
          content: (t) => <TemplateGrants template={t} />,
          rail: (t) => (
            <RecordRailCard title="Template">
              <RecordKv
                single
                items={[
                  { label: "Code", value: t.code },
                  { label: "Description", value: t.description ?? "None" },
                  { label: "New orgs", value: t.for_new_organizations ? "Included automatically" : "Optional starter" },
                  { label: "Status", value: statusPill(t) },
                ]}
              />
              {t.locked && <Pill>Read only</Pill>}
            </RecordRailCard>
          ),
        }}
        form={{
          sections: [],
          toValues: () => ({}),
          onSave: (_values, existing) => {
            if (existing) return existing;
            throw new Error("Use the form page.");
          },
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusError(null);
          }
        }}
        tone={statusTarget?.isActive ? "accent" : "warning"}
        title={statusTarget ? (statusTarget.isActive ? `Switch on ${statusTarget.template.name}?` : `Switch off ${statusTarget.template.name}?`) : ""}
        description={
          statusTarget?.isActive
            ? "Organizations can start roles from this template again."
            : "Existing roles made from this template don't change, and organizations won't see it when creating a new role."
        }
        confirmLabel={statusTarget?.isActive ? "Switch on" : "Switch off"}
        loading={toggleStatus.isPending}
        loadingLabel={statusTarget?.isActive ? "Switching on" : "Switching off"}
        error={statusError ?? undefined}
        onConfirm={() => {
          if (!statusTarget) return;
          setStatusError(null);
          toggleStatus.mutate({ templateId: statusTarget.template.id, isActive: statusTarget.isActive });
        }}
      />
    </div>
  );
}

export default function RoleTemplatesPage() {
  return (
    <Suspense>
      <RoleTemplatesView />
    </Suspense>
  );
}

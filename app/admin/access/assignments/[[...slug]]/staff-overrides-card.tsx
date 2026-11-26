"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import { AlertCircleIcon, InfoIcon, ShieldIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError, grantExceedsOwnAccessMessage } from "@/lib/api/errors";
import { listGrantableModules } from "@/lib/api/roles";
import type { GrantableModule } from "@/lib/api/roles";
import { getStaffOverrides, replaceStaffOverrides } from "@/lib/api/staff";
import type { StaffOverrideAction, StaffOverrideInput, StaffOverrideModule, StaffOverrides } from "@/lib/api/staff";
import { useAuth } from "@/lib/auth-context";
import { MODULE_CODES } from "@/lib/constants/modules";
import { roleQk, staffQk } from "@/lib/query-keys";
import { ALL_GRANT_ACTIONS, sortGrantableModules } from "@/app/admin/access/_components/grant-grid";
import { cn } from "@/lib/utils";

type ChoiceValue = "follow" | "allow" | "deny";
type DraftFlags = Record<StaffOverrideAction, boolean | null>;
type DraftMap = Record<string, DraftFlags>;

const ACTION_LABELS: Record<StaffOverrideAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  import: "Import",
  export: "Export",
  notify: "Notify",
};

const OPTIONS: { value: ChoiceValue; label: string }[] = [
  { value: "follow", label: "Follow role" },
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

function emptyOverrideFlags(): DraftFlags {
  return { view: null, create: null, update: null, delete: null, import: null, export: null, notify: null };
}

function toChoice(value: boolean | null | undefined): ChoiceValue {
  if (value === true) return "allow";
  if (value === false) return "deny";
  return "follow";
}

function fromChoice(choice: string): boolean | null {
  if (choice === "allow") return true;
  if (choice === "deny") return false;
  return null;
}

function mergeModulesWithGrantables(
  overrideModules: StaffOverrideModule[],
  grantableModules: GrantableModule[] | undefined,
): StaffOverrideModule[] {
  if (!grantableModules || grantableModules.length === 0) return overrideModules;
  const byCode = new Map(overrideModules.map((m) => [m.module_code, m]));
  const ordered = sortGrantableModules(grantableModules);
  const merged: StaffOverrideModule[] = [];
  for (const gm of ordered) {
    const existing = byCode.get(gm.module_code);
    if (existing) {
      merged.push({
        ...existing,
        module_name: gm.module_name,
        actions: gm.actions,
      });
    }
  }
  for (const m of overrideModules) {
    if (!merged.some((x) => x.module_code === m.module_code)) merged.push(m);
  }
  return merged;
}

function buildDraft(modules: StaffOverrideModule[]): DraftMap {
  const draft: DraftMap = {};
  for (const mod of modules) {
    const row = emptyOverrideFlags();
    for (const action of ALL_GRANT_ACTIONS) {
      row[action] = mod.override[action] ?? null;
    }
    draft[mod.module_code] = row;
  }
  return draft;
}

function draftMatches(modules: StaffOverrideModule[], draft: DraftMap): boolean {
  return modules.every((mod) => {
    const current = draft[mod.module_code];
    return mod.actions.every((action) => (current?.[action] ?? null) === (mod.override[action] ?? null));
  });
}

function rowDiffersFromRole(mod: StaffOverrideModule, flags: DraftFlags | undefined): boolean {
  return mod.actions.some((action) => {
    const overrideVal = flags?.[action] ?? null;
    const effective = overrideVal ?? Boolean(mod.role[action]);
    return effective !== Boolean(mod.role[action]);
  });
}

function readOnlyLabel(overrideVal: boolean | null, roleVal: boolean): { text: string; tone: "neutral" | "success" | "danger" } {
  if (overrideVal === true) return { text: "Allow", tone: "success" };
  if (overrideVal === false) return { text: "Deny", tone: "danger" };
  return { text: roleVal ? "Follow role (yes)" : "Follow role (no)", tone: "neutral" };
}

interface OverridesEditorProps {
  organizationId: string;
  assignmentId: string;
  data: StaffOverrides;
  modules: StaffOverrideModule[];
  editable: boolean;
  isOwnAssignment: boolean;
}

function OverridesEditor({ organizationId, assignmentId, data, modules, editable, isOwnAssignment }: OverridesEditorProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftMap>(() => buildDraft(modules));
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const dirty = editable && !draftMatches(modules, draft);

  const moduleNames: Record<string, string> = {};
  for (const mod of modules) moduleNames[mod.module_code] = mod.module_name;

  const save = useMutation({
    mutationFn: (payload: StaffOverrideInput[]) => replaceStaffOverrides(organizationId, assignmentId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(staffQk.overrides(organizationId, assignmentId), updated);
      setDraft(buildDraft(mergeModulesWithGrantables(updated.modules, undefined)));
      setRowErrors({});
      setBannerError(null);
      toast.success("Access saved", { body: "Changes apply on their next request." });
    },
  });

  function setAction(moduleCode: string, action: StaffOverrideAction, nextVal: boolean | null) {
    setDraft((prev) => ({
      ...prev,
      [moduleCode]: {
        ...(prev[moduleCode] ?? emptyOverrideFlags()),
        [action]: nextVal,
      },
    }));
    if (rowErrors[moduleCode]) {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[moduleCode];
        return next;
      });
    }
    if (bannerError) setBannerError(null);
  }

  async function handleSave() {
    const payload: StaffOverrideInput[] = modules.map((mod) => {
      const current = draft[mod.module_code] ?? emptyOverrideFlags();
      const entry: StaffOverrideInput = { module_code: mod.module_code };
      for (const action of mod.actions) {
        entry[action] = current[action] ?? null;
      }
      return entry;
    });

    setRowErrors({});
    setBannerError(null);
    try {
      await save.mutateAsync(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "grant_exceeds_own_access") {
          toast.error(grantExceedsOwnAccessMessage(err.details, moduleNames));
          return;
        }
        if (err.code === "owner_not_overridable" || err.code === "own_assignment" || err.code === "permission_denied") {
          toast.error(describeApiError(err, "person"));
          return;
        }
        if (err.code === "validation_error") {
          const issues = (err.details as { issues?: Array<{ path?: string; message?: string }> } | undefined)?.issues;
          if (Array.isArray(issues) && issues.length > 0) {
            const nextRows: Record<string, string> = {};
            const unmatched: string[] = [];
            for (const issue of issues) {
              const path = issue.path ?? "";
              const msg = issue.message ?? "Check this value.";
              if (path.startsWith("body.overrides.")) {
                const idx = Number(path.split(".")[2]);
                const modCode = Number.isInteger(idx) ? payload[idx]?.module_code : undefined;
                if (modCode) nextRows[modCode] = msg;
                else unmatched.push(msg);
              } else {
                unmatched.push(msg);
              }
            }
            setRowErrors(nextRows);
            if (unmatched.length > 0) setBannerError(unmatched[0]!);
            return;
          }
        }
      }
      setBannerError(describeApiError(err, "person"));
    }
  }

  return (
    <Card id="access-card">
      <CardHeader
        title="Access"
        subtitle={`Effective permissions on top of ${data.role.name}. Changes apply on their next request.`}
        action={
          editable ? (
            <div className="flex flex-wrap items-center gap-2">
              {dirty && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={save.isPending}
                  onClick={() => {
                    setDraft(buildDraft(modules));
                    setRowErrors({});
                    setBannerError(null);
                  }}
                >
                  Reset
                </Button>
              )}
              <Button type="button" loading={save.isPending} loadingLabel="Saving" disabled={!dirty} onClick={handleSave}>
                Save access
              </Button>
            </div>
          ) : undefined
        }
      />

      {!data.overridable ? (
        <Note icon={<ShieldIcon />}>Owners always have full access.</Note>
      ) : (
        <div className="flex flex-col gap-3">
          {isOwnAssignment && (
            <Note icon={<InfoIcon />}>You can&apos;t change your own access.</Note>
          )}
          {bannerError && <ErrorBanner>{bannerError}</ErrorBanner>}

          <div className="divide-y divide-border overflow-hidden rounded-sm border border-border">
            {modules.map((mod) => {
              const flags = draft[mod.module_code] ?? emptyOverrideFlags();
              const modified = rowDiffersFromRole(mod, flags);
              const rowError = rowErrors[mod.module_code];

              return (
                <div
                  key={mod.module_code}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-3.5 transition-colors",
                    modified && "border-l-2 border-l-accent bg-accent/[0.04]",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-body font-medium text-text">{mod.module_name}</span>
                      {modified && (
                        <Pill tone="accent" size="sm">
                          Differs from role
                        </Pill>
                      )}
                    </div>
                  </div>

                  {rowError && (
                    <p role="alert" className="m-0 flex items-center gap-1.5 text-[11.5px] text-danger-text">
                      <AlertCircleIcon className="size-3.5 flex-none" />
                      {rowError}
                    </p>
                  )}

                  <div className="flex flex-col gap-2.5">
                    {mod.actions.map((action) => {
                      const overrideVal = flags[action] ?? null;
                      const roleGives = Boolean(mod.role[action]);
                      const ro = readOnlyLabel(overrideVal, roleGives);

                      return (
                        <div
                          key={action}
                          className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="flex items-baseline gap-2.5">
                            <span className="type-body-sm font-medium text-text">{ACTION_LABELS[action]}</span>
                            <span className="text-[11.5px] text-text-faint">Role: {roleGives ? "yes" : "no"}</span>
                          </div>

                          {editable ? (
                            <SegmentedControl
                              size="sm"
                              aria-label={`${mod.module_name} ${ACTION_LABELS[action]}`}
                              options={OPTIONS}
                              value={toChoice(overrideVal)}
                              onValueChange={(choice) => setAction(mod.module_code, action, fromChoice(choice))}
                              className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-initial"
                            />
                          ) : (
                            <div>
                              <Pill tone={ro.tone} size="sm">
                                {ro.text}
                              </Pill>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="m-0 type-body-sm text-text-faint">Delete, import and notify take effect where a screen offers them.</p>
        </div>
      )}
    </Card>
  );
}

/**
 * Permission overrides card on a staff assignment's record view (`GET` / `PUT /staff-assignments/:id/overrides`).
 */
export function StaffOverridesCard({
  organizationId,
  assignmentId,
  assignmentUserId,
  assignmentRoleId,
}: {
  organizationId: string;
  assignmentId: string;
  assignmentUserId: string;
  assignmentRoleId: string;
}) {
  const { user } = useAuth();
  const { can } = useModuleAccess();
  const canUpdate = can("update", MODULE_CODES.USER_ROLES);
  const isOwnAssignment = Boolean(user?.id && user.id === assignmentUserId);

  const query = useQuery({
    queryKey: staffQk.overrides(organizationId, assignmentId),
    queryFn: ({ signal }) => getStaffOverrides(organizationId, assignmentId, signal),
  });
  const grantable = useQuery({
    queryKey: roleQk.grantableModules(organizationId),
    queryFn: ({ signal }) => listGrantableModules(organizationId, signal),
  });

  if (query.isPending || grantable.isPending) {
    return (
      <Card id="access-card">
        <CardHeader title="Access" subtitle="Loading permission overrides…" />
        <SkeletonStack>
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonStack>
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card id="access-card">
        <CardHeader title="Access" />
        <EmptyState
          size="sm"
          tone="danger"
          title="We couldn't load access details"
          description={describeApiError(query.error, "person")}
          actions={<Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button>}
        />
      </Card>
    );
  }

  const data = query.data;
  const modules = mergeModulesWithGrantables(data.modules, grantable.data);
  const editable = canUpdate && !isOwnAssignment && data.overridable;
  const versionKey = `${data.assignment_id}:${assignmentRoleId}:${JSON.stringify(modules.map((m) => [m.override, m.actions]))}`;

  return (
    <OverridesEditor
      key={versionKey}
      organizationId={organizationId}
      assignmentId={assignmentId}
      data={data}
      modules={modules}
      editable={editable}
      isOwnAssignment={isOwnAssignment}
    />
  );
}

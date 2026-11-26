"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { listAllBranches } from "@/lib/api/branches";
import { listRoles } from "@/lib/api/roles";
import { assignStaff, lookUpStaff } from "@/lib/api/staff";
import type { StaffLookup } from "@/lib/api/staff";
import { phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { branchQk, roleQk, staffQk } from "@/lib/query-keys";

const ORGANIZATION_WIDE = "all";
const nameOf = (p: Pick<StaffLookup, "firstname" | "middlename" | "lastname">) => [p.firstname, p.middlename, p.lastname].filter(Boolean).join(" ") || "Unnamed account";

/**
 * Give someone a role: type their mobile, check the name that comes back is the right person, pick a role (and a branch
 * when the organization has them). The API looks the number up itself: no user id is ever sent from here.
 */
export function AddStaffForm({ organizationId, hasBranches, onDone }: { organizationId: string; hasBranches: boolean; onDone: (assignmentId?: string) => void }) {
  const queryClient = useQueryClient();
  const [mobile, setMobile] = useState("");
  const [found, setFound] = useState<StaffLookup | null>(null);
  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState(ORGANIZATION_WIDE);
  const [errors, setErrors] = useState<{ mobile?: string; role?: string; branch?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const roles = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const branches = useQuery({ queryKey: branchQk.everyone(organizationId), queryFn: ({ signal }) => listAllBranches(organizationId, signal), enabled: hasBranches });
  const e164 = `+251${phoneDigits(mobile)}`;

  const lookup = useMutation({
    mutationFn: () => lookUpStaff(organizationId, e164),
    onSuccess: setFound,
    onError: (error) => {
      setFound(null);
      setFailure(describeApiError(error, "person"));
    },
  });
  const assign = useMutation({
    mutationFn: () => assignStaff(organizationId, { mobile: e164, role_id: roleId, ...(hasBranches && branchId !== ORGANIZATION_WIDE ? { branch_id: branchId } : {}) }),
    onSuccess: ({ assignment, roleGiven }) => {
      void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId) });
      if (roleGiven) toast.success("Role given", { body: `${found ? nameOf(found) : "They"} now has the ${assignment.role.name} role.` });
      else toast.info("Already has this role", { body: "Nothing changed." });
      onDone(assignment.id);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "assignment_scope_conflict") {
        const msg = describeApiError(error, "person");
        setErrors(hasBranches ? { branch: msg } : { role: msg });
        return;
      }
      setFailure(describeApiError(error, "person"));
    },
  });

  function find(e: React.FormEvent) {
    e.preventDefault();
    const error = validatePhone(mobile);
    setErrors({ mobile: error });
    if (error) return;
    setFailure(null);
    setFound(null);
    lookup.mutate();
  }

  function give() {
    if (!roleId) {
      setErrors({ role: "Choose a role." });
      return;
    }
    setErrors({});
    setFailure(null);
    assign.mutate();
  }

  const activeRoles = (roles.data ?? []).filter((r) => r.is_active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Staff assignments", onClick: () => onDone() }, { label: "Add staff" }]} />
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Add staff</h1>
          <p className="type-body m-0 text-text-soft">Give someone who already has a Cheche account a role in this organization.</p>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="1. Find the person" subtitle="Their Cheche account is looked up by mobile number." />
          <form onSubmit={find} noValidate className="flex flex-col gap-4">
            <Field label="Mobile number" htmlFor="st-mobile" required error={errors.mobile} hint="The number they signed up with.">
              <PhoneInput
                id="st-mobile"
                value={mobile}
                error={!!errors.mobile}
                onValueChange={(v) => {
                  setMobile(v);
                  setFound(null);
                  setErrors({});
                }}
              />
            </Field>
            <div>
              <Button type="submit" variant="secondary" loading={lookup.isPending} loadingLabel="Looking up">
                Look up
              </Button>
            </div>
            {found && (
              <div className="rounded-md border border-border bg-surface-2 px-4 py-3" role="status">
                <p className="type-label m-0 text-text-faint">Is this the right person?</p>
                <p className="type-body m-0 mt-0.5 font-medium text-text">{nameOf(found)}</p>
                <p className="type-body-sm m-0 text-text-soft">{found.mobile ?? e164}</p>
              </div>
            )}
          </form>
        </Card>

        <Card disabled={!found}>
          <CardHeader title="2. Choose their role" subtitle={found ? "What they can see and do here." : "Look up the person first."} />
          <div className="flex flex-col gap-4">
            <Field label="Role" htmlFor="st-role" required error={errors.role}>
              <Select
                id="st-role"
                disabled={!found}
                loading={roles.isPending}
                placeholder="Choose a role"
                options={activeRoles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleId}
                onValueChange={(v) => {
                  setRoleId(v);
                  setErrors({});
                }}
              />
            </Field>
            {hasBranches && (
              <Field label="Where" htmlFor="st-branch" error={errors.branch} hint="One branch only, or the whole organization.">
                <Select
                  id="st-branch"
                  disabled={!found}
                  loading={branches.isPending}
                  options={[{ value: ORGANIZATION_WIDE, label: "Whole organization" }, ...(branches.data ?? []).filter((b) => b.is_active).map((b) => ({ value: b.id, label: b.name }))]}
                  value={branchId}
                  onValueChange={(v) => {
                    setBranchId(v);
                    setErrors({});
                  }}
                />
              </Field>
            )}
            <div className="flex items-center gap-2">
              <Button disabled={!found} loading={assign.isPending} loadingLabel="Giving the role" onClick={give}>
                Give role
              </Button>
              <Button variant="secondary" onClick={() => onDone()}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

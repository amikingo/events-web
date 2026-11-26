"use client";

import { useMemo } from "react";
import { RecordForm } from "@/components/ui/record-form";
import type { RecordFormSection } from "@/components/ui/record-form";
import { describeApiError } from "@/lib/api/errors";
import type { StaffAssignment, StaffProfileUpdateInput } from "@/lib/api/staff";

interface EditNamesFormProps {
  assignment: StaffAssignment;
  personName: string;
  /** Persist name changes. Throw an ApiError or Error to keep the form open and show it. */
  onSubmit: (changes: StaffProfileUpdateInput) => Promise<void>;
  onCancel: () => void;
}

function validateNameLength(value: string): string | undefined {
  return value.trim().length > 100 ? "Use 100 characters or fewer." : undefined;
}

/** Edit page for a staff member's Cheche account names (first, middle, last). Mobile stays read-only here. */
export function EditNamesForm({ assignment, personName, onSubmit, onCancel }: EditNamesFormProps) {
  const mobile = assignment.profile?.mobile;

  const sections = useMemo<RecordFormSection[]>(
    () => [
      {
        id: "names",
        title: "Account & names",
        hint: mobile ? `Mobile: ${mobile} — The mobile number can't be changed here.` : "The mobile number can't be changed here.",
        fields: [
          {
            name: "firstname",
            label: "First name",
            required: true,
            requiredMessage: "Enter a first name.",
            validate: validateNameLength,
          },
          {
            name: "middlename",
            label: "Middle name",
            hint: "Optional",
            validate: validateNameLength,
          },
          {
            name: "lastname",
            label: "Last name",
            required: true,
            requiredMessage: "Enter a last name.",
            full: true,
            validate: validateNameLength,
          },
        ],
      },
    ],
    [mobile],
  );

  const initialValues = useMemo(
    () => ({
      firstname: assignment.profile?.firstname ?? "",
      middlename: assignment.profile?.middlename ?? "",
      lastname: assignment.profile?.lastname ?? "",
    }),
    [assignment.profile?.firstname, assignment.profile?.lastname, assignment.profile?.middlename],
  );

  async function handleSubmit(values: Record<string, string>) {
    const nextFirst = values.firstname.trim();
    const nextMiddle = values.middlename.trim();
    const nextLast = values.lastname.trim();

    const prevFirst = (assignment.profile?.firstname ?? "").trim();
    const prevMiddle = (assignment.profile?.middlename ?? "").trim();
    const prevLast = (assignment.profile?.lastname ?? "").trim();

    const changes: StaffProfileUpdateInput = {};
    if (nextFirst !== prevFirst) changes.firstname = nextFirst;
    if (nextMiddle !== prevMiddle) changes.middlename = nextMiddle || null;
    if (nextLast !== prevLast) changes.lastname = nextLast;

    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }

    try {
      await onSubmit(changes);
    } catch (err) {
      throw new Error(describeApiError(err, "person"));
    }
  }

  return (
    <RecordForm
      mode="edit"
      noun="names"
      backLabel={personName}
      recordName={`${personName}'s names`}
      sections={sections}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      className="overflow-hidden rounded-lg border border-border"
    />
  );
}

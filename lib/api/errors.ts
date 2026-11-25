import { ApiError } from "@/lib/api-client";

/**
 * What to tell the person when a call fails. Decided by `error.code` only, never by the server's wording.
 * `noun` is the thing being worked on ("branch"), used in the messages that name it.
 */
export function describeApiError(error: unknown, noun = "item"): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  switch (error.code) {
    case "permission_denied":
      return "You don't have permission to do this.";
    case "grant_exceeds_own_access":
      return grantExceedsOwnAccessMessage(error.details);
    case "role_locked":
      return "The Owner role can't be changed.";
    case "role_in_use": {
      const count = (error.details as { active_assignments?: number } | undefined)?.active_assignments;
      return count !== undefined
        ? `${count} staff still have this role. Give them another role first, then switch it off.`
        : "Staff still have this role. Give them another role first, then switch it off.";
    }
    case "conflict":
      return conflictMessage(error.details, noun);
    case "invalid_event_state":
      return "This event is closed or cancelled, so it can't change any more.";
    case "event_not_publishable":
      return `The event isn't ready to publish. It still needs ${missingList(error.details)}.`;
    case "central_account_not_found":
      return "This number has no Cheche account yet. Ask them to sign up first, then try again.";
    case "last_owner_assignment":
      return "The organization needs at least one active Owner. Give the role to someone else first.";
    case "registration_closed":
      return registrationClosedMessage(error.details);
    case "capacity_reached":
      return (error.details as { scope?: string } | undefined)?.scope === "TICKET_TYPE" ? "No places left for this ticket type." : "This event is full.";
    case "already_registered":
      return "This guest already has a place at this event with another ticket type.";
    case "ticket_type_required":
      return "This event has several ticket types. Choose one.";
    case "ticket_type_inactive":
      return "That ticket type is switched off. Choose another one.";
    case "person_inactive":
      return "This guest's profile is switched off, so they can't be registered.";
    case "privacy_notice_outdated":
      return "The privacy notice was updated. Reload the page and read it again.";
    case "idempotency_key_reused":
      return "That submission was already used for a different form. Try again.";
    case "capacity_below_registrations": {
      const confirmed = (error.details as { confirmed?: number } | undefined)?.confirmed;
      return confirmed ? `${confirmed} guests are already confirmed. Cancel some before lowering the limit.` : "Guests are already confirmed above that limit. Cancel some first.";
    }
    case "payload_too_large":
      return "The image must be 5 MB or smaller.";
    case "unsupported_file_type":
      return "Upload a JPEG, PNG or WebP image.";
    case "file_storage_unavailable":
      return "The upload failed on the server. Try again later.";
    case "invalid_branch_state":
      return "The default branch can't be switched off. Make another branch the default first.";
    case "staff_assignment_not_found":
      return "That role isn't available any more. Pick another one.";
    case "not_found":
      return `This ${noun} no longer exists. Refresh the page.`;
    case "validation_error":
      return "Some details aren't valid. Check the fields and try again.";
    case "role_inactive":
      return noun === "person"
        ? "That role is switched off. Choose an active role."
        : "Your role is switched off at the moment. Ask an admin to turn it back on.";
    case "organization_inactive":
    case "branch_inactive":
    case "invalid_tenant_scope":
      return "Your role is switched off at the moment. Ask an admin to turn it back on.";
    case "rate_limited":
    case "central_auth_rate_limited":
      return "Too many attempts. Wait a minute and try again.";
    case "refresh_token_missing":
    case "refresh_token_invalid":
      return "Your session ended. Sign in again.";
    case "network_error":
    case "service_unavailable":
    case "central_auth_unavailable":
      return "We can't reach the server right now. Try again in a moment.";
    default:
      return "Something went wrong. Try again.";
  }
}

/** The API names what's missing for publishing (`details.missing`); this says it in words. */
const MISSING: Record<string, string> = {
  name: "a name",
  slug: "a valid web address",
  timezone: "a valid timezone",
  starts_at: "a start time",
  ends_at: "an end time",
  "ends_at after starts_at": "an end time after the start",
  "an active ticket type": "an active ticket type",
};

function missingList(details: unknown): string {
  const missing = (details as { missing?: unknown } | undefined)?.missing;
  if (!Array.isArray(missing) || missing.length === 0) return "a few details";
  const words = missing.map((m) => MISSING[String(m)] ?? String(m));
  return words.length === 1 ? words[0]! : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** Why an event isn't taking registrations (`details.reason`), in words. */
function registrationClosedMessage(details: unknown): string {
  switch ((details as { reason?: string } | undefined)?.reason) {
    case "NOT_PUBLISHED":
      return "This event isn't published yet.";
    case "CANCELLED":
      return "This event was cancelled.";
    case "ENDED":
      return "This event has ended.";
    case "NOT_OPEN_YET":
      return "Registration hasn't opened yet.";
    default:
      return "Registration has closed.";
  }
}

const MODULE_LABELS: Record<string, string> = {
  ORGANIZATIONS: "Organizations",
  BRANCHES: "Branches",
  ROLES: "Roles",
  USER_ROLES: "Staff Assignments",
  EVENTS: "Events",
  CUSTOMERS: "Clients",
  REGISTRATIONS: "Guests",
};

export function grantExceedsOwnAccessMessage(details: unknown, moduleNames?: Record<string, string>): string {
  const { module_code: moduleCode, action } = (details as { module_code?: string; action?: string } | undefined) ?? {};
  if (!moduleCode || !action) return "You can't give access you don't have yourself.";
  const moduleLabel = moduleNames?.[moduleCode] ?? MODULE_LABELS[moduleCode] ?? moduleCode;
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  return `You can't give access you don't have yourself (${moduleLabel} › ${actionLabel}).`;
}

function conflictMessage(details: unknown, noun: string): string {
  const field = (details as { field?: string } | undefined)?.field;
  if (field === "user_id") return "This person is already staff of another organization.";
  if (noun === "role" && field === "code") return "Another role already uses this code.";
  if (noun === "role" && field === "name") return "Another role already has this name.";
  return `Another ${noun} already uses that code or web address. Use a different one.`;
}

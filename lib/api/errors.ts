import { ApiError } from "@/lib/api/client";

/**
 * What to tell the person when a call fails. Decided by `error.code` only, never by the server's wording.
 * `noun` is the thing being worked on ("branch"), used in the messages that name it.
 */
export function describeApiError(error: unknown, noun = "item"): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  switch (error.code) {
    case "permission_denied":
      return "You don't have permission to do this.";
    case "conflict":
      return `A ${noun} with the same code or name already exists. Use a different one.`;
    case "invalid_branch_state":
      return "The default branch can't be switched off. Make another branch the default first.";
    case "staff_assignment_not_found":
      return "That role isn't available any more. Pick another one.";
    case "not_found":
      return `This ${noun} no longer exists. Refresh the page.`;
    case "validation_error":
      return "Some details aren't valid. Check the fields and try again.";
    case "role_inactive":
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

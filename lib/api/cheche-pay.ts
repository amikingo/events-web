/**
 * An organizer's Cheche Pay keys (Phase 7 step 3, Super Admin only, ORGANIZATIONS at platform scope).
 *
 *   GET    /v1/organizations/:organizationId/cheche-pay          what's saved (never a secret)
 *   PUT    /v1/organizations/:organizationId/cheche-pay          { secret_key?, webhook_secret?, is_active? }
 *   DELETE /v1/organizations/:organizationId/cheche-pay          removes the keys for good
 *   POST   /v1/organizations/:organizationId/cheche-pay/check    { ok, reason, key_mode, checked_at }
 *
 * A secret goes out once, in the PUT body, and is never read back, kept in state after sending, or logged.
 */
import { apiRequest } from "@/lib/api-client";

export type KeyMode = "test" | "live";

export interface ChechePaySettings {
  organization_id: string;
  configured: boolean;
  is_active: boolean;
  key_mode: KeyMode | null;
  /** For example `sk_test_••••ab12`. */
  secret_key_masked: string | null;
  has_webhook_secret: boolean;
  /** The address to give Cheche Pay for this organizer's webhook; null until the server knows its public address. */
  webhook_url: string | null;
  /** Active keys, and the server can reach Cheche Pay with them. */
  paid_sales_available: boolean;
  updated_at: string | null;
}

export interface ChechePayInput {
  /** `sk_test_…` or `sk_live_…`. Required the first time; sent again, it replaces the key. */
  secret_key?: string;
  /** `null` removes it. */
  webhook_secret?: string | null;
  /** false stops new payments. */
  is_active?: boolean;
}

export interface ChechePayCheck {
  ok: boolean;
  reason: "KEY_ACCEPTED" | "KEY_REJECTED" | "PROVIDER_ERROR";
  key_mode: KeyMode | null;
  checked_at: string;
}

const path = (organizationId: string) => `/v1/organizations/${organizationId}/cheche-pay`;

export function getChechePay(organizationId: string, signal?: AbortSignal): Promise<ChechePaySettings> {
  return apiRequest<ChechePaySettings>(path(organizationId), { signal });
}

export function saveChechePay(organizationId: string, input: ChechePayInput): Promise<ChechePaySettings> {
  return apiRequest<ChechePaySettings>(path(organizationId), { method: "PUT", body: input });
}

export function removeChechePay(organizationId: string): Promise<unknown> {
  return apiRequest<unknown>(path(organizationId), { method: "DELETE" });
}

export function checkChechePay(organizationId: string): Promise<ChechePayCheck> {
  return apiRequest<ChechePayCheck>(`${path(organizationId)}/check`, { method: "POST" });
}

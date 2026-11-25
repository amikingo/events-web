/**
 * Clients: the organizations and people who commission your events (module CUSTOMERS; the API calls them
 * customer accounts). Not attendees.
 *
 *   GET   /v1/organizations/:organizationId/customer-accounts              ?page&pageSize&is_active
 *   POST  /v1/organizations/:organizationId/customer-accounts
 *   GET   /v1/organizations/:organizationId/customer-accounts/:customerAccountId
 *   PATCH /v1/organizations/:organizationId/customer-accounts/:customerAccountId
 *   PATCH /v1/organizations/:organizationId/customer-accounts/:customerAccountId/status   { is_active }
 *
 * No delete: clients are switched off, so past events keep them.
 */
import { apiListAll, apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

/**
 * A client: the organization or person **commissioning** an event (ABC Bank, or Hana Bekele for her wedding).
 * Not an attendee. The API calls it `customer_account`; the menu calls it Clients.
 */
export type ClientKind = "ORGANIZATION" | "INDIVIDUAL";

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  kind: ClientKind;
  /** The sector of an organizational client (Corporate, NGO…). Always null for an individual. */
  type: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  /** Ethiopian mobiles come back as `+251…`; other numbers as typed. */
  primary_contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientInput {
  name: string;
  kind: ClientKind;
  type: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/customer-accounts`;

export interface ClientListParams {
  page: number;
  pageSize: number;
  /** Only active (true) or only switched-off (false) clients; all when left out. */
  isActive?: boolean;
}

/** One page of clients. The page size is clamped to the API's limit (100). */
export function listClients(organizationId: string, params: ClientListParams, signal?: AbortSignal): Promise<Paginated<Client>> {
  return apiPage<Client>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { is_active: params.isActive === undefined ? undefined : String(params.isActive) },
    signal,
  });
}

/** Every client, switched-off ones included: events still need to name the client they were made for. */
export function listAllClients(organizationId: string, signal?: AbortSignal): Promise<Client[]> {
  return apiListAll<Client>(base(organizationId), { signal });
}

export function getClient(organizationId: string, clientId: string, signal?: AbortSignal): Promise<Client> {
  return apiRequest<Client>(`${base(organizationId)}/${clientId}`, { signal });
}

export function createClient(organizationId: string, input: ClientInput): Promise<Client> {
  // An individual never carries a sector (400 otherwise).
  const body = input.kind === "INDIVIDUAL" ? { ...input, type: undefined } : input;
  return apiRequest<Client>(base(organizationId), { method: "POST", body });
}

/** Send only what changed; `null` clears. Switching to INDIVIDUAL must clear `type` in the same request. */
export function updateClient(organizationId: string, clientId: string, changes: Partial<ClientInput>): Promise<Client> {
  return apiRequest<Client>(`${base(organizationId)}/${clientId}`, { method: "PATCH", body: changes });
}

/** Clients are switched off, never deleted. */
export function setClientActive(organizationId: string, clientId: string, isActive: boolean): Promise<Client> {
  return apiRequest<Client>(`${base(organizationId)}/${clientId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

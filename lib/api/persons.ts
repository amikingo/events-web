/**
 * Guest profiles: an organizer's reusable attendee profiles (module REGISTRATIONS, menu "Guests"). A matching name,
 * phone or email never links two profiles.
 *
 *   GET   /v1/organizations/:organizationId/persons              ?q&is_active&page&pageSize
 *   POST  /v1/organizations/:organizationId/persons
 *   GET   /v1/organizations/:organizationId/persons/:personId    profile + registrations in this organization
 *   PATCH /v1/organizations/:organizationId/persons/:personId
 *   PATCH /v1/organizations/:organizationId/persons/:personId/status   { is_active }
 *
 * No delete: a switched-off guest keeps their registrations but can't be registered again.
 */
import { apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

export interface Person {
  id: string;
  organization_id: string;
  /** Set only when a guest registers with their own account (a later phase). Staff never set it. */
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  /** Ethiopian mobiles come back as `+251…`; other numbers as typed. */
  phone: string | null;
  affiliation_name: string | null;
  /** Two-letter country code. */
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = "CONFIRMED" | "CANCELLED";

/** One of a guest's registrations in this organization: shown so staff can confirm a returning guest's identity. */
export interface PersonRegistration {
  id: string;
  code: string;
  status: RegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  event: { id: string; name: string; slug: string; starts_at: string | null; ends_at: string | null; timezone: string; status: string };
  ticket_type: { id: string; code: string; name: string };
}

export type PersonDetail = Person & { registrations: PersonRegistration[] };

/** Only `first_name` is required. `null` clears a field on update. */
export interface PersonInput {
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  affiliation_name?: string | null;
  country?: string | null;
}

export interface PersonListParams {
  page: number;
  pageSize: number;
  /** Searches names, email and phone (`09…` also finds `+251…`). */
  q?: string;
  isActive?: boolean;
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/persons`;

export function listPersons(organizationId: string, params: PersonListParams, signal?: AbortSignal): Promise<Paginated<Person>> {
  return apiPage<Person>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { q: params.q?.trim() || undefined, is_active: params.isActive === undefined ? undefined : String(params.isActive) },
    signal,
  });
}

export function getPerson(organizationId: string, personId: string, signal?: AbortSignal): Promise<PersonDetail> {
  return apiRequest<PersonDetail>(`${base(organizationId)}/${personId}`, { signal });
}

export function createPerson(organizationId: string, input: PersonInput): Promise<Person> {
  return apiRequest<Person>(base(organizationId), { method: "POST", body: input });
}

/** Send only what changed. */
export function updatePerson(organizationId: string, personId: string, changes: Partial<PersonInput>): Promise<Person> {
  return apiRequest<Person>(`${base(organizationId)}/${personId}`, { method: "PATCH", body: changes });
}

export function setPersonActive(organizationId: string, personId: string, isActive: boolean): Promise<Person> {
  return apiRequest<Person>(`${base(organizationId)}/${personId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

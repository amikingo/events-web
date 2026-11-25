# Frontend ↔ backend integration

How `events-web` talks to `events-api`, and how to add a new backend module to the app. The pattern is the one
`bookings_web` uses; the places where this project deliberately differs are listed in [section 9](#9-where-this-project-differs-from-bookings).

The backend contract itself (every endpoint, field and status) is in `events-api/docs/api/openapi-v1.json`, served at
`http://localhost:5010/v1/docs`. The API's own guide for the staff app is `events-api/docs/frontend-integration.md`.

---

## 1. The contract the frontend relies on

| Rule | What it means here |
|---|---|
| **Envelope** | Success `{ success: true, data, message? }`. Lists `{ success: true, data: [...], meta: { count, page, pageSize } }`. Errors `{ success: false, error: { code, message, details? } }`. Validation errors put `details.issues[] = { path, message, code }`. |
| **Branch on `error.code`, never on `error.message`** | Messages are technical and may change; codes are the contract. `lib/api/errors.ts` (`describeApiError`) turns a code into plain words for the screen. |
| **One feature = one slice** | route → controller → service → repository → zod validator (→ mapper) on the backend; one `lib/api/<feature>.ts` file on the frontend. |
| **Permissions per module code and action** | `view`, `create`, `update`, `delete`, `import`, `export`, `notify`, per module code (`EVENTS`), for the role in use. |
| **`/me` is the only source of access** | `GET /v1/auth/staff/me` returns permissions and the `navigation` tree. The sidebar and every permission check are built from it. The server checks permissions on every request anyway: the frontend only decides what to show. |
| **Sessions** | Access token in the `Authorization` header (15 minutes). Refresh token in an HttpOnly cookie the browser sends by itself. Staff endpoints are `/v1/auth/staff/*`. |

## 2. The layers, top to bottom

```
app/admin/<feature>/[[...slug]]/page.tsx   screen: queries, mutations, <Can>, toasts
        │
lib/api/<feature>.ts                       typed DTOs + plain async functions + endpoint list
        │
lib/api-client.ts                          the only fetch: auth header, refresh, errors, paging
```

No component calls `fetch`. No API file builds headers. If you need a new kind of request, add it to `api-client.ts`.

### 2.1 `lib/api-client.ts`

- Prefixes `NEXT_PUBLIC_API_URL`, sends `credentials: "include"` (so the refresh cookie is stored and sent), JSON headers, and **no** `Content-Type` for `FormData` (the browser adds the multipart boundary).
- Adds `Authorization: Bearer …` to every call except the lists at the top of the file: `PUBLIC_PATH_PREFIXES` (the visitor site, `/v1/public/`) and `AUTH_LIFECYCLE_PATHS` (login, refresh, logout).
- A non-OK answer throws `ApiError` with `status`, `code` and `details`. A network failure throws `ApiError` with status `0` and code `network_error`.
- **Single-flight refresh.** On a 401 whose code means the token is missing or unusable (`expired_token`, `authentication_required`, `malformed_bearer_token`, `invalid_token`, `unsupported_token`) it refreshes once (one shared promise for every request in flight) and retries the original request once. A missing token is refreshed before the first request.
- **Terminal failures** (`refresh_token_missing`, `refresh_token_invalid`, `staff_context_required`, `staff_assignment_not_found`) end the session: the token is dropped and `onSessionTerminated` listeners run. The auth context answers by clearing all cached data and going to `/auth`.
- Listeners: `onTokenRefreshed(listener)`, `onSessionTerminated(listener)`.
- **Headers and status:** a call can pass `headers` (for `Idempotency-Key`), and `apiRequestWithStatus()` returns the HTTP status too, for calls where **201** (a place was taken) and **200** (already registered / already processed) mean different things.
- Paging: `apiPage()` returns the one list shape every screen uses, `Paginated<T> = { data, totalItems, totalPages, currentPage, pageSize }`. Page size is clamped to the API's limit of 100 (`clampPageSize`). `apiListAll()` reads every page, for pickers and name lookups only.
- `assetUrl(path)` prefixes the API origin onto file paths such as event covers (`/assets/uploads/…`); those files are public, so a plain `<img>` loads them.

### 2.2 The access token lives in memory only

This is a deliberate difference from bookings (which keeps it in a JS-readable cookie), and it follows the API's own guide ("never in `localStorage`"). A readable cookie is exposed to XSS exactly like `localStorage`. The cost is one refresh after a page reload, which the client and the auth context already do. Never store the token, and never add a fallback that reads it from storage. The current assignment id is not a secret and is kept in `localStorage` (`assignmentId`), so a refresh after a reload can send it; otherwise a person with several roles gets `409 staff_context_required`.

### 2.3 One API file per backend feature

Each `lib/api/<feature>.ts` holds, and holds only:

1. a doc comment at the top listing every endpoint it calls;
2. the TypeScript types of the feature's DTOs (the API's own field names, `snake_case`) and input payloads;
3. plain async functions: `listX` (paged), `listAllX` (everything, for pickers), `getX`, `createX`, `updateX`, `setXActive` (status), and any feature action;
4. nothing else: no React, no toasts, no formatting.

Conventions inside the file:

- `listX(organizationId, params, signal?)` returns `Paginated<X>`; `params` is `{ page, pageSize, …filters }`. Optional filters are sent only when set.
- `updateX` takes `Partial<Input>`: **send only what changed**; `null` clears a field.
- Records are never deleted. They are switched off with `PATCH …/status { is_active }` so history stays. Do not add a delete button.
- Dates are sent as UTC instants. People type times in the event's timezone; convert with `lib/timezone.ts` (`zonedLocalToIso`, `isoToZonedLocal`, `formatInZone`).

Existing files: `auth.ts`, `effective-access.ts`, `organizations.ts`, `branches.ts`, `venues.ts`, `clients.ts` (the API calls them *customer accounts*), `events.ts` (events and ticket types), `persons.ts` (guest profiles), `registrations.ts` (an event's guest list), `public-events.ts` (the visitor site: catalog, event page, public sign-up), `errors.ts` (code → message).

## 3. Server state: TanStack Query

`components/query-provider.tsx`: `staleTime` 60 s, `refetchOnWindowFocus` off, no retry on 4xx.

- **Keys come from `lib/query-keys.ts`**, one factory per feature: `venueQk.all(orgId)`, `.list(orgId, params)`, `.everyone(orgId)`, `.detail(orgId, id)`. Every key starts with the feature, then the organization, then parameters, so `invalidateQueries({ queryKey: venueQk.all(orgId) })` refreshes everything of that feature for that organization.
- **Reads** use `useQuery` with `enabled` guards. Lists use `placeholderData: keepPreviousData`, so the page on screen stays while the next loads.
- **Writes** use `useMutation`, and `onSuccess` invalidates the feature's `all` key. Errors: a toast (`toast.error(title, { body: describeApiError(error, noun) })`) or, inside a form, a thrown `Error` with that message, which keeps the form open.
- A record opened by link that isn't on the current page loads on its own (`detail` query with `enabled`).
- Signing out or switching role calls `queryClient.clear()`: nothing cached belonged to the next role.

Use `lib/query-keys.ts` for every key. Don't write array literals in screens.

## 4. Session and organization

- `lib/auth-token.ts`: parsers for login, refresh, switch-assignment and `/me` payloads. They accept older shapes (`access_token`, names as `{ en, am }`, missing `assignment`, missing `has_branches`) and throw on what a session cannot work without (no token, no user id, no role). Never guess those.
- `lib/auth-context.tsx` (`AuthProvider`, `useAuth`): user, role in use, roles held, `login`, `logout`, `switchRole`. It schedules a refresh one minute before the token expires and refreshes from the cookie after a page reload.
- `lib/organization-context.tsx` (`OrganizationProvider`, `useOrganization`): the organization the role works in. Staff of an organization work in their own. A **platform role** belongs to none, and the API lets a platform Super Admin act in any organization, so the top bar shows an organization picker (the choice is remembered on this device). Organization-scoped screens use `useOrganizationId()` and show `NoOrganization` when none is picked.
- `has_branches` (on the organization): when `false` (most organizers) hide every branch picker, column and screen.

Provider order in `app/admin/layout.tsx`: `QueryProvider` → `AuthProvider` → `OrganizationProvider` → `AbilityProvider` → shell, with `DashboardRouteGuard` around the page.

## 5. Permissions and the sidebar

```
GET /v1/auth/staff/me
  → lib/api/auth.ts getStaffSession()            parse (lib/auth-token.ts)
  → lib/rbac/effective-access.ts                 { modules[], navigation[] }
  → lib/rbac/ability.ts                          CASL ability (backend "view" → CASL "read")
  → components/ability-provider.tsx              <Can>, useModuleAccess(), useAccess()
  → lib/rbac/build-module-tree.ts                navigation pruned to what this app has and the role may view
  → lib/rbac/module-sidebar.ts                   entries with Lucide icons
  → app/admin/layout.tsx                         <Sidebar variant="brand"> + <SidebarAccordion>
```

- **Module codes** are in `lib/constants/modules.ts` and must be identical to `events-api/src/utils/module-codes.ts` (`MODULE_CODES`). Each line has a comment naming the backend constant. The values are `UPPER_SNAKE_CASE` (a database check enforces it on the backend).
- **`ROUTE_MODULE_MAP`** (same file) says which module guards which screen. `moduleForPath()` picks the longest matching prefix. Venues have no menu entry but are guarded by `EVENTS`, as on the backend.
- **`lib/constants/module-routes.ts`** maps the backend's `route_name` (from `/me` navigation, e.g. `/events`) to the frontend path (`/admin/events`). The backend can add a module without the frontend guessing its URL. **A `route_name` missing from this map has no screen yet, and the sidebar leaves it out** (today: the Access Control pages).
- In markup: `<Can I="create" a={MODULE_CODES.EVENTS}>…</Can>`. In code: `const { can, hasModuleAccess } = useModuleAccess(); can("update", MODULE_CODES.EVENTS)`. Actions are CASL's: `read` (the backend's `view`), `create`, `update`, `delete`, `import`, `export`, `notify`.
- **No fallbacks that hide missing permissions.** While `/me` loads nothing is granted. If it didn't grant it, it isn't shown. The frontend never decides from role names.
- **Route guard:** `DashboardRouteGuard` + `hooks/use-role-guard.tsx` send a role that may not view the current path to `/admin/forbidden`. `/admin` itself redirects to the first page the role's menu offers.
- **Sidebar** is built like bookings: one entry per top-level backend menu item, in `sno` order. An entry with one page is a plain link; with more it is an accordion that expands in place.
- **Demo pages:** the template's pages with no backend module (Payments, Orders, Users…) show in a "Demo pages" accordion and are reachable **in development only** (`DEMO_PAGES_ENABLED` in `lib/config/demo-pages.ts`). Production builds hide them and the guard blocks them.

## 6. Screens

- **Records follow the payments template:** list (`Table`, server-paged) → peek panel → full record page → create/edit as a full page. Modals only confirm. **Each screen has its own form file** (`event-form.tsx`, `venue-form.tsx`, `client-form.tsx`, `branch-form.tsx`, `guest-form.tsx`, `organization-form.tsx`, `change-role-form.tsx`, `add-staff-form.tsx`), not a shared one and not the workspace's built-in `form`: one breadcrumb, cards of fields, Cancel and Save in the header so they stay in view, a "Discard changes?" confirm only when something was typed. The screen renders its form instead of the workspace when `location.mode` is `create` or `edit`, and the workspace's own `form` prop is a stub. To add a record type, copy `venue-form.tsx` (the simplest) and change the fields. Delete, archive and block never sit in a table row. See `.cheche-ui/patterns.md`.
- A screen is a thin `page.tsx` that renders `<Suspense><XScreen /></Suspense>`. The screen picks the organization (`useOrganizationId`) and renders `<XView organizationId>` where all the hooks live.
- Tables are server-paged: pass `page`, `onPageChange`, `rowsPerPage`, `onRowsPerPageChange`, `totalRows`. Turn off `searchable` and `filters` until the API can search or filter that list; a search over only the visible page misleads.
- Copy is plain, sentence case, no exclamation marks, buttons name the action ("Create event"). Statuses use `StatusPill` (`kind="event"` was added for events).
- **Icons are Lucide everywhere.** `components/ui/icons.tsx` keeps its names and draws each icon with Lucide; for anything else import from `lucide-react`. Sidebar icons come from the backend's icon name in `/me`, then by module code (`lib/rbac/module-sidebar.ts`): when a backend migration adds a module with a new icon name, add that one import to `BACKEND_ICONS`.

## 7. Adding a new backend module: checklist

Backend first (`events-api`), then the frontend. Keep every module code identical on both sides.

**Backend**
1. Add the code to `src/utils/module-codes.ts` and a migration that inserts the `module` row (deterministic UUID, parent group, `sno`, `route_name`, `icon`) and grants it to the default roles in `src/utils/default-roles.ts`.
2. Route file in `routes/v1/<feature>.ts`, mounted in `routes/v1/index.ts`: `requireStaffAuthentication` → `validate(contract)` → `requirePermission({ moduleCode, action, scope })` → controller.
3. Zod validators in `validators/<feature>.ts`; service, repository, mapper as needed. Lists return `{ data, meta }`.
4. Regenerate the contract: `npm run openapi`; `npm run check` must pass.

**Frontend**
1. `lib/constants/modules.ts`: add the code (comment which backend constant it mirrors).
2. `lib/constants/module-routes.ts`: map the backend `route_name` → `/admin/<feature>`.
3. `lib/constants/modules.ts` → `ROUTE_MODULE_MAP`: map `/admin/<feature>` → the module code (so the guard applies).
4. `lib/api/<feature>.ts`: endpoint list at the top, DTO types, `listX` (paged), `listAllX` if a picker needs it, `getX`, `createX`, `updateX`, `setXActive`.
5. `lib/query-keys.ts`: add `<feature>Qk` with `all`, `list`, `detail` (and `everyone` for pickers).
6. `lib/rbac/module-sidebar.ts`: add the icon (`BACKEND_ICONS` if the backend names a new Lucide icon, and `ICON_BY_CODE` for the fallback).
7. `lib/api/errors.ts`: add any new error code's message.
8. Screen: copy `app/admin/venues/[[...slug]]/page.tsx` (the reference). Change the type, `columns`, `sections`, `identity`, `stats`, `panel` and `page`. Keep: queries with `enabled` guards, `keepPreviousData`, server paging, mutations that invalidate `<feature>Qk.all`, code-based error messages, `<Can>` around create, `can("update", …)` around edit and switch-off.
9. If the screen needs a status word, add it to `statusVocabulary` in `components/ui/status-pill.tsx` first; never pick a colour.
10. Check: `npx tsc --noEmit`, `npx eslint`, open the page at 375 px wide and in dark mode, and try it as a role **without** the permission (buttons hidden, route sent to `/admin/forbidden`).

## 8. Testing against the real API

Sign-in needs auth-cheche, but you can test every staff call without it. In `events-api` (development only):

```bash
npm run dev:staff-token -- --user-id <user-uuid>     # prints a 15-minute staff token; treat it like a password
```

Run the web app's real `lib/api/*` functions against the API with that token: announce a session with `announceSession(parseStaffToken(...))`, then call the functions and assert on results and on `ApiError` codes. Cover uploads need `FILES_DIR` set on the API (on a Mac, an absolute folder), or they return `503 file_storage_unavailable`. Run a second API instance on another port for tests so your dev API is untouched. Test data can't be deleted through the API (records are switched off, not removed), so use a throwaway organization.

What a full pass covers: session and `/me`; every feature's create, update, status, paging (page sizes above 100 are clamped), filters and error codes; event publishing rules (`event_not_publishable` lists what's missing); covers (type, size, public serving); public catalog and event pages; token expiry → refresh → session end.

## 9. Where this project differs from bookings

| bookings_web | events-web | Why |
|---|---|---|
| Access token in a readable cookie (`token`, `auth-type`, profile and assignment cookies) | Token in memory only; assignment id in `localStorage` | The API's guide forbids storing the token; a readable cookie has the same XSS exposure as `localStorage`. |
| `toast.error(error.message)` | `toast.error(…, { body: describeApiError(error) })` | The API says to branch on `error.code`; its messages are technical. |
| `X-User-Type` header; separate `/auth/customer/*` | Not used | The API tells staff and customer tokens apart by the token's own type. Customer sign-in arrives with registrations (Phase 4). |
| Whole Lucide set looked up by name | Only the icon names the backend uses are imported | Keeps the rest of Lucide out of the page. |
| Express 4 with `asyncHandler`; lowercase module codes | Express 5 (no wrapper needed); `UPPER_SNAKE_CASE` codes | Backend choices on this project. |
| Sidebar from `/me` only | Same, plus a dev-only "Demo pages" accordion | The template's demo screens have no backend module yet. |
| Sidebar 274 px wide | Same (set in `components/ui/app-shell.tsx`) | Long group names fit beside their arrow. |

## 10. Guests and registrations (built)

- **Guests** (`/admin/guests`, module `REGISTRATIONS`): guest profiles with **server-side search** (names, email, phone; `09…` also finds `+251…`, debounced with `useDebouncedValue`), create, edit, switch off, and a record page whose Registrations tab lists every event the guest holds a place at.
- **Events › Guests tab** (`registrations-tab.tsx`): places left (`registrations/summary`), the guest list with status filter and search, **Register a guest** (a new guest or an existing one found by search; a ticket type is asked only when the event has several), **Cancel** (behind a confirm) and **Bring back**. Each registration shows its SMS confirmation status (`message` status kind) and whether it was added by staff or signed up online.
- Refusals are shown in words from `error.code` (`registration_closed` with its `details.reason`, `capacity_reached` with its `scope`, `already_registered`, `ticket_type_required`, `person_inactive`).
- A new `Idempotency-Key` (`crypto.randomUUID()`) is made on each press of *Register guest*.

## 11. The visitor site (built)

The marketplace (`/`, `/events`, `/events/<organization>/<event>`) keeps its own design and runs on the public API, with no login and no token. The screens still read the types they always did (`EventItem`, `EventSummary`); what changed is where the data comes from.

- **`lib/marketplace/catalog.ts`** builds the catalog from `GET /v1/public/events` (up to 500 events) and loads one event's page from `GET /v1/public/organizations/{org}/events/{event}`. **`lib/services/events-service.ts`** keeps its method names and return types. Search, filters and sorting run in memory over the loaded events.
- **An event's `slug` is `<organization slug>/<event slug>`**, because the API needs both. The existing `/events/${event.slug}` links therefore become `/events/<organization>/<event>` with no component changed. The detail route is `app/(home)/events/[org]/[slug]`.
- **Empty means empty.** Where the API has nothing to say (prices, followers, ratings, an agenda, speakers), the field is empty and the screen hides that block instead of showing an invented value. Categories are free text on the API, so they come from the events themselves (`CategoryId` is a string; a category without a designed palette gets one by a stable hash).
- **Cover:** the uploaded picture (`EventCover src`) when the organizer added one, otherwise the generated artwork.
- **Registration** stands in for tickets: one free ticket type is derived from `registration_open` and the registration window, so the existing badges (*Opens soon*, *Registration closed*, *Happening now*) read the API unchanged. The ticket-purchase panel on the event page is the sign-up form (`components/marketplace/public/register-form.tsx`): first and last name, an Ethiopian mobile, optional email and organization, a ticket choice when there are several, and the privacy notice (its `version` is sent back). Each press of *Register* makes a new `Idempotency-Key`; only an automatic retry after a **network** failure reuses it. Success shows the visitor's code (also sent by SMS); refusals are shown from `error.code`.
- **API down:** `eventsService.isAvailable()` is false and the home and events pages say so ("We can't load events right now") instead of showing empty lists that read as "no events".
- **Removed** (they assumed prices and orders the API doesn't have): the mock checkout, booking confirmation, tickets list, ticket QR and calendar downloads. `/my-tickets` now explains that the ticket is the code.
- **Timezones:** every event carries its own IANA timezone (`EventItem.timezone`, from the API), and the date formatters in `lib/marketplace/datetime.ts` take it as an optional last argument (Addis Ababa when left out). Cards, the event header, the hero, the gallery, the spotlight and the sign-in ticker pass the event's zone, so every visitor reads the clock time at the venue. An event that isn't on Addis Ababa time shows a small note on its page ("Dubai time"). The *today / this weekend* filters still count calendar days in Addis Ababa, because that is the audience's day.

## 12. Access Control (built)

- **Roles** (`/admin/access/roles`, module `ROLES`): read only. A list of the organization's roles, and a record page showing what each may do per module.
- **Staff Assignments** (`/admin/access/assignments`, module `USER_ROLES`): who holds which role, paged. **Add staff** is a full page: type a mobile, *Look up* shows the name so the owner can confirm the person, then pick a role (and a branch only when `has_branches`). The API looks the number up itself, so no user id is ever sent. **Change role** uses the edit form; **Switch off access** is behind a confirm. The only active Owner can't be switched off or moved (`last_owner_assignment`): the screen hides those actions when everyone fits on one page, and the API's answer is the backstop.
- **Every organization has roles.** `POST /v1/organizations` creates the default Owner and Viewer roles, and a backfill migration repaired older organizations (events-api commit `0c6d726`).

## 13. Not built yet

- **Attendee accounts:** `/account` and the attendee OTP sign-up on `/auth` are still simulated. There are no attendee accounts on the API: a visitor registers with no account, and their code is their ticket (`/my-tickets` says so).
- **Search on the visitor site:** the API has no search, so `/events` filters by category and organizer only.
- **Access Control › Modules, Role Templates, Permission Overrides:** hidden by the API team's decision (no endpoints). Roles are read only: there is no create or edit.
- **Search** on lists: the API has no search parameter; tables run without it.
- Settings → profile and password forms, and attendee sign-in, are still simulated.

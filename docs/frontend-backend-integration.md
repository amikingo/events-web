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
- **`ROUTE_MODULE_MAP`** (same file) says which module guards which screen. `moduleForPath()` picks the longest matching prefix. Venues are guarded by `EVENTS`, as on the backend (there is no `VENUES` module). Their menu entry comes from a **menu-only module** created on *Access › Modules* (code `VENUES`, sits under Event Management, address `/venues`, icon `MapPin`, *Roles can be given it* off). The API sends menu-only modules to every role, so `buildModuleTree` shows a page only when the role may view the module that **guards its screen** (`moduleForPath(href)` → `ROUTE_MODULE_MAP`): Venues show to whoever can view Events. The same works for any future menu-only page: create the module, map its `route_name` in `module-routes.ts` and its path in `ROUTE_MODULE_MAP`. **Orders** works the same way: a menu-only module (code `ORDERS`, address `/orders`) shown to whoever can view `REGISTRATIONS`; the page (`app/admin/orders/page.tsx`) picks an event and shows its orders, because the API lists orders per event only.
- **`lib/constants/module-routes.ts`** maps the backend's `route_name` (from `/me` navigation, e.g. `/events`) to the frontend path (`/admin/events`). The backend can add a module without the frontend guessing its URL. **A `route_name` missing from this map has no screen yet, and the sidebar leaves it out.** All four Access Control pages are mapped; the Platform pages (`/admin/platform/*`) are not in this map.
- In markup: `<Can I="create" a={MODULE_CODES.EVENTS}>…</Can>`. In code: `const { can, hasModuleAccess } = useModuleAccess(); can("update", MODULE_CODES.EVENTS)`. Actions are CASL's: `read` (the backend's `view`), `create`, `update`, `delete`, `import`, `export`, `notify`.
- **No fallbacks that hide missing permissions.** While `/me` loads nothing is granted. If it didn't grant it, it isn't shown. The frontend never decides from role names.
- **Route guard:** `DashboardRouteGuard` + `hooks/use-role-guard.tsx` send a role that may not view the current path to `/admin/forbidden`. `/admin` itself redirects to the first page the role's menu offers.
- **Sidebar** is built like bookings: one entry per top-level backend menu item, in `sno` order. An entry with one page is a plain link; with more it is an accordion that expands in place.
- **Demo pages:** the template's pages with no backend module (Payments, Orders, Users…) show in a "Demo pages" accordion and are reachable **in development only** (`DEMO_PAGES_ENABLED` in `lib/config/demo-pages.ts`). Production builds hide them and the guard blocks them.

## 6. Screens

- **Records follow the payments template:** list (`Table`, server-paged) → peek panel → full record page → create/edit as a full page. Modals only confirm. **Each screen has its own form file**, not a shared one and not the workspace's built-in `form`. The screen renders its form instead of the workspace when `location.mode` is `create` or `edit`, and the workspace's own `form` prop is a stub. To add a record type, copy `venue-form.tsx` (the simplest) and change the fields. Delete, archive and block never sit in a table row. See `.cheche-ui/patterns.md` and section 6.1.
- A screen is a thin `page.tsx` that renders `<Suspense><XScreen /></Suspense>`. The screen picks the organization (`useOrganizationId`) and renders `<XView organizationId>` where all the hooks live.
- Tables are server-paged: pass `page`, `onPageChange`, `rowsPerPage`, `onRowsPerPageChange`, `totalRows`. Turn off `searchable` and `filters` until the API can search or filter that list; a search over only the visible page misleads.
- Copy is plain, sentence case, no exclamation marks, buttons name the action ("Create event"). Statuses use `StatusPill`. Added for this project: `event`, `signup`, `registration`, `message` and `ticketOrder` (an order's `PENDING_PAYMENT`, `CONFIRMED`, `EXPIRED`, `REFUND_REQUIRED`, passed straight from the API). The `ticketOrder` kind is also in the library template.
- **Icons are Lucide everywhere.** `components/ui/icons.tsx` keeps its names and draws each icon with Lucide; for anything else import from `lucide-react`. Menu and module icons come from the backend's icon name, as in bookings: `iconForModule(code, name)` in `lib/rbac/module-sidebar.ts` finds **any** Lucide icon through `normalizeLucideIconName()`, which accepts the name as lucide.dev writes it (`calendar-days`), as code (`CalendarDays`), or with `_`/spaces. It looks in Lucide's own `icons` list, so only real icons match. An unknown name falls back to `ICON_BY_CODE`, then `LayoutDashboard`. Nothing to add when a module uses a new icon. The cost: the whole Lucide set is in the admin bundle (the visitor site doesn't load this file).
- **List toolbars** (`Table toolbarActions`): filters and the create button sit in one `flex … sm:flex-nowrap` row, so they don't stack on wide screens; they wrap on phones only.

### 6.1 Create and edit pages

Every form page has the same shape (reference: `client-form.tsx` for a plain record, `event-form.tsx` for the richest):

- **No breadcrumb in the form.** `app/admin/layout.tsx` already draws one for every page (`getBreadcrumbTrail` in `lib/config/brandos-config.ts`); a second one inside the form repeats it.
- **Left-aligned, `max-w-6xl`** (`max-w-7xl` for the permission pages), never centred, so the form lines up under the layout's breadcrumb.
- **Header:** `<h1>`, one line of why, then **Cancel** and the main button on the right. No second set of buttons at the bottom. Cancel asks "Discard changes?" only when something was typed; Save is disabled on edit until something changed.
- **Two columns from `lg`:** on the left a **live preview** card that stays in view (`lg:sticky lg:top-6`) and shows the record as people will see it while it's typed (initials or icon tile, name, labels, key lines with faint placeholders); on the right the fields in titled sections (`<h2 className="type-h3">` + a `Card`). They stack on phones, preview first.
- **Settings as rows:** less common options sit in a list of rows (icon tile, title, one line saying what the current setting means, the control on the right; `OptionRow` in each form file), e.g. the event's *Event options*, the organization's *Setup*, the module's *Behaviour*.
- **The form fills in what it can:** codes from the name (`EVENT_COORDINATOR`, `ADDIS_OFFICE`) until the code is typed by hand, the web address preview from the name, an event's end two hours after its start, capacity digits only. Codes are upper-cased as typed.
- **Pick from lists, don't type codes:** countries, currencies and timezones are searchable `Combobox` lists that still save the same codes; roles are `SelectCard` choice cards with their description and how many areas they open.
- **Two-step pages** (Add staff): numbered step headings whose number turns into a tick when done; the summary card on the left shows what will happen.
- **Placeholders read as examples** ("e.g. Banking Forum 2027").

### 6.2 Permission screens

Roles, role templates and platform roles share one pattern (`role-form.tsx`, `role-template-form.tsx`, `platform-role-form.tsx`). Keep it for any new permission screen:

- **Details on the left** (400 px, sticky from `xl`), **"What they can do" on the right**; below `xl` they stack.
- **One checkbox table:** the seven rights (View, Create, Update, Delete, Import, Export, Notify) as columns labelled once at the top; a dash where an area has no such right. Areas are grouped (Events · Organization · Team and access · Other/Platform), each with its menu icon and one line on what it covers; the icon tile turns pink once the area is open. On phones each area's boxes show with labels under it.
- **An "Opens" strip** above the table lists what the role opens, with *See all areas* and *Clear all*.
- **Ticking rules and payloads** live in `app/admin/access/_components/grant-grid.tsx` (`initialGrantState`, `toggleGrantFlag`, `grantsEqual`, `toGrantPayload`, `sortGrantableModules`): any right ticks View, unticking View clears the area, and the payload always carries every grantable module (a hidden Branches row keeps what the role holds).
- Not used, on purpose: access-level dropdowns (No access / View / Full / Custom) and extra rights as rows under each area. Both were tried and dropped.

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
6. `lib/rbac/module-sidebar.ts`: nothing for the icon the backend names (any Lucide name works); add the module code to `ICON_BY_CODE` only if you want a fallback when it sends none.
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
| Whole Lucide set looked up by name | Same (`normalizeLucideIconName`), but only in Lucide's `icons` list, never its other exports | Any icon the backend or the module form names just works. |
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
- **Removed** (they assumed prices and orders the API didn't have then): the mock checkout, booking confirmation and tickets list. Real checkout, order pages, ticket QR codes and calendar downloads came back with Phases 7 and 8 (sections 6 and 12a).
- **Timezones:** every event carries its own IANA timezone (`EventItem.timezone`, from the API), and the date formatters in `lib/marketplace/datetime.ts` take it as an optional last argument (Addis Ababa when left out). Cards, the event header, the hero, the gallery, the spotlight and the sign-in ticker pass the event's zone, so every visitor reads the clock time at the venue. An event that isn't on Addis Ababa time shows a small note on its page ("Dubai time"). The *today / this weekend* filters still count calendar days in Addis Ababa, because that is the audience's day.

## 12. Access Control (built)

- **Roles** (`/admin/access/roles`, module `ROLES`): list (filterable by template), record page, and create/edit with the permission table (section 6.2). A new role can *Start from* a template, which fills the form and sends `role_template_id`. The Owner role can't be edited. Errors shown in words: `grant_exceeds_own_access` (which rights you don't hold yourself), `role_template_inactive`, `role_locked`.
- **Role templates** (`/admin/access/role-templates`): ready-made roles with a *For new organizations* switch (every new organization gets a role made from it). Roles made from a template are copies; changing the template never changes them.
- **Modules** (`/admin/access/modules`): the menu and permission tree. Name (the code follows it), place in the menu (*Sits under*, order, any Lucide icon by name with a live preview), page address, *Show in menu*, *Roles can be given it*. Core modules keep their address and permission setting.
- **Staff Assignments** (`/admin/access/assignments`, module `USER_ROLES`): who holds which role, paged. **Add staff** is a two-step full page: type a mobile and *Look up* (the name comes back so the owner can confirm the person); if no Cheche account uses the number, the page creates one (names and a password, with *Generate*) and shows the one-time sign-in details to hand over. Then pick a role card (and a branch only when `has_branches`). The API looks the number up itself, so no user id is ever sent. **Change role** uses the edit form; **Switch off access** is behind a confirm. The only active Owner can't be switched off or moved (`last_owner_assignment`): the screen hides those actions when everyone fits on one page, and the API's answer is the backstop.
- **Platform** (`/admin/platform/roles`, `/admin/platform/staff`): platform roles (same permission table; their access to organization areas applies in every organization) and platform staff, added like organization staff but without an organization. A person who is staff of an organization can't be platform staff.
- **Every organization has roles.** `POST /v1/organizations` creates the default Owner and Viewer roles, and a backfill migration repaired older organizations (events-api commit `0c6d726`).

## 12a. The door, returns, payment cases, cancel and reschedule (Phases 8 and 9, built)

- **Ticket QR** (`components/checkout/ticket-qr.tsx`, `qrcode` like bookings): the payload is the ticket's `code` only, never the order or its token. At least 240 px with a quiet margin, black on white in both themes. Shown for confirmed tickets on the order page and My Tickets, each with *Save* (PNG) and *Share* (the device share sheet, where it can share files).
- **Door** (`/admin/events/{id}/door`, `door.tsx`, Guests › update): camera (the browser's `BarcodeDetector`, else `jsqr`) and a typed code, both `POST …/check-ins` with a new `Idempotency-Key` per scan; *Try again* after a network failure resends the same key. Before `doors_open_at` (or the start) the scanner rests with "Doors open at {time}"; from `ends_at` on, "The event has ended".
- **Dashboard** (`/admin/dashboard`, menu-only module: code `DASHBOARD`, address `/dashboard`, first in the menu so staff land on it; guarded by `EVENTS`): real data only. Live, coming up, ticket sales, revenue, ticket sources, the next six events, open refund cases and drafts. Replaces the template's demo "Today" page.
- **Bklit UI charts** (`components/bklit/`): installed from the `@bklit` shadcn registry in a scratch project, then copied here on their own, because the installer writes to `components/charts/` and `components/ui/` (card, badge) and would overwrite ours. Packages: `d3-array`, `d3-scale`, `d3-shape`, `motion`, `@number-flow/react` (+ `@types/d3-*`). Their colour variables are mapped to our tokens in `app/globals.css`, so they follow the brand and dark mode. Every chart on both dashboards is Bklit (area, line and donut cards in `app/admin/dashboard/dashboard-charts.tsx`, each in our `Card`); the number tiles stay our `KpiCard`. Installed: area, line, bar, pie, ring, gauge, funnel, heatmap, radial, sankey, radar, sunburst and composed charts (extra packages: `d3-sankey`, `@base-ui/react`). The area, line and donut cards show real data. A separate "More charts" section (`sample-charts.tsx`) shows the other types with made-up figures, each card labelled "Sample data". Ticket sales, revenue and ticket sources are worked out in the browser from each event's confirmed guest-list rows (`use-ticket-report.ts`; up to 100 events and 3,000 tickets per event, Guests › view). A report endpoint on the API should replace this as data grows. Lint rules for React Compiler are relaxed for `components/bklit/charts` (vendored, like `components/ui`).
- **Door in the menu** (`/admin/door`, menu-only module: create it on Access › Modules with code `DOOR` and address `/door`; guarded by `REGISTRATIONS`, letting guests in needs Guests › update): the same door screen with a picker of published events. It opens on the event running now, else the next to start; `?event=` keeps the choice, so a gate phone can be bookmarked on it.
- **Guests tab:** a *Door* column (`booking` status *Checked-in* with the time), *Checked in* / *Not in yet* filters (`?checked_in=`), and a *Checked in* tile.
- **Return ticket** (`return-ticket.tsx`, on the Guests tab and on each order's tickets): `POST …/registrations/{id}/return` behind a confirm that names the refund for a paid ticket; the toast opens the refund case. It replaces *Cancel registration* (the API treats both the same). A ticket used at the door shows the action disabled.
- **Payments** (`/admin/payments`, module `PAYMENTS`, route `/payments` from `/me`): the case list (Open / Resolved / All, kind, event; filters also in `?event_id=&kind=`) and a case page with the order, its tickets, the Cheche Pay references and *Record outcome* (Payments › update): *Refunded* (amount, currency, merchant reference) or *Closed without refund* (note). Status words reuse the shared vocabulary: open → *Needs a decision*, refunded → *Refunded*, closed → *Closed*. The demo payments page and its form were removed.
- **Event schedule** (`event-schedule.tsx`): *Doors open* on the event form; the schedule fields lock once a guest was let in. A published event's date edits always send start, end (and the door time when it has one) together. *Reschedule* (published events) and *Cancel event* (draft or published) are their own dialogs; cancelling asks whether used tickets are refunded once guests were let in, then links to the event's refunds. A cancelled event shows a banner with when and how refunds work.
- **Buyer order page:** reads the public event too, so it shows the current start, "Doors open {time}", and "This event was cancelled" with "The organizer will refund you" when a paid ticket was cancelled. The public event page shows "Doors open {time}".
- **Known API gap:** the payment-case list's `kind` filter doesn't accept `EVENT_CANCELLATION` yet; the page filters that kind on the returned page instead.

## 12b. Profiles and passwords (Phase 10, built)

- **My profile** (`/admin/settings`, "My profile" in the header's user menu, for everyone signed in): your names through `PUT /v1/auth/staff/profile`. The reply's `access_token` replaces the one in memory (`updateOwnStaffProfile` in `lib/api/auth.ts` re-announces the session), so the header shows the new name at once. The mobile is read-only. **Change password** (`PUT /v1/auth/staff/password`): current, new, confirm (the confirmation is checked in the browser); a `wrong_password` issue goes on the current-password field and you stay signed in.
- **Forgot password** on Team sign-in (`app/auth/steps/forgot-step.tsx`, `reset-step.tsx`): the mobile, then the SMS code and a new password (`/v1/auth/staff/forgot-password`, `/reset-password`). The code step always shows the API's own `message` and never says whether the number has team access. Success returns to Team sign-in with the mobile filled in. Guests keep "Sign in with a code instead".
- **Staff Assignments › Edit details** (`edit-details-form.tsx`, Staff Assignments › update): loads `GET …/profile`; names, email, sex and date of birth (Ethiopian or Gregorian picker, no future dates). Only changed fields are sent; an emptied optional field sends `""`. The mobile is read-only.
- **Guest account** (`/account`): *Edit name* saves through `PUT /v1/auth/customer/profile`, then refreshes the guest session.
- **Payment return:** the order page reads only the reference in its path, so Cheche Pay's `?tx_ref=` changes nothing.

## 12c. Scheduled ticket prices (Phase 11, built)

- **Ticket types tab:** *Regular price* plus **Scheduled prices** (`price-windows.tsx`): start, optional end, price, up to 20, typed in the event's timezone and sent as instants. The API's rules are checked before saving (end after start, no overlaps), its `invalid_range` / `overlapping_window` land on the matching row, and a preview spells out the schedule. The whole list is sent on every save (`[]` clears it). The list shows the price in force, "Regular …", "Changes …" and a *Scheduled* badge.
- **Current price everywhere staff pick tickets:** *Issue tickets* and *Register a guest* read `effective_price`, and refetch when `price_valid_until` passes (`lib/use-at-time.ts`). A `payment_required` refusal (register, change ticket type, bring back) says what the type costs now and offers *Create an order*; bringing back a paid ticket says it can't come back free.
- **Buyers:** "Price changes …" on the event page and in checkout, which reloads the page's prices when that time passes. If a new order's total differs from what the page showed, checkout doesn't jump to payment: the order page shows the note above *Pay now* (`lib/price-change.ts`). Order pages list each ticket's fixed price.

## 13. Not built yet

- **Attendee accounts:** `/account` and the attendee OTP sign-up on `/auth` are still simulated. There are no attendee accounts on the API: a visitor registers with no account, and their code is their ticket (`/my-tickets` says so).
- **Search on the visitor site:** the API has no search, so `/events` filters by category and organizer only.
- **Search** on lists: the API has no search parameter; tables run without it.

# Cheche UI — which component for which case

Pick by the **case**, not by looks. Each table says: situation → component (+ the prop that makes the variant). If two rows seem to fit, take the more specific one. Props are in `components.md`.

## 1. Badges, labels and counts

| Case | Use |
|---|---|
| The **state of a record** (booking, payment, order, stock, inspection, ticket, vehicle, account) | `<StatusPill kind="…" status="…">` — the only way. Colors come from the shared vocabulary; if the word you need isn't there, add it to `statusVocabulary` first, never pick a color. |
| A fixed label: a **role, category, plan, environment** ("Branch manager", "Spa", "Org") | `<Pill tone="neutral">`. Roles and categories are **never colored**, so they aren't read as status. |
| A live status that changes over time | `StatusPill` (it has the dot by default). A fixed label gets no dot. |
| Status inside a **dense table** or on an already-tinted surface | `variant="outline"` |
| The **one** state that must be seen first on a screen (red *Expired* on a vehicle card, green *Paid* on a receipt) | `variant="solid"` — **once per screen**. Environment tags (Live green, Sandbox amber, Beta accent) are also solid. |
| Table cells and inside chips / large on card headers and mobile | `size="sm"` / default / `size="lg"` |
| A state with a universal symbol (✓, ⚠, 🔒) | `Pill` with a 12px icon from `icons.tsx` inside; icon and text share the pill color. |
| A **number on an icon button, tab or nav item** | `CountBadge` (accent by default; `tone="danger"` only for "needs action now"; shows `99+` over 99). Inside a label: `inline`; on the Filters button / inside segmented items: `inline soft`. |
| "Something new", number doesn't matter | `CountBadge dotOnly` |
| A **live counter** that changes | `CountBadge pop` |
| A **clickable** filter or toggle pill, or an applied-filter / selected-value pill with × | `Chip` (`selected`, `onRemove`). It is the **only interactive pill**; everything else is read-only. |
| Two words max per pill. A sentence never goes in a pill. | |

Colors mean: success = done/valid/paid · warning = waiting/due soon/low · danger = failed/expired/cancelled/needs action · neutral = finished/inactive/archived · info (accent) = in progress/new/highlighted.

## 2. Buttons and links

| Case | Use |
|---|---|
| The main action of a screen or dialog (one per view) | `<Button>` (primary) |
| Cancel, Back, secondary actions | `<Button variant="secondary">` |
| Irreversible / destructive confirm (inside a dialog) | `<Button variant="danger">` |
| Icon only (toolbars, row view, pagers) | `<Button iconOnly aria-label="…">` or `IconButton` (when it needs a count/dot) |
| While the action runs | `<Button loading loadingLabel="Saving">` — keeps width, disables itself, label turns present tense |
| An inline text action inside copy or a card header/footer | `TextLink` (button) / `CardLink` (anchor) |
| Close ×  on a dialog, toast, drawer | `CloseButton` (the dialogs already include it) |
| Never | a colored custom button; two primary buttons in one view |

## 3. Typing values (one value, free entry)

| Case | Use |
|---|---|
| Short text, email, name | `Input` (+ `Field` for label/error) |
| Input with a prefix/suffix/icon (currency, unit, @, icon) | `InputGroup` with `InputAddon` |
| Long free text | `Textarea` |
| Ethiopian phone number | `PhoneInput` (fixed +251, groups 3-3-3, green check when valid) |
| **Money** (never a plain number field) | `AmountInput` (separators as you type, ETB suffix; the large centered variant with quick-pick chips for wallet top-up/send) |
| A **small count**: seats, passengers, items | `NumberStepper` (large size for touch) |
| Password / sign-up with strength | `PasswordInput` (`strengthMeter` on sign-up) |
| Six-digit verification code | `OtpInput` (+ `OtpResend` for the countdown) |
| Search with suggestions | `SearchInput` (debounce 300ms, results after 2 characters) |
| Always wrap a labelled field | `Field label htmlFor required hint error` — error text replaces the hint |

## 4. Choosing from options

| Case | Use |
|---|---|
| Yes/no that is **submitted with a form** ("I agree", select rows) | `Checkbox` |
| An **instant on/off setting** | `Switch` |
| One of a few (≤ 5), all visible | `RadioGroup` |
| **2–4 mutually exclusive** options that must stay visible, compact | `SegmentedControl` (`tone="accent"` only for the choice that drives price or payment) |
| One of **5–8** options in a form | `Select` |
| One of **more than ~8** (branches, merchants, routes, staff) | `Combobox` (type to filter; groups, sub-lines, avatars) |
| **Several** values in one field (roles, services) | `MultiSelect` (chosen items show as removable chips) |
| One of a few **rich options** with logo/price/description (payment method, add-on, plan) | `SelectCard` — `control="radio"` for one, `control="checkbox"` for many, `plan={…}` for a plan picker. On a phone inside a sheet: `BottomSheet` + `SelectCard`. |
| A time of day from slots | `TimeSlotPicker` |
| Quick toggle filters above a list | `Table quickFilters` (not hand-made chips) |
| Never | native `<select>`, or a Select for 30 options |

## 5. Dates and times

| Case | Use |
|---|---|
| One date | `DatePicker` (add `calendars={["gc","ec"]}` when users may need the Ethiopian calendar; touch devices get the native picker) |
| A period (reports, settlements, leave) | `DateRangePicker` |
| Date **and** time | `DateTimePicker` |
| Pick an appointment/departure slot | `TimeSlotPicker` |
| A date filter in a table | automatic from ISO-date columns, or `filters` with `type: "daterange"` |
| Showing dates/times | `formatDate` / `formatTime` from `lib/format.ts` (Gregorian, 12-hour) |

## 6. Files and places

| Case | Use |
|---|---|
| Documents, receipts, KYC, photos | `FileUpload` (progress rows, retry) |
| A person's/organization's picture | `AvatarUpload` |
| Address with a map pin (city, sub-city, woreda, landmark) | `LocationPicker` (optional Leaflet adapter) |

## 7. Cards — pick by what the card shows

| Case | Use |
|---|---|
| A **number with a trend** (revenue, bookings) | `KpiCard` (`spark` for a sparkline, `compact` in dense grids) |
| An **analytics chart** with a range filter | `ChartCard` |
| A **list of recent items** (transactions, bookings, activity) | `ListCard` |
| Something to **browse**: media + title + one action (service, article) | `ContentCard` |
| A **link/shortcut** (whole card is the button) | `ActionCard` (`layout="tile"` for home-screen grids) |
| **Key–value summary + total + 2 buttons** (booking, invoice) | `InfoCard` |
| A **person or organization** (avatar, contact rows, 2 buttons) | `ProfileCard` |
| An **inline notice** with a color stripe (info/success/warning/danger), optional dismiss | `AlertCard` |
| A card that behaves as a **radio/checkbox** | `SelectCard` |
| Anything else that needs the container | `Card` (+ `CardHeader`, `CardFooter`, `CardLink`); lay out with `CardGrid` (`narrow` for KPI rows, `wide` for charts/lists). Only `hoverable` cards lift. |
| Never mix compact and default density in one grid. | |

Small visual pieces: a person → `Avatar` (initials tile); an icon on a tinted square → `IconTile` (tone = meaning); a payment method → `PayLogo`.

## 8. Dialogs and overlays

| Case | Use |
|---|---|
| Confirm an action ("Approve payout?") | `ConfirmDialog` |
| **Irreversible / high impact** (delete, block) | `DestructiveDialog` (`confirmName` makes the user type the record name; omit for a plain red confirm) |
| A **blocking notice** the user must acknowledge (no close, no backdrop dismiss) | `AlertDialog` |
| Pick one option on a phone (payment method, filter choices) | `BottomSheet` (+ `SelectCard`) |
| A short **wizard** | `StepModal` |
| A longer task on a phone | `FullscreenModal` |
| **Payment code** step / waiting on the phone | `PaymentOtpDialog` / `PaymentProcessingDialog` |
| Preview an image or document | `Lightbox` |
| A custom dialog body | `Modal` + `ModalHeader`/`ModalBody`/`ModalFooter` (sizes sm 400 / md 560 / lg 760; `centered` for confirmations) |
| A secondary panel on the right (quick filters, quick actions) | `Drawer` |
| **Create or edit a record** | **not a dialog** → full page `RecordForm` |
| **View a record** | **not a dialog** → `RecordWorkspace` (peek panel → full page) |
| Rule | One modal at a time; modals only confirm, alert, pick or preview media. |

## 9. Telling the user something

| Case | Use |
|---|---|
| An action **succeeded** (4s) | `toast.success` |
| An action **failed** — say what didn't happen to the money/data; stays until dismissed | `toast.error` (with a retry action) |
| Needs attention soon (6s) | `toast.warning` |
| Announcement / passive update (4s) | `toast.info` |
| Reversible action ("Booking cancelled") | `toast.undo` (5s window) |
| One async step (spinner → success/error in place) | `toast.promise` / `toast.loading` |
| Background job with progress (export) | `toast({ progress: … })` |
| Live event with a person (new booking) | rich `toast({ leading: <Avatar/>, … })` |
| Phone one-liner at the bottom | `toast.snackbar` |
| An error **inside a dialog or form body** (wrong code, rejected payment) | `ErrorBanner` |
| A **field's** problem | `Field error="…"` |
| A **persistent notice on the page** (EIMS format change, low stock) | `AlertCard` |
| A quiet **aside** in a panel ("Don't close this screen") | `Note` |
| Offline with cached data | `OfflineBar` (preferred over an empty state) |
| Never | `alert()`, `confirm()`, a toast for a validation error |

## 10. Loading

| Case | Use |
|---|---|
| A button's own action | `Button loading` |
| Unknown short wait in a spot (select panel, inline) | `Spinner` (accent on surfaces; `tone="soft"` for background refresh) |
| A **section/page whose content is coming** | `Skeleton` of the same shape, wrapped in `Loadable` / `useLoadingPhase` (nothing <300ms → skeleton → message at 3s → Retry/Cancel at 10s) |
| A **card** | its `loading` prop · a **table** `loading` · a **form** `FormSkeleton` |
| The admin app starting | `ShellSkeleton` (nav stays live; **admin apps never splash**) |
| A **consumer mobile app** starting | `SplashScreen` |
| Known progress (upload, quota) | `ProgressBar` / `ProgressField` · unknown total: indeterminate |
| Route change in an admin app | `TopProgress` (3px top line) |
| More rows under a list | `LoadMore` · phone lists: `PullToRefresh` |
| Images | `LazyImage` |
| Waiting on a payment | `PaymentProcessingDialog` (30s fallback) |
| Never | an empty state before data arrives; a full-page spinner for one widget |

## 11. Empty states (`EmptyState`) — tone tells what happened

| Case | Props |
|---|---|
| First run, nothing created yet | `tone="accent"`, `ring`, `sparks` (full-page/onboarding only), one primary action that creates the thing |
| Search found nothing | `tone="charcoal"`, show the query in `<code>`, offer "Clear search" |
| Filters match nothing | `tone="charcoal"`, show the applied chips, one "Clear filters" (a `Table` does this itself) |
| Could not load | `tone="danger"`, plain cause, **Retry** |
| Offline, nothing cached | `tone="warning"` |
| Locked / no permission | `tone="charcoal"`, lock icon, who can grant access, one request action |
| All caught up (approval queue empty) | `tone="success"`, **no** action |
| Inside a table, list, select panel or chart | `size="sm"` / `inline`, no ring |
| Whole page | `size="lg"` |
Title names what's missing ("No bookings yet"), never "Empty" or "No data".

## 12. Navigation and menus

| Case | Use |
|---|---|
| The signed-in frame | `AppShell` + `Sidebar` (`SidebarItem`; `SidebarGroup` for a parent with 2+ children) + `Topbar` (search box, bell and avatar are on by default; pass `search.items`, `notifications`, `user`, `organization`) |
| Switching sections of **one record/page** | `Tabs` (`count` for numbers; `defaultValue` when nothing else needs the selection) |
| Switching between **2–4 views of the same data** inline | `SegmentedControl` |
| Where am I / go up | `Breadcrumb` |
| Global jump/search (⌘K) | `CommandPalette` |
| A list of **actions** on a trigger (⋯, avatar) | `DropdownMenu` (destructive item last, below a rule, red). Your own `<Button>` as the trigger: `DropdownMenuTrigger asChild`. Inside a scrolling or clipping parent (a card, a table): `DropdownMenuContent portal` |
| A list of **values to choose** | `Select` / `Combobox` — not a DropdownMenu |
| Keyboard hints | `Kbd` |
| Light / Dark / System choice | `ThemeSwitch` — already first in the `Topbar` avatar menu; use it alone only on a settings page. No `dark:` classes, no custom toggles. |

## 13. Showing data

| Case | Use |
|---|---|
| Many rows with columns, sort, search, filter, paging | `Table` (phones stack into cards automatically) |
| 3–10 recent items in a card | `ListCard` |
| Rows with nested line items (invoice) | `Table expandable` (the row's own fields never go there) |
| A single record's overview | `RecordWorkspace` / `RecordIdentity` + `RecordStats` + `RecordKv` |
| Key–value rows with a total | `InfoCard` / `SummaryCard` |
| Pick a record's row to open it | `Table onRowClick` |
| Row actions | view icon + ⋯ via `rowActions`; **never delete/archive in a row** |
| Bulk actions on selected rows | `Table selectable bulkActions` |

## 14. Records (the whole pattern)
Full recipe and reference code: `.cheche-ui/patterns.md` §3 (the starter's `payments/[[...slug]]/payments-view.tsx`).
List → `Table onRowClick` → peek panel (`RecordWorkspace`, ↑ ↓ to step, Esc closes) → full page (⤢ or Ctrl/Cmd+click) → Edit = full page `RecordForm` (same form for create and edit) → destructive actions on the record page behind `DestructiveDialog`.

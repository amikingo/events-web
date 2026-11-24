# Cheche UI — recipes

Copy the shape, then look the component up in `components.md` for every prop. Import paths below assume the alias `@/components/ui/…`; use relative paths if the project has no alias.

## 1. A list page (table)

```tsx
"use client";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/format";

type Payment = { id: string; customer: string; method: string; amount: number; status: string };

const columns: ColumnDef<Payment>[] = [
  { key: "id", header: "Payment", filter: false, filterValue: (r) => r.id, accessor: (r) => <span className="font-mono">{r.id}</span> },
  { key: "customer", header: "Customer", primary: true, sortable: true, accessor: (r) => r.customer },
  { key: "method", header: "Method", accessor: (r) => r.method },                       // text → multi-select filter automatically
  { key: "status", header: "Status", filterValue: (r) => r.status, render: (r) => <StatusPill kind="payment" status={r.status} /> },
  { key: "amount", header: "Amount", numeric: true, sortable: true, filterValue: (r) => r.amount, accessor: (r) => formatCurrency(r.amount) },
];

export default function PaymentsPage({ payments }: { payments: Payment[] }) {
  return <Table columns={columns} data={payments} getRowId={(r) => r.id} title="Payments" />;
}
```
- Built in: toolbar, search, Filters panel (inferred from columns), sorting, pagination, phone cards, "no results" states. Opt out with `toolbar={false}`, `pagination={false}`, `filters={false}`.
- A cell that returns an element (pill, link) needs `filterValue` to be filterable/searchable; formatted numbers also need it for a range filter.
- Loading: `loading` prop. Empty first-run: `emptyState={<EmptyState … />}`. Server-side data: pass `totalRows`, `page`, `onPageChange`, `onSearchChange`, `onSortChange`.
- Row opens a record: `onRowClick`. Rows with nested line items: `expandable`.
- Never put delete/archive in `rowActions`.
- **Page title:** a page whose main content is a `Table` uses the table's `title` and no separate `<h1>`; other pages (dashboard, a form) start with `<h1 className="type-h1">`.
- **"New …" button:** goes in `toolbarActions` (primary `Button`, `PlusIcon` before the label, label names the action: "New customer"). It navigates to the create route (recipe 2 below); it does not open a modal.
- **Mock data:** until a real query exists, keep it in a `const` at the top of the page under a `// Mock data — replace with your own queries.` comment, with a stable `id` for `getRowId`.

## 2. A form (create / edit a record) — full page

```tsx
"use client";
import { RecordForm } from "@/components/ui/record-form";

<RecordForm
  mode="create"                    // or "edit" (button reads "Save changes", disabled until changed)
  noun="customer"
  backLabel="Customers"
  initialValues={{ name: "…" }}    // edit only
  sections={[
    { id: "personal", title: "Personal details", fields: [
      { name: "name", label: "Full name", required: true, requiredMessage: "Enter the customer’s full name.", full: true },
      { name: "type", label: "Type", type: "segmented", options: [{ label: "Individual", value: "Individual" }, { label: "Business", value: "Business" }] },
    ] },
    { id: "contact", title: "Contact", fields: [
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email" },
    ] },
  ]}
  onSubmit={(values) => save(values)}
  onCancel={() => router.back()}
/>
```
Field types: `text | email | tel | select | segmented | textarea`. It validates on blur and submit, shows the linked error summary, tracks unsaved changes and asks "Discard changes?".
For a one-off small form (login, settings) compose `Field` + `Input` / `PasswordInput` / `Select` / `Checkbox` / `Switch` / `Button`, with `Field error="…"` for messages and `<Button loading loadingLabel="Saving">` while submitting.

**The create route.** `New customer` leads to a page that renders only the form, e.g. `app/(dashboard)/customers/new/page.tsx` (`"use client"`): `<RecordForm mode="create" noun="customer" backLabel="Customers" sections={…} onSubmit={…} onCancel={() => router.push("/customers")} />`. Edit is the same page at `/customers/[id]/edit` with `mode="edit"` and `initialValues`. After saving, go to the record's page and `toast.success("Customer created")`. Routes follow `/<things>`, `/<things>/new`, `/<things>/[id]`, `/<things>/[id]/edit`.

## 3. Viewing a record — the peek panel and the 360 page

**Reference implementation:** `app/(dashboard)/payments/[[...slug]]/payments-view.tsx` in a starter project. Copy it for any other list (customers, bookings, orders…): change the type, mock data, `columns`, `identity`, `stats`, `panel`, `page` and `form`. It is one optional catch-all route that serves all four URLs:

| URL | State | Notes |
|---|---|---|
| `/payments` | list | `Table` with `onRowClick` |
| `/payments` (row clicked) | **peek panel** | 520px, local state, **URL does not change**; ↑ ↓ step through the rows as the table shows them; Esc closes and focus returns to the row |
| `/payments/PAY-8841` | **full 360 page** | ⤢ in the panel, Ctrl/Cmd+click a row, or a shared link |
| `/payments/new` | create | full-page `RecordForm` |
| `/payments/PAY-8841/edit` | edit | the same form, filled in; save is disabled until something changes |

What goes where (the guideline's Detail view rules):
- **Identity (panel and page, always first):** logo/avatar, name, `StatusPill`, a mono id and one muted line (kind · date). Actions: **one primary, one secondary, everything else in ⋯**; destructive items last, red, and they only open a confirm (`api.confirm`).
- **Stats strip (panel and page):** four numbers the list already has — 2×2 in the panel, four across on the page.
- **Peek panel:** only what the list already knows (key–value facts). It never fetches, so it opens instantly.
- **360 page only:** tabs with data the panel never loaded (timeline, refunds, transactions, documents, activity) and a **side rail** (customer, settlement, tags, assignee). The page shows a skeleton while its own data loads.
- **Panel never in the URL; page, create and edit are routes.** Wire them with `location={parseRecordPath(base, pathname)}` and `onLocationChange={(l) => router.push(recordPath(base, l))}`.
- **Phone:** the panel goes full width, stats 2×2.
- **After saving:** go to the record's page, `toast.success`, and a new row flashes in the list.
- **Never** open a record, create or edit in a modal or drawer, and never put delete/archive in a table row.

Pages are thin **server** files (`page.tsx` exports `instant = false` and renders the client view, e.g. `payments-view.tsx`), because Next.js 16's route options like `instant` can't be exported from a `"use client"` file; copy that split for pages that depend on the signed-in user.

Two Next.js notes the template already handles: wrap anything that calls `usePathname()` in `<Suspense>` (the dashboard layout and the page do), and Next keeps a live copy of the page per URL, so rows must come from one shared source (a query, SWR, or a store), not `useState` inside the page.

## 4. Confirmations and dialogs (modals never show or edit a record)

```tsx
<ConfirmDialog open={open} onOpenChange={setOpen} title="Approve payout?" description="…" confirmLabel="Approve payout" loading={busy} loadingLabel="Approving" onConfirm={approve} />
<DestructiveDialog open={…} onOpenChange={…} title="Delete this venue?" description="…" confirmName="Soreti Spa" onConfirm={remove} />   // type the name to enable the red button
<AlertDialog open={…} onOpenChange={…} title="Session expired" description="…" actionLabel="Sign in again" />                           // blocking, no close
```
Pick-one on phones: `BottomSheet` + `SelectCard`. Preview images/documents: `Lightbox`. Payment code: `PaymentOtpDialog`, waiting: `PaymentProcessingDialog`. Short wizard: `StepModal`.

## 5. Dashboard / overview

```tsx
<CardGrid size="narrow"><KpiCard label="Revenue" value="184,250" unit="ETB" trend={{ direction: "up", value: "12.4%", label: "vs last month" }} icon={<CardIcon />} /></CardGrid>
<CardGrid size="wide">
  <ChartCard title="Revenue" subtitle="Daily, ETB" value="184,250" change="↑ 12.4%" ranges={ranges} />
  <ListCard title="Recent transactions" action={<CardLink href="/payments">View all</CardLink>} rows={rows} />
</CardGrid>
```
Other cards: `ContentCard`, `ActionCard`, `InfoCard` (summary + total), `ProfileCard`, `AlertCard`, `SelectCard`. Every card takes `loading`.

## 6. States

- Loading a section: `<Loadable …>` / `useLoadingPhase` (nothing for 300ms → skeleton → message after 3s → Retry/Cancel after 10s). Admin shell while loading: `ShellSkeleton`.
- Empty: `<EmptyState title="No bookings yet" description="…" actions={<Button>New booking</Button>} />`. Tile tone carries meaning: accent = nothing yet, charcoal = nothing found/locked, danger = could not load, warning = offline, success = all done.
- Toasts: `toast.success("Booking confirmed", { body })`, `toast.error`, `toast.undo`, `toast.promise`. Mount `<Toaster />` once.
- Status: `<StatusPill kind="booking" status="confirmed" />`. Roles/tags are plain neutral `Pill`.

## 7. Layout of a signed-in page

`app/(dashboard)/layout.tsx` already wraps pages in `AppShell`, `Sidebar` and `Topbar` (the top bar already includes menu toggle, ⌘K search, bell and avatar — pass data only: `search={{ items, onSelect }}`, `notifications`, `user`, `organization`). A page renders its title (`<h1 className="type-h1">`), optional `Breadcrumb`, then its content. Use `Tabs` for sections of one record.

## 8. Things not to do

- No `<button className="…">`, `<input className="…">`, `<table>`, hand-made modals/dropdowns or badges.
- No hex colors, no `bg-gray-*`/`text-blue-*`, no `rounded-[…]`, no `shadow-[…]`, no `text-[13px]` for new UI (use `type-*`).
- No custom status colors; no "Oops!"; no `alert()` / `confirm()`.
- Don't put create/edit in a modal or a drawer; don't put destructive actions in table rows.
- Don't fetch or format in components: pass already formatted strings or use `lib/format.ts`.

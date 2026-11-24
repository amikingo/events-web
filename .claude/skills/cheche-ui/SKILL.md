---
name: cheche-ui
description: Build or change UI in a project that uses the Cheche component library (components/ui, styles/tokens.css). Use whenever creating a page, form, table, dialog, dashboard, card, nav or any screen, or when asked to match the Cheche brand guideline. Looks up the right ready-made component and its props so nothing is hand-built or restyled.
---

# Cheche UI

This project ships a complete, guideline-exact React + Tailwind v4 component library in `components/ui/`. Your job is to **assemble screens from it**, not to write UI primitives.

## Workflow
1. **Choose by case.** For every element, find its situation in `.cheche-ui/choosing.md` and use the component and variant it names (which badge, input, card, dialog, toast, loader, empty state).
2. **Find the pattern.** Open `.cheche-ui/patterns.md` and match the screen to a recipe (list page, form page, record view, confirmation, dashboard, states).
3. **Look up each component** in `.cheche-ui/components.md` (search for its name). It lists every export, prop, type and default. Read the props before using a component; many behaviors are on by default (table toolbar/search/filters/pagination, loading skeletons, validation).
4. **Compose with data.** Pass `data`, `columns`, `sections`, `rows`, `loading`, handlers. Do not wrap-and-restyle.
5. **Check the rules** in the project's `AGENTS.md` / `CLAUDE.md` (the "Cheche UI" block): tokens only, `StatusPill` for statuses, modals only confirm, create/edit on a full page, formats from `lib/format.ts`, guideline voice for copy.
6. **Verify.** Typecheck, then view at 375px wide and in dark mode (`data-theme="dark"` on `<html>`). Check the console is clean.

## Quick map: need → component (details and variants per case: `.cheche-ui/choosing.md`)
| Need | Use |
|---|---|
| Button, icon button, text link | `Button`, `IconButton`, `TextLink` |
| Text/number/phone/amount/password/OTP input | `Input`, `InputGroup`, `PhoneInput`, `AmountInput`, `PasswordInput`, `OtpInput`, `NumberStepper` |
| Choose one / many / search & pick | `Select`, `SegmentedControl`, `RadioGroup`, `Combobox`, `MultiSelect`, `SearchInput` |
| Date, range, time, slots | `DatePicker`, `DateRangePicker`, `DateTimePicker`, `TimeSlotPicker` |
| Files, avatar upload, map location | `FileUpload`, `AvatarUpload`, `LocationPicker` |
| Field label + error + hint | `Field` |
| Whole form page | `RecordForm` (or `FormCard` + `Field`s for small forms) |
| Data list | `Table` |
| Record panel / page | `RecordWorkspace` (+ `RecordIdentity`, `RecordStats`, …) |
| Cards | `Card`, `KpiCard`, `ChartCard`, `ListCard`, `ContentCard`, `ActionCard`, `InfoCard`, `ProfileCard`, `AlertCard`, `SelectCard` |
| Status / tags / counts | `StatusPill`, `Pill`, `Chip`, `CountBadge` |
| Dialogs | `ConfirmDialog`, `DestructiveDialog`, `AlertDialog`, `Modal` (+ parts), `StepModal`, `FullscreenModal`, `BottomSheet`, `Drawer`, `Lightbox`, `PaymentOtpDialog` |
| Feedback | `toast.*` + `Toaster`, `ErrorBanner`, `Note` |
| Loading / empty | `Skeleton`, `Spinner`, `Loadable`, `ProgressBar`, `ShellSkeleton`, `EmptyState` |
| Navigation | `AppShell`, `Sidebar`, `Topbar`, `Tabs`, `Breadcrumb`, `CommandPalette`, `DropdownMenu` |
| Brand | `Logo` (never restyle) |
| Formats | `lib/format.ts`: `formatTime`, `formatCurrency`, `formatDate`, `maskPhone` |

## If a component can't do it
Don't edit `components/ui/` for one screen and don't rebuild it locally. State what's missing and ask. Changes to the library affect every project that shares it.

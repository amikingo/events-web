# Cheche UI — component catalog

Generated from `components/ui/*.tsx` (`npm run build:catalog`). Import with a relative path or your alias: `import { Button } from "@/components/ui/button"`.
Every file listed here is a ready, guideline-exact component: pass data and props, never rebuild its markup or restyle it.

**Icons** (`components/ui/icons.tsx`, the only icon set — pick the closest, never add a library): `ViewIcon`, `EditIcon`, `MoreIcon`, `SortIcon`, `ChevIcon`, `PagerPrevIcon`, `PagerFirstIcon`, `PagerLastIcon`, `PagerNextIcon`, `CheckIcon`, `SearchIcon`, `FilterIcon`, `CalendarIcon`, `XIcon`, `AlertCircleIcon`, `EyeIcon`, `EyeOffIcon`, `MinusIcon`, `PlusIcon`, `CheckThinIcon`, `UploadIcon`, `DocIcon`, `CameraIcon`, `PinIcon`, `LocateIcon`, `MapPinIcon`, `ClockIcon`, `BuildingIcon`, `XCircleIcon`, `WarnIcon`, `InfoIcon`, `UndoIcon`, `DownloadIcon`, `WifiOffIcon`, `LockIcon`, `AlertIcon`, `ImageIcon`, `PlusThinIcon`, `PauseIcon`, `PlayIcon`, `BellIcon`, `CartIcon`, `StarIcon`, `BoltIcon`, `ScheduleIcon`, `DashboardIcon`, `CardIcon`, `SettingsIcon`, `MenuIcon`, `ChevRightIcon`, `ChevUpDownIcon`, `UserIcon`, `LogoutIcon`, `ShieldIcon`, `ArrowLeftIcon`, `ChevUpIcon`, `MaximizeIcon`, `MinimizeIcon`, `SunIcon`, `MoonIcon`, `MonitorIcon`.

## action-card

`components/ui/action-card.tsx` · client component

- **`ActionCard`** — The whole card is the button: icon tile, label, optional sub-label, chevron that nudges and turns accent on hover. Always lifts on hover.

**ActionCardProps** extends Omit<HTMLAttributes<HTMLDivElement>, "title">

| Prop | Type | Notes |
|---|---|---|
| `icon` | `ReactNode` |  |
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `layout?` | `"row" \| "tile"` | `row` is label + chevron; `tile` stacks vertically for home-screen grids and drops the chevron. |
| `href?` | `string` |  |

## alert-card

`components/ui/alert-card.tsx` · client component

- **`AlertCard`** — Inline alert: a 3px left stripe carries the meaning, the icon tile matches it. Dismiss slides it 12px right while it fades.

**AlertCardProps** extends Omit<CardProps, "title">

| Prop | Type | Notes |
|---|---|---|
| `tone?` | `AlertCardTone` |  |
| `title` | `ReactNode` |  |
| `time?` | `ReactNode` | Timestamp at the title's right ("Just now"). |
| `body?` | `ReactNode` |  |
| `actions?` | `ReactNode` | One or two `CardLink`s under the body. |
| `onDismiss?` | `() => void` | Shows the × and slides the card away when pressed. |

## amount-input

`components/ui/amount-input.tsx` · client component

- **`AmountInput`** — Money is never a plain number field: thousands separators appear as you type, two decimals max, the currency sits in a suffix addon, numeric keyboard on mobile, tabular numerals.

**AmountInputProps** extends Omit<InputGroupProps, "type" \| "leading" \| "suffix" \| "trailing" \| "value" \| "onChange" \| "size">

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | The formatted value, as returned by `onValueChange`. |
| `onValueChange` | `(value: string) => void` |  |
| `currency?` | `string` | Currency shown as the suffix addon (default ETB). |
| `size?` | `"default" \| "large"` | `large` — the centered wallet top-up field: 36px / 700, currency label beside it, bottom rule that turns accent on focus. |
| `quickAmounts?` | `number[]` | `large` only — quick-pick chips under the field (`.quick-amts`). The chip matching the current value is selected. |

## app-shell

`components/ui/app-shell.tsx` · client component

- **`SIDEBAR_MIN`**
- **`SIDEBAR_MAX`**
- **`SIDEBAR_DEFAULT`**
- **`SIDEBAR_COLLAPSED`**
- **`SIDEBAR_SNAP`** — Dragging the resizer narrower than this collapses the sidebar.
- **`AppShell`** — The admin layout (Navigation > app shell): a sidebar card and a main card side by side with a 4px gap, a top bar above the page. Below 760px the sidebar becomes a slide-over drawer with a backdrop; the top bar shows the menu toggle.

**AppShellProps**

| Prop | Type | Notes |
|---|---|---|
| `sidebar` | `ReactNode` | A `<Sidebar>`. |
| `topbar` | `ReactNode` | A `<Topbar>`. |
| `children` | `ReactNode` | The page. Goes in `.app-main` (18px / 20px padding, scrolls). |
| `defaultCollapsed?` | `boolean` |  |
| `storageKey?` | `string` | localStorage key that remembers the dragged sidebar width. Default `cheche-sb-w`. |
| `className?` | `string` | On the shell's outer box. Give it a height (`h-dvh`) and the sidebar and the page scroll inside it instead of the window. |
| `mainClassName?` | `string` | Classes for the scrolling page area, e.g. `!p-0` when the pages pad themselves. |

## avatar

`components/ui/avatar.tsx` · server-safe

- **`Avatar`** — `.avatar` — initials on an accent-tinted rounded tile (not a circle).

**AvatarProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `initials` | `string` | Initials shown on the tile. |
| `size?` | `AvatarSize` | px — the guideline's contexts: 18 chip, 24 option row, 32 toast, 36 default, 48 detail header. |

## bottom-sheet

`components/ui/bottom-sheet.tsx` · client component

- **`BottomSheet`** — `.sheet` — the mobile pick list: slides up from the bottom, drag handle, title, options, one full-width action.
- **`BottomSheetList`** — The sheet's option list (`gap 8`).

**BottomSheetProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `title?` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `container?` | `"viewport" \| "parent"` |  |
| `children` | `ReactNode` |  |
| `className?` | `string` |  |

## breadcrumb

`components/ui/breadcrumb.tsx` · client component

- **`Breadcrumb`** — `.breadcrumb` — 12px, parents as soft links, "/" separators, the current page in 600 text.

**BreadcrumbItem**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `href?` | `string` | Omit on the last item (the current page). |
| `onClick?` | `() => void` |  |

**BreadcrumbProps**

| Prop | Type | Notes |
|---|---|---|
| `items` | `BreadcrumbItem[]` |  |
| `maxItems?` | `number` | Longer paths collapse their middle into a "…" link: Home / … / Branches / Bole Branch. Click it to show the full path. Default 4. |
| `renderLink?` | `(item: BreadcrumbItem, props: { className: string }) => ReactNode` | Render links through your router: `(item, props) => <Link href={item.href} {...props}>{item.label}</Link>`. |
| `className?` | `string` |  |

## button

`components/ui/button.tsx` · server-safe

- **`Button`**

**ButtonProps** extends ButtonHTMLAttributes<HTMLButtonElement>

| Prop | Type | Notes |
|---|---|---|
| `variant?` | `ButtonVariant` |  |
| `iconOnly?` | `boolean` | `.btn.icon-only` — 36x36, no label. Override the size with className where a context needs a different one (the table's 32px row actions, the pager's 30px arrows). |
| `loading?` | `boolean` | Shows the spinner, disables the button and keeps its width — the idle content stays in layout (invisible) while the spinner and `loadingLabel` sit centred over it. |
| `loadingLabel?` | `ReactNode` | The present-tense label shown while loading ("Processing…"). Defaults to the normal label. Icon-only buttons just show the spinner. |
| `asChild?` | `boolean` | Give the single child element (a router `<Link>`, an `<a>`) the button's look instead of rendering a `<button>`. No loading state in this mode. |

## card

`components/ui/card.tsx` · server-safe

- **`Card`** — `.card` — the surface container: 12px radius, 1px border, resting shadow.
- **`CardHeader`** — `.card-head` — title 14/600 with an optional 12px sub on the left, one action on the right. No divider underneath.
- **`CardFooter`** — `.card-foot` — 1px top rule, 14px above and below it; pills on the left, buttons on the right.
- **`CardLink`** — `.card-link` — the 12px accent text action in a card header or footer.
- **`CardGrid`** — `.card-grid` — auto-fit grid, 16px gap; cards stretch to equal height. `narrow` 190px (KPI rows), default 230px, `wide` 300px (charts, lists).

**CardProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `compact?` | `boolean` | `compact` is the 12px/14px padding used for stacked rows and dense lists; default is 18px. |
| `hoverable?` | `boolean` | Lifts on hover (raised shadow, -2px) — for cards that are links or buttons. |
| `selected?` | `boolean` | Accent border and focus ring — a selected card. |
| `disabled?` | `boolean` | 50% opacity, not interactive. |

**CardHeaderProps** extends Omit<HTMLAttributes<HTMLDivElement>, "title">

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` | `.card-sub` — 12px muted line under the title. |
| `action?` | `ReactNode` | The trailing action: a `CardLink`, a range select or an icon button. |

## chart-card

`components/ui/chart-card.tsx` · client component

- **`ChartCard`** — Analytics shell: title with the standard select as range filter, headline value, bar chart (current period in full accent), axis and legend.

**ChartRange**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | Option label ("Last 7 days"). |
| `value` | `string` |  |
| `values` | `number[]` | One bar per value, oldest first; the last bar is the current period. |
| `axis` | `string[]` | Axis labels spread under the bars. |

**ChartCardProps** extends Omit<CardProps, "title">

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `value` | `ReactNode` | The headline figure above the bars. |
| `change?` | `ReactNode` | Change next to the figure ("↑ 12.4%"), green. |
| `ranges` | `ChartRange[]` | One entry per selectable range; the first is shown initially. |
| `legend?` | `[current: string, previous: string]` | Legend labels under the divider. |
| `loading?` | `boolean` |  |
| `onRangeChange?` | `(value: string) => void` | Called when the user switches range, so the figure can follow. |

## checkbox

`components/ui/checkbox.tsx` · client component

- **`Checkbox`** — `.checkbox-box` + `checkSvg()` — 18x18, 5px radius, 1.5px input-border, accent fill when checked.

**CheckboxProps** extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" \| "value">

| Prop | Type | Notes |
|---|---|---|
| `checked` | `boolean` |  |
| `indeterminate?` | `boolean` |  |
| `onCheckedChange` | `(checked: boolean) => void` |  |
| `label?` | `ReactNode` | `.control-label` — renders the guideline's `.checkbox-row` (box + label, whole row clickable). Without it, give the box an `aria-label`. |

## chip

`components/ui/chip.tsx` · client component

- **`Chip`** — `.pill.chip` — the filter-chip / tab-like toggle used in `.chip-row`, `.tbl-toolbar-sub`, etc.

**ChipProps** extends ButtonHTMLAttributes<HTMLButtonElement>

| Prop | Type | Notes |
|---|---|---|
| `selected?` | `boolean` |  |
| `onRemove?` | `() => void` | `.chip-x` — renders the small remove "×" inside the chip (applied-filter chips, multi-select values). |
| `removeLabel?` | `string` |  |
| `leading?` | `ReactNode` | An `<Avatar size={18}>` or `<PayLogo size={18}>` before the label (pulled 5px into the padding). |

## close-button

`components/ui/close-button.tsx` · server-safe

- **`CloseButton`** — `.cmdk-close` — the 26px quiet "×" used in toasts, the command palette and modal headers.

## combobox

`components/ui/combobox.tsx` · client component

- **`Combobox`** — `.combo` — a select for more than about eight options. The trigger is the text input; typing filters the panel and highlights the match in accent; options can group under a small label and carry a sub-line, an avatar or a status.

**ComboboxOption**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `label` | `string` |  |
| `sub?` | `ReactNode` | `.opt-sub` — muted text after the label ("12 staff"). |
| `group?` | `string` | Section heading this option belongs to; options sharing a `group` are listed together. |
| `leading?` | `ReactNode` | Avatar, pay logo or a 14px icon before the label. |
| `right?` | `ReactNode` | Pill / status at the far right. |

**ComboboxProps**

| Prop | Type | Notes |
|---|---|---|
| `options` | `ComboboxOption[]` |  |
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `placeholder?` | `string` |  |
| `emptyText?` | `string` | Message when the typed text matches nothing. |
| `id?` | `string` |  |
| `error?` | `boolean` |  |
| `loading?` | `boolean` | Options are being fetched: the panel shows a spinner row instead of the list. |
| `loadingLabel?` | `string` |  |
| `className?` | `string` |  |

## command-palette

`components/ui/command-palette.tsx` · client component

- **`CommandPalette`** — `.cmdk-panel` — the ⌘K command palette: search box, a list that filters as you type (title, sub-line and keywords), ↑ ↓ to move, Enter to run, Esc or a backdrop click to close.

**CommandItem**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `title` | `string` |  |
| `sub?` | `string` | Muted line under the title. |
| `group?` | `string` | The group tag on the right ("Navigation", "Actions"). |
| `icon?` | `ReactNode` | A 14px icon on the 26px tile. |
| `keywords?` | `string` | Extra words that match the search but aren't shown ("dashboard overview home"). |

**CommandPaletteProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `items` | `CommandItem[]` |  |
| `onSelect` | `(item: CommandItem) => void` |  |
| `placeholder?` | `string` |  |
| `hotkey?` | `boolean` | Open on ⌘K / Ctrl+K from anywhere. Default true. |
| `container?` | `"viewport" \| "parent"` | `viewport` (default) covers the screen; `parent` fills the nearest positioned ancestor (a demo stage). |

## confirm-dialog

`components/ui/confirm-dialog.tsx` · client component

- **`ConfirmDialog`** — Centered confirmation: tile, title, one or two lines, Cancel + primary. Focus lands on the primary action.
- **`DestructiveDialog`** — A delete that cannot be undone: danger tile, the name to type, red button disabled until it matches.
- **`AlertDialog`** — A blocking notice: no close button, no Escape, no backdrop dismissal — the user must acknowledge.

**ConfirmDialogProps** extends BaseProps

| Prop | Type | Notes |
|---|---|---|
| `confirmLabel?` | `ReactNode` |  |
| `cancelLabel?` | `ReactNode` |  |
| `tone?` | `Exclude<IconTileTone, "danger">` |  |
| `onConfirm` | `() => void` |  |
| `children?` | `ReactNode` | Extra body content under the description (a key/value summary). |

**DestructiveDialogProps** extends BaseProps

| Prop | Type | Notes |
|---|---|---|
| `confirmName?` | `string` | The exact name the user must type (a record's name or reference) before the red button enables. Omit for a plain red confirmation. |
| `confirmLabel?` | `ReactNode` |  |
| `cancelLabel?` | `ReactNode` |  |
| `onConfirm` | `() => void` |  |

**AlertDialogProps** extends Omit<BaseProps, "loading" \| "loadingLabel" \| "error">

| Prop | Type | Notes |
|---|---|---|
| `actionLabel?` | `ReactNode` |  |
| `tone?` | `IconTileTone` |  |
| `onAction?` | `() => void` | Runs when the user acknowledges; the dialog then closes. |

## content-card

`components/ui/content-card.tsx` · server-safe

- **`ContentCard`** — Media on top, title, description, meta, a footer with one action. Hoverable by default — the whole card opens the item.

**ContentCardProps** extends Omit<CardProps, "title">

| Prop | Type | Notes |
|---|---|---|
| `tag?` | `ReactNode` | Small tag on the media ("Spa", "Guide"). |
| `media?` | `"brand" \| "charcoal" \| "image"` | `brand` gradient (services), `charcoal` gradient (articles), or `image` with `imageSrc` (4:3-cropped photo). Never both. |
| `imageSrc?` | `string` |  |
| `imageAlt?` | `string` |  |
| `title` | `ReactNode` |  |
| `description?` | `ReactNode` |  |
| `meta?` | `ReactNode` | Meta line under the description: an icon plus text ("Soreti Spa, Bole · 1.2 km"). |
| `metaIcon?` | `ReactNode` |  |
| `footerLeft?` | `ReactNode` | Footer: a figure or note on the left, one action on the right. |
| `action?` | `ReactNode` |  |
| `loading?` | `boolean` |  |

## count-badge

`components/ui/count-badge.tsx` · server-safe

- **`CountBadge`** — `.count` — the small pill number: solid accent by default, `danger` / `neutral` tones, `inline`, `soft`, `dotOnly`.

**CountBadgeProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `tone?` | `"accent" \| "danger" \| "neutral"` |  |
| `inline?` | `boolean` | `inline` sits in the text flow (after a label, 6px left margin). Default floats on the top-right corner of a `relative` parent. |
| `soft?` | `boolean` | `soft` — tinted accent instead of solid fill (inline only; used on the Filters button and inside segmented items). |
| `dotOnly?` | `boolean` | A 10px dot with no number, for "something new". |
| `pop?` | `boolean` | Pop (scale 0.6 → 1.2 → 1) whenever the content changes — a live notification counter. |

## date-picker

`components/ui/date-picker.tsx` · client component

- **`DatePicker`** — `.date-trigger` + `.date-panel` — one date. Gregorian by default; with `calendars={["gc","ec"]} ` a toggle re-reads the same underlying day in the Ethiopian calendar (13 months, Pagume short). Selection never moves when you switch — only the labels do.

**DatePickerProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | Selected date as ISO `YYYY-MM-DD` (always Gregorian — the calendar toggle only changes how it's shown), or `""`. |
| `onValueChange` | `(iso: string) => void` |  |
| `placeholder?` | `string` |  |
| `calendars?` | `CalendarSystem[]` | Calendars on offer. `["gc"]` (default) is Gregorian-only — ERP and partner-facing admin screens. `["gc", "ec"]` adds the Gregorian / Ethiopian toggle for SuperApp, POS and government-facing screens. |
| `today?` | `string` | ISO date treated as today (highlight). Defaults to the real today. |
| `native?` | `boolean \| "auto"` | Use the device's native date picker (`<input type="date">`) instead of the panel. `"auto"` (default) does so on touch-first devices — the guideline's mobile rule — unless the Ethiopian calendar is on offer, which native pickers can't show. `true` / `false` force it either way. |
| `min?` | `string` | Earliest / latest selectable ISO date (native picker only). |
| `max?` | `string` |  |
| `id?` | `string` |  |
| `className?` | `string` |  |

## date-range-picker

`components/ui/date-range-picker.tsx` · client component

- **`DateRangePicker`** — `.drp` — range picker. A date-trigger opens a panel with presets on the left, a month grid on the right and a "range · N days / Clear / Apply" footer. Like the guideline, picks update `value` live; Apply only closes the panel (and stays disabled until a full range is chosen).

**DateRange**

| Prop | Type | Notes |
|---|---|---|
| `start` | `string \| null` |  |
| `end` | `string \| null` |  |

**DateRangePickerProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `DateRange` |  |
| `onValueChange` | `(range: DateRange) => void` |  |
| `placeholder?` | `string` | Shown in the trigger while no range is applied. |
| `today?` | `string` | ISO date treated as "today" — highlights it and anchors the presets. Defaults to the real today. |
| `align?` | `"start" \| "end"` | Which edge of the trigger the panel lines up with. The guideline opens it from the left; use `"end"` when the picker sits near the right edge of the screen (the Filters panel does). |
| `id?` | `string` |  |
| `className?` | `string` |  |

## date-time-picker

`components/ui/date-time-picker.tsx` · client component

- **`DateTimePicker`** — The guideline's one combined "Date & time picker". On touch devices it's the native `datetime-local` picker (RNDateTimePicker on mobile); elsewhere it pairs the date panel with a time field.

**DateTimePickerProps** extends Omit<DatePickerProps, "value" \| "onValueChange" \| "native" \| "min" \| "max">

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | ISO local date-time `YYYY-MM-DDTHH:mm`, or `""`. |
| `onValueChange` | `(value: string) => void` |  |
| `native?` | `boolean \| "auto"` |  |
| `min?` | `string` |  |
| `max?` | `string` |  |

## date-trigger

`components/ui/date-trigger.tsx` · server-safe

- **`DateTrigger`** — `.date-trigger` — the 36px calendar-icon box that opens a date or date-range panel.

**DateTriggerProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `open?` | `boolean` |  |
| `empty?` | `boolean` | Placeholder styling (faint) when no date is chosen. |
| `children` | `ReactNode` |  |

## drawer

`components/ui/drawer.tsx` · client component

- **`Drawer`** — Right-hand panel for secondary tasks (filters, quick actions): min(380px, 92%) wide, header and footer fixed, body scrolls.

**DrawerProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `footer?` | `ReactNode` | Pinned bottom bar for the actions. |
| `container?` | `"viewport" \| "parent"` |  |
| `children` | `ReactNode` |  |
| `className?` | `string` |  |

## dropdown-menu

`components/ui/dropdown-menu.tsx` · client component

- **`DropdownMenu`** — Root. Controls open state itself unless `open`/`onOpenChange` are passed.
- **`DropdownMenuTrigger`** — Trigger button — renders a `<button>` around whatever you pass as children (icon, label, both), or decorates the child with `asChild`.
- **`DropdownMenuContent`**
- **`DropdownMenuItem`**
- **`DropdownMenuSeparator`**

**DropdownMenuProps**

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` |  |
| `open?` | `boolean` |  |
| `onOpenChange?` | `(open: boolean) => void` |  |
| `className?` | `string` | Replaces the default `relative inline-block` wrapper classes (e.g. `relative block w-full` for a form select, `static` to anchor the list to an ancestor). |

**DropdownMenuTriggerProps** extends ButtonHTMLAttributes<HTMLButtonElement>

| Prop | Type | Notes |
|---|---|---|
| `asChild?` | `boolean` | Use the single child element as the trigger (your own `<Button>`, an `<IconButton>`) instead of wrapping it in another button: the menu's aria attributes, click handler and `className` are merged onto it. |

**DropdownMenuContentProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `align?` | `"start" \| "end"` |  |
| `role?` | `"menu" \| "dialog"` | `"menu"` (default) for a list of items, with arrow-key navigation; use `"dialog"` for a panel of form fields. |
| `portal?` | `boolean` | Draw the menu in a layer over the page (`position: fixed`, 6px under the trigger, `align` kept) instead of inside the trigger's box, so a scrolling or clipping ancestor — a table's scroll area, an `overflow-hidden` card — can't cut it off. It flips above the trigger when there is no room below and follows the trigger while the page scrolls. Positional classes (`left-0`, `inset-x-0`, `top-*`) don't apply; width classes do. |
| `matchTriggerWidth?` | `boolean` | With `portal`: the menu is exactly as wide as its trigger (what `Select` uses for its panel) instead of using a width class. |

**DropdownMenuItemProps** extends ButtonHTMLAttributes<HTMLButtonElement>

| Prop | Type | Notes |
|---|---|---|
| `destructive?` | `boolean` |  |

## empty-state

`components/ui/empty-state.tsx` · server-safe

- **`EmptyState`** — `.empty` — icon tile (or ring), bold title, one muted line, optional chips, meta and actions.
- **`DashedZone`** — `.empty-dashed` — the dashed container for drop zones and "nothing here yet" areas.

**EmptyStateProps** extends Omit<HTMLAttributes<HTMLDivElement>, "title">

| Prop | Type | Notes |
|---|---|---|
| `size?` | `"sm" \| "md" \| "lg" \| "inline"` | `sm` for panels and drop zones, default for cards, `lg` for whole pages, `inline` for a one-line row. |
| `icon?` | `ReactNode` |  |
| `tone?` | `IconTileTone` | The tile colour carries the meaning: accent "nothing yet", charcoal "nothing found / locked", danger "could not load", warning offline, success "all done". |
| `ring?` | `boolean` | Wrap the tile in the soft orbit ring. For full-page moments (`lg`) and the first-run onboarding state only. |
| `sparks?` | `boolean` | Three small accent dots around the ring — first-run only. |
| `title` | `ReactNode` | What is missing, in the user's words: "No bookings yet", never "Empty" or "No data". |
| `description?` | `ReactNode` | One sentence: why, or what happens next (34 characters per line max). Put the query in `<code>`. |
| `chips?` | `ReactNode` | Active-filter chips shown under the description (a "No filter matches" state). |
| `meta?` | `ReactNode` | `.empty-meta` — a muted line above the actions ("Last synced 10 min ago"). |
| `actions?` | `ReactNode` | At most one primary and one secondary action, or a text link. The primary is the thing that fills the space. |
| `animate?` | `boolean` | Fade the state in when it replaces another (search → no results). |

**DashedZoneProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `state?` | `"idle" \| "dragging" \| "error"` | Hover / drag state: accent border and a faint accent wash. `dragging` also turns the dashes solid. |
| `hoverable?` | `boolean` |  |

## error-banner

`components/ui/error-banner.tsx` · server-safe

- **`ErrorBanner`** — `.mdl-err` — the failure notice that sits inside a modal body (wrong OTP code, a rejected payment).

## field

`components/ui/field.tsx` · server-safe

- **`Label`** — `.field-label` on its own — for layouts that place the control themselves (a switch row, a checkbox list). Prefer `<Field label>`.
- **`Field`** — `.field` — label, control, then error / success / hint beneath it (only one is shown, in that order).

**FieldProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `label?` | `ReactNode` |  |
| `htmlFor?` | `string` | `htmlFor` of the label — pass the control's `id`. |
| `required?` | `boolean` |  |
| `hint?` | `ReactNode` | `.field-hint` — neutral help text under the control. |
| `error?` | `ReactNode` | `.field-error` — replaces the hint; pair it with the control's `error` state. |
| `success?` | `ReactNode` | `.field-ok` — confirmation under the control ("Looks good"); replaces the hint. |

## file-upload

`components/ui/file-upload.tsx` · client component

- **`FileUpload`** — The dashed drop zone from Empty states plus the upload rows from Loading states: drag over turns it accent, each file gets a row with a 4px bar, done rows turn green, failed rows red with Retry.
- **`AvatarUpload`** — `.avatar-upl` — a 68px rounded tile with a camera badge, a title, the spec line and Upload / Remove.

**UploadItem**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `name` | `string` |  |
| `size` | `string` | "1.8 MB". |
| `status` | `UploadStatus` |  |
| `progress` | `number` | 0–100. |
| `speed?` | `string` | Transfer rate while uploading ("1.1 MB/s"), shown after the size. |
| `error?` | `string` | Shown instead of the size when `failed` ("Upload failed · network error"). |
| `image?` | `boolean` | Image files get the gradient thumb; everything else the document glyph. |

**FileUploadProps**

| Prop | Type | Notes |
|---|---|---|
| `items` | `UploadItem[]` |  |
| `onFiles` | `(files: File[]) => string \| void` | Called with the files dropped or chosen. Validate and start the upload; return a message to reject them instead. |
| `onRetry` | `(id: string) => void` |  |
| `onRemove` | `(id: string) => void` |  |
| `onPause?` | `(id: string) => void` | Show a Pause button on running rows and a Resume button on paused ones. Omit both to keep cancel only. |
| `onResume?` | `(id: string) => void` |  |
| `accept?` | `string` | Passed to the file picker (`accept`), and shown in the hint line. |
| `title?` | `ReactNode` |  |
| `hint?` | `ReactNode` |  |
| `multiple?` | `boolean` |  |
| `className?` | `string` |  |

**AvatarUploadProps**

| Prop | Type | Notes |
|---|---|---|
| `initials?` | `string` | Initials on the empty tile. |
| `src?` | `string` | Image URL once set; otherwise the tile shows initials (or the gradient placeholder when `hasImage`). |
| `hasImage?` | `boolean` |  |
| `title` | `ReactNode` |  |
| `hint` | `ReactNode` | The muted spec line ("Square, at least 400×400 · JPG or PNG"). |
| `accept?` | `string` | The file input's `accept`. |
| `onFile` | `(file: File) => void` |  |
| `onRemove` | `() => void` |  |
| `uploadLabel?` | `string` |  |

## form-card

`components/ui/form-card.tsx` · server-safe

- **`FormCard`** — `.form-demo-card` — the form surface: 16px radius, 22px padding, 16px between fields, 360px wide by default (override with `className`).

**FormCardProps** extends Omit<HTMLAttributes<HTMLDivElement>, "title">

| Prop | Type | Notes |
|---|---|---|
| `title?` | `ReactNode` |  |

## form-skeleton

`components/ui/form-skeleton.tsx` · server-safe

- **`FormSkeleton`** — The loading version of a `<FormCard>`: label bars over 36px input bars, same card, same padding, so nothing moves when the real form arrives.

**FormSkeletonProps**

| Prop | Type | Notes |
|---|---|---|
| `rows?` | `(1 \| 2)[]` | One entry per row of fields: `1` is a full-width field, `2` is two side by side. Default: one, then two. |
| `title?` | `boolean` | Show a title bar (default) and the full-width submit button (default). |
| `submit?` | `boolean` |  |
| `className?` | `string` |  |

## fullscreen-modal

`components/ui/fullscreen-modal.tsx` · client component

- **`FullscreenModal`** — `.fs-modal` — the phone version of a longer modal task: 52px top bar with close, scrolling body, full-width action pinned below. Slides up.

**FullscreenModalProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `title` | `ReactNode` |  |
| `action?` | `ReactNode` | The one full-width action pinned at the bottom. |
| `onAction?` | `() => void` |  |
| `dismissible?` | `boolean` | Esc closes it by default; pass false for a flow that must be finished. |
| `container?` | `"viewport" \| "parent"` |  |
| `children` | `ReactNode` |  |
| `className?` | `string` |  |

## icon-button

`components/ui/icon-button.tsx` · server-safe

- **`IconButton`** — `.icon-btn` inside a `.badge-host` — a 36px quiet icon button with an optional count (or dot) badge.

**IconButtonProps** extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">

| Prop | Type | Notes |
|---|---|---|
| `icon` | `ReactNode` | The 17px line icon. |
| `aria-label` | `string` |  |
| `count?` | `number` | A number bubble on the top-right corner. Over `max` shows `99+`; 0 / undefined shows nothing. |
| `countTone?` | `"accent" \| "danger" \| "neutral"` | `danger` only for things that need action now (a cart with an expiring hold, failed payments). |
| `max?` | `number` |  |
| `dot?` | `boolean` | A small dot instead of a number — "something new". |
| `statusDot?` | `boolean` | The top-bar notification dot: 7px, danger red, inside the button's top-right corner with a surface ring. |

## icon-tile

`components/ui/icon-tile.tsx` · server-safe

- **`IconTile`** — `.ic-tile` — an icon on a soft tinted rounded tile. Pass the icon (an `<svg>`) as children.

**IconTileProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `tone?` | `IconTileTone` |  |
| `size?` | `keyof typeof sizeClasses` | 32 / 40 / 48px. `lg` is the one empty states use. |

## icons

`components/ui/icons.tsx` · server-safe

- **`ViewIcon`** — `.tbl-actions` "View details" button — line ~4483.
- **`EditIcon`** — `.tbl-actions` "Edit" button — line ~6822.
- **`MoreIcon`** — The "more" button's three solid dots — note `fill`, not `stroke`, per the guideline's literal markup.
- **`SortIcon`** — `th.sortable .sort-ic` — line ~4341.
- **`ChevIcon`** — `.select-trigger .chev` — line ~4354.
- **`PagerPrevIcon`** — Pager "Previous" arrow — line ~6828.
- **`PagerFirstIcon`** — Pager "First page" — the guideline has no double arrow; this is its Prev arrow (line ~6828) drawn twice, same stroke.
- **`PagerLastIcon`** — Pager "Last page" — the Next arrow (line ~6831) drawn twice, same stroke.
- **`PagerNextIcon`** — Pager "Next" arrow — line ~6831.
- **`CheckIcon`** — `checkSvg()` — the checkmark drawn inside a checked `.checkbox-box` / `.select-option.active` — line ~6509.
- **`SearchIcon`** — `.input-icon-wrap .input-leading-icon` — the search box's leading icon, line ~6088.
- **`FilterIcon`** — `.tbl-toolbar` "Filters" button's icon — line ~6092.
- **`CalendarIcon`** — `.date-trigger` leading calendar — line ~6127.
- **`XIcon`** — `X3` — the close glyph inside `.chip-x` — line ~7336.
- **`AlertCircleIcon`** — `.field-error` / `.field-hint` alert circle — line ~3330. Stroke-only, no round caps, exactly as drawn.
- **`EyeIcon`** — `.input-trail-btn` "show password" — line ~3300.
- **`EyeOffIcon`** — `.eye-off` — "hide password".
- **`MinusIcon`** — `.qty-step` decrease — stroke 2.5.
- **`PlusIcon`** — `.qty-step` increase — stroke 2.5.
- **`CheckThinIcon`** — `.field-ok` / `.input-trail-ic.ok` check — stroke 2.5 (the thicker 3 is for under-14px marks).
- **`FlagEthiopia`** — `.flag-et` — the Ethiopian flag the phone input shows next to +251 (the guideline's own SVG).
- **`UploadIcon`** — `.empty` drop-zone upload arrow.
- **`DocIcon`** — `.upl-thumb.doc` file glyph.
- **`CameraIcon`** — `.avatar-upl .cam` camera.
- **`PinIcon`** — `.loc-map .pin` — the solid map pin (fill, not stroke).
- **`LocateIcon`** — `.loc-btn` "Use my location" crosshair.
- **`MapPinIcon`** — `.input-leading-icon` map-pin outline (street / landmark field).
- **`ClockIcon`** — `.opt-ic` clock — "Recent" rows in the search panel.
- **`BuildingIcon`** — `.opt-ic` building — branch rows in the combobox.
- **`XCircleIcon`** — Toast "error" tile — circle with a cross (`tIcons.x`).
- **`WarnIcon`** — Toast "warning" tile — triangle with an exclamation (`tIcons.warn`).
- **`InfoIcon`** — Toast "info" tile — circle with an "i" (`tIcons.info`).
- **`UndoIcon`** — Toast "undo" tile — counter-clockwise arrow (`tIcons.undo`).
- **`DownloadIcon`** — Toast "export ready" tile — arrow into a tray (`tIcons.dl`).
- **`WifiOffIcon`** — Empty state "offline" — wifi with a strike (`empIc.wifioff`).
- **`LockIcon`** — Empty state "locked / no access" (`empIc.lock`).
- **`AlertIcon`** — Empty state "couldn't load" — circle with an exclamation (`empIc.alert`; the round-cap variant, unlike `AlertCircleIcon`).
- **`ImageIcon`** — Lazy-image placeholder glyph.
- **`PlusThinIcon`** — Plus glyph for primary actions ("New booking"); stroke 2.
- **`PauseIcon`** — Upload row "pause" — two bars, drawn to the guideline's icon rules (stroke 2.5 under 18px).
- **`PlayIcon`** — Upload row "resume" — a play triangle, same rules as `PauseIcon`.
- **`BellIcon`** — Notification bell for icon buttons with a count — `.badge-host` example.
- **`CartIcon`** — Cart for icon buttons with a count.
- **`StarIcon`** — Icon-badge glyph — "Top rated".
- **`BoltIcon`** — Icon-badge glyph — "Instant".
- **`ScheduleIcon`** — Icon-badge glyph — "Scheduled" (a clock face; not the same as the search panel's `ClockIcon`).
- **`DashboardIcon`** — Sidebar "Dashboard" — four tiles.
- **`CardIcon`** — Sidebar "Payments" — a card.
- **`SettingsIcon`** — Sidebar "Settings" — a gear. The guideline's own gear path is clipped (it stops mid-outline), so this is the complete outline it was drawn from; same stroke and size rules.
- **`MenuIcon`** — Top-bar menu toggle (mobile) — three bars.
- **`ChevRightIcon`** — Sidebar group "has a flyout" arrow (`sb-item-chev`), stroke 2.
- **`ChevUpDownIcon`** — Organization switcher's up-down chevron (`org-chev`).
- **`UserIcon`** — User menu "Profile".
- **`LogoutIcon`** — User menu "Log out".
- **`ShieldIcon`** — `.note` in the payment-processing modal ("Don't close this screen").
- **`ArrowLeftIcon`** — Detail view bar: back arrow, step up / step down, expand to full page, collapse (`.dv-bar`).
- **`ChevUpIcon`**
- **`MaximizeIcon`**
- **`MinimizeIcon`**
- **`SunIcon`** — Theme switch: sun and moon are the guideline's own (`.theme-toggle`); the "system" monitor is not in the guideline — a plain line icon in the same style.
- **`MoonIcon`**
- **`MonitorIcon`**

## info-card

`components/ui/info-card.tsx` · server-safe

- **`InfoCard`** — Info / summary card: header with status, key–value rows, dashed divider, one accent total, then two equal buttons.

**InfoCardProps** extends Omit<CardProps, "title">

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` | The reference under the title ("#BK-20931"). |
| `status?` | `ReactNode` | A status pill at the header's right. |
| `rows` | `SummaryRow[]` |  |
| `total?` | `SummaryRow` |  |
| `actions?` | `ReactNode` | Secondary then primary button, side by side at equal width. |

## input

`components/ui/input.tsx` · server-safe

- **`Input`** — `.text-input` — 36px, 6px radius, 1px input-border, accent focus ring, danger ring when `error`.
- **`InputAddon`** — `.input-addon` — the fixed text/flag chip at either end of an `<InputGroup>`.
- **`InputGroup`** — `.input-group` — one bordered box holding an addon, the bare input and a trailing slot. The border, focus ring and error/disabled states live on the group, so they wrap the whole thing.

**InputProps** extends InputHTMLAttributes<HTMLInputElement>

| Prop | Type | Notes |
|---|---|---|
| `error?` | `boolean` |  |

**InputAddonProps**

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` |  |
| `variant?` | `"prefix" \| "suffix" \| "plain"` | `suffix` puts the divider on the left (e.g. "ETB"); the default puts it on the right (e.g. "+251"). `plain` has no divider. |

**InputGroupProps** extends Omit<InputProps, "prefix">

| Prop | Type | Notes |
|---|---|---|
| `leading?` | `ReactNode` | `.input-addon` before the field (flag + "+251", a currency symbol…). |
| `suffix?` | `ReactNode` | `.input-addon.suffix` after the field ("ETB"). |
| `trailing?` | `ReactNode` | `.input-trail-btn` / `.input-trail-ic` — a button or status icon inside the right edge (show password, ✓). |
| `groupClassName?` | `string` | Classes for the group wrapper; `className` goes to the inner `<input>`. |

## kbd

`components/ui/kbd.tsx` · server-safe

- **`Kbd`** — `.kbd` — a keyboard hint ("⌘K", "/", "Esc"): mono 11px on a surface chip.

## kpi-card

`components/ui/kpi-card.tsx` · server-safe

- **`KpiCard`** — Stat card: label, big tabular number, trend (green up / red down / grey flat), optional icon tile and sparkline.

**KpiCardProps** extends Omit<CardProps, "title" \| "children">

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `value` | `ReactNode` |  |
| `unit?` | `ReactNode` | Small unit after the number ("ETB"). |
| `trend?` | `{ direction?: "up" \| "down"; value?: ReactNode; label: ReactNode }` | `up` is green, `down` red; omit `direction` for a flat grey trend ("No change"). |
| `icon?` | `ReactNode` | An icon (`<svg>`) shown on a small tile at top right. |
| `iconTone?` | `IconTileTone` |  |
| `spark?` | `number[]` | Sparkline points (any scale); drawn bottom-right at 84×30, never competing with the number. |
| `loading?` | `boolean` | Skeleton in the card's exact shape. |

## lazy-image

`components/ui/lazy-image.tsx` · client component

- **`LazyImage`** — `.ld-img` — an image that shows a shimmering placeholder (with a faint picture glyph) until it has loaded, so nothing shifts.

## lightbox

`components/ui/lightbox.tsx` · client component

- **`Lightbox`** — Image / document preview on the dark backdrop: title and actions on top, the media, caption and dots below. Arrow keys move between items.

**LightboxItem**

| Prop | Type | Notes |
|---|---|---|
| `src?` | `string` | Image URL; omit for the gradient placeholder (documents, missing media). |
| `alt?` | `string` |  |
| `caption?` | `ReactNode` |  |
| `kind?` | `"image" \| "document"` | `document` draws the paper-page placeholder instead of an image. |

**LightboxProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `title` | `ReactNode` |  |
| `meta?` | `ReactNode` | The muted line beside the title ("3 of 5"). |
| `items` | `LightboxItem[]` |  |
| `index?` | `number` | Starting slide. |
| `onDownload?` | `(item: LightboxItem, index: number) => void` |  |
| `container?` | `"viewport" \| "parent"` |  |

## list-card

`components/ui/list-card.tsx` · server-safe

- **`ListCard`** — Header plus divided rows: leading tile, name and meta, trailing amount and status. Rows tint on hover; the header has no divider.

**ListCardRow**

| Prop | Type | Notes |
|---|---|---|
| `leading?` | `ReactNode` | 36px avatar, a payment logo or a small icon tile. |
| `name` | `ReactNode` |  |
| `meta?` | `ReactNode` |  |
| `amount?` | `ReactNode` | Tabular figure on the right. |
| `negative?` | `boolean` | Refunds and reversals: the amount goes soft grey. |
| `status?` | `ReactNode` | A status pill on the far right. |

**ListCardProps** extends Omit<CardProps, "title">

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `action?` | `ReactNode` | A `CardLink` or icon button at the header's right. |
| `rows` | `ListCardRow[]` |  |
| `footer?` | `ReactNode` | Centered link under the rows ("Load more"). |
| `loading?` | `boolean` |  |
| `loadingRows?` | `number` | How many skeleton rows to show while loading. Default 3. |

## load-more

`components/ui/load-more.tsx` · server-safe

- **`LoadMore`** — `.ld-more` — the "Loading more…" row under a list or table: a small spinner and one line, never a full-screen spinner over content that is already there.

**LoadMoreProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `children?` | `ReactNode` |  |
| `bordered?` | `boolean` | Draw the top rule (default). Turn off inside a card that already has one. |

## loadable

`components/ui/loadable.tsx` · client component

- **`Loadable`** — Applies the loading timeline to a region: nothing for 300ms, then `skeleton`, then "Still loading…", then Retry / Cancel. When `loading` ends the content fades in over 300ms. Loading never blocks the whole app for one widget.

**LoadingTimings**

| Prop | Type | Notes |
|---|---|---|
| `skeletonAfter?` | `number` | Show nothing for this long (default 300ms) so quick loads never flash. |
| `slowAfter?` | `number` | After this, add a "Still loading…" message (default 3000ms). |
| `stuckAfter?` | `number` | After this, offer Retry or Cancel (default 10000ms). |
| `restartKey?` | `unknown` | Change it to start a fresh load while `loading` stays true (a "Reload" pressed mid-load) — the timeline restarts from zero. |

**LoadableProps** extends LoadingTimings

| Prop | Type | Notes |
|---|---|---|
| `loading` | `boolean` |  |
| `skeleton` | `ReactNode` | The skeleton to show while loading — same layout as the content, so nothing shifts when it arrives. |
| `children` | `ReactNode` |  |
| `onRetry?` | `() => void` | After 10s: a Retry button. |
| `onCancel?` | `() => void` | After 10s: a Cancel button. |
| `slowMessage?` | `ReactNode` | After 3s: the centered message (`.ld-center`) — a bold line and a muted one under it. |
| `slowHint?` | `ReactNode` |  |
| `stuckMessage?` | `ReactNode` | After 10s. |
| `stuckHint?` | `ReactNode` |  |
| `className?` | `string` |  |

## location-map-leaflet

`components/ui/location-map-leaflet.tsx` · client component

- **`LeafletMap`** — A real map for `<LocationPicker renderMap>`, or for showing where something is — Leaflet with the guideline's pin. It fills its parent (give the parent a size and `relative`); the wheel scrolls the page and the +/- buttons zoom. This is the only file that needs `leaflet` (`npm i leaflet`); leave it out and nothing else depends on it. Dark mode inverts the tiles (see tokens.css).

**LeafletMapProps**

| Prop | Type | Notes |
|---|---|---|
| `lat` | `number` |  |
| `lng` | `number` |  |
| `onPick?` | `(lat: number, lng: number) => void` | Called when the user clicks the map. Omit it for a read-only map (showing where a venue is). |
| `zoom?` | `number` |  |
| `tileUrl?` | `string` | Tile server. Default is OpenStreetMap's public one — fine for demos; use your own provider (and its attribution) in production. |
| `attribution?` | `string` |  |
| `pin?` | `boolean` | Draw the pin at `lat`/`lng` (default true). Off for a map that only shows an area. |
| `label?` | `string` | Accessible name of the map region. |
| `className?` | `string` |  |

## location-picker

`components/ui/location-picker.tsx` · client component

- **`LocationPicker`** — `.loc` — a map pin plus the address fields Ethiopia actually uses: city, sub-city, woreda and a street or landmark. Clicking the map moves the pin; "Use my location" drops it and fills the fields.

**MapFeature**

| Prop | Type | Notes |
|---|---|---|
| `kind` | `"road" \| "park" \| "label"` |  |
| `left` | `number` | Position on the map in percent; a number is a percentage, a string ("14px") is used as written (road thickness). |
| `top` | `number` |  |
| `width?` | `number \| string` |  |
| `height?` | `number \| string` |  |
| `rotate?` | `number` | Degrees (roads). |
| `text?` | `string` | Text (labels, and the park's caption). |

**LocationValue**

| Prop | Type | Notes |
|---|---|---|
| `lat` | `number` | Pin position, in degrees. |
| `lng` | `number` |  |
| `street` | `string` |  |
| `city` | `string` |  |
| `subcity` | `string` |  |
| `woreda` | `string` |  |
| `house` | `string` |  |
| `status?` | `"idle" \| "pinned" \| "located"` | What the status pill says: "Drag or tap to pin" → "Pinned" → "Located ± 12 m". |

**LocationPickerProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `LocationValue` |  |
| `onValueChange` | `(value: LocationValue) => void` |  |
| `cities` | `{ label: string; value: string }[]` |  |
| `features?` | `MapFeature[]` | The map backdrop (roads, parks, labels). The guideline draws a simple diagram; swap in a real map by replacing this component's map area. |
| `onLocate?` | `() => Promise<Partial<LocationValue> & { lat: number; lng: number }>` | "Use my location": resolves to the pin position and the address fields to fill. Omit to hide the button. |
| `mapBounds?` | `{ lat: number; lng: number; spanLat: number; spanLng: number }` | What the guideline's diagram map covers: lat/lng of its top-left corner and the span it shows. Ignored with `renderMap`. |
| `renderMap?` | `(api: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) => ReactNode` | Swap the diagram for a real map: render it filling the box (`<LeafletMap>` from location-map-leaflet.tsx is the ready-made one). |
| `className?` | `string` |  |

## logo

`components/ui/logo.tsx` · server-safe

- **`Logo`** — Cheche logo / app icon, with the guideline's minimum size and clear space enforced.

**LogoProps** extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" \| "width" \| "height">

| Prop | Type | Notes |
|---|---|---|
| `variant?` | `LogoVariant` |  |
| `width?` | `number` | Rendered width in px. Never goes below the guideline's minimum (icon 24px / logo 100px). |
| `assetBase?` | `string` | Folder the brand files are served from. Default `/brand`. |
| `allowBelowMin?` | `boolean` | Skip the minimum-size clamp. Only for the sidebar header, where the guideline sets the wordmark 16px tall (below the 100px minimum). |
| `clearSpace?` | `boolean` | Reserve the guideline's clear space (1x the "C" height) on every side — nothing else may enter that zone. |

## modal

`components/ui/modal.tsx` · client component

- **`Overlay`** — The backdrop and the behavior every overlay shares: 60% near-black with a 2px blur (the command palette's), Escape and backdrop dismissal, focus moved inside and trapped, focus returned to the trigger on close, page scroll locked.
- **`Modal`** — `.mdl` — the one dialog shell: surface, 1px border, 16px radius, deep shadow, 400 / 560 / 760px wide, a header, a body that scrolls while header and footer stay fixed, and a footer with secondary then primary on the right. Modals only confirm, alert, pick or preview — never show, create or edit a record.
- **`ModalHeader`** — `.mdl-head` — 16/600 title, optional sub, the command palette's close button at top right. Not used by centered dialogs.
- **`ModalBody`** — `.mdl-body` — 13.5px / soft / 1.55, scrolls when long.
- **`ModalTitle`** — `.mdl-title` for centered dialogs (the title lives in the body there).
- **`ModalFooter`** — `.mdl-foot` — right-aligned, secondary first and primary last. Centered dialogs center it and drop the divider.
- **`ModalSteps`** — `.mdl-steps` — numbered circles joined by lines: accent while active, success once done. Sits under the header of a multi-step modal.

**OverlayProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `children` | `ReactNode` |  |
| `dismissible?` | `boolean` | Escape and a backdrop click close it. Alerts pass `false`: the user must acknowledge. Default true. |
| `container?` | `"viewport" \| "parent"` | `viewport` (default) portals to `<body>` and locks page scroll; `parent` fills the nearest positioned ancestor (a demo stage, a phone frame). |
| `dark?` | `boolean` | The darker 88% backdrop with a 4px blur, for image and document previews. |
| `placement?` | `"center" \| "bottom" \| "right"` | How the content sits: centered (modals), bottom (sheets) or right (drawers). |
| `className?` | `string` |  |

**ModalProps** extends Omit<OverlayProps, "placement" \| "className" \| "dark">

| Prop | Type | Notes |
|---|---|---|
| `size?` | `"sm" \| "md" \| "lg"` | 400 / 560 / 760px. |
| `centered?` | `boolean` | The centered layout for confirmations and alerts: tile on top, centered text, no divider above the footer. |
| `role?` | `"dialog" \| "alertdialog"` | `alertdialog` for blocking notices. |
| `aria-label?` | `string` | Accessible name when there is no `<ModalTitle>` wired up. |
| `className?` | `string` |  |

**ModalHeaderProps**

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` | `.mdl-sub` — 12.5px muted line under the title. |
| `leading?` | `ReactNode` | A logo or icon tile before the title (the payment dialog's method logo). |
| `onClose?` | `() => void` | An icon tile alone, no title — the destructive dialog's header (`plain`). |
| `plain?` | `boolean` | No divider and no bottom padding: the title-less red-tile header. |
| `trailing?` | `ReactNode` | Something on the right instead of the close button. |
| `className?` | `string` |  |

**ModalFooterProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `left?` | `ReactNode` | `.foot-left` — helper text on the left ("Step 2 of 3"). |

**ModalStepsProps**

| Prop | Type | Notes |
|---|---|---|
| `steps` | `string[]` |  |
| `current` | `number` | 1-based current step. Earlier steps show a check, later ones their number. |
| `className?` | `string` |  |

## multi-select

`components/ui/multi-select.tsx` · client component

- **`MultiSelect`** — `.ms` — multi-select. The trigger holds one removable chip per selected value (`.ms-trigger .pill.chip`), the panel lists checkbox options (`.ms-panel`) and ends with a "N selected · Clear" footer (`.ms-foot`).

**MultiSelectOption**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` |  |
| `value` | `string` |  |

**MultiSelectProps**

| Prop | Type | Notes |
|---|---|---|
| `options` | `MultiSelectOption[]` |  |
| `value` | `string[]` |  |
| `onValueChange` | `(value: string[]) => void` |  |
| `placeholder?` | `string` | Shown in the trigger while nothing is selected. |
| `id?` | `string` |  |
| `className?` | `string` |  |

## note

`components/ui/note.tsx` · server-safe

- **`Note`** — `.note` — a quiet aside: surface-2 box, 1px border, 12.5px soft text (the "Don't close this screen" line).

**NoteProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `icon?` | `ReactNode` | A 16px icon before the text. |

## number-stepper

`components/ui/number-stepper.tsx` · client component

- **`NumberStepper`** — `.qty-step` — minus, value, plus in one bordered box. Buttons disable (35% opacity) at `min` / `max`.

**NumberStepperProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `number` |  |
| `onValueChange` | `(value: number) => void` |  |
| `min?` | `number` |  |
| `max?` | `number` |  |
| `step?` | `number` |  |
| `size?` | `"default" \| "lg"` | `lg` is the 36px touch size (seats, passengers). Default is the 30px size used in tables and carts. |
| `block?` | `boolean` | Fill the container (mobile): the value cell stretches between the two buttons. |
| `aria-label?` | `string` | Accessible name for the group (the visible label usually sits above, in a `<Field>`). |
| `className?` | `string` |  |

## offline-bar

`components/ui/offline-bar.tsx` · server-safe

- **`OfflineBar`** — `.emp-off` — the amber bar over cached data while offline ("You're offline · showing data from 10 minutes ago"). Preferred over an empty state whenever something is cached.

## option-list

`components/ui/option-list.tsx` · client component

- **`Highlight`** — Wraps the matched part of `text` in the guideline's accent `<mark>`.
- **`OptionGroupLabel`** — `.select-group` — the small uppercase label above a group of options.
- **`OptionRow`** — `.select-option` with `.opt-wrap` — one row of a combobox / search panel.
- **`OptionEmpty`** — `.cmdk-empty` — "No branches match".

**OptionRowProps**

| Prop | Type | Notes |
|---|---|---|
| `leading?` | `ReactNode` | Leading visual: an avatar, pay logo or a 14px `.opt-ic` icon. |
| `label` | `ReactNode` |  |
| `sub?` | `ReactNode` | `.opt-sub` — the muted 11.5px sub-line text beside the label. |
| `right?` | `ReactNode` | `.opt-right` — a pill or status at the far right. |
| `active?` | `boolean` |  |
| `check?` | `boolean` | Show the accent check when `active` (single-select combobox). Search rows don't. |
| `onSelect` | `() => void` |  |

## otp-input

`components/ui/otp-input.tsx` · client component

- **`OtpInput`** — `.otp-row` — one box per digit. Typing advances to the next box, Backspace on an empty box steps back, and pasting a code fills every box. Digits only; a box turns accent once filled.
- **`OtpResend`** — `.otp-meta` / `.field-hint` resend line — "Didn't get it? Resend in 00:30", then an accent "Resend code" link.

**OtpInputProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | The digits entered so far (a string of at most `length` digits). |
| `onValueChange` | `(value: string) => void` |  |
| `onComplete?` | `(value: string) => void` | Called once all `length` digits are in. |
| `length?` | `number` |  |
| `status?` | `"default" \| "ok" \| "error"` | `ok` / `error` colour the boxes success / danger (a verified or wrong code). |
| `size?` | `"default" \| "sm"` | `sm` — 36x42 boxes (wallet PIN). Default is the 42x48 code box. |
| `start?` | `boolean` | Left-align the row (`.otp-row.start`, for forms) instead of centering it (modals). |
| `mask?` | `boolean` | Hide the digits — the wallet PIN. |
| `autoFocus?` | `boolean` |  |
| `aria-label?` | `string` | Prefix for the per-box accessible names ("Digit 1 of 6"). |
| `className?` | `string` |  |

**OtpResendProps**

| Prop | Type | Notes |
|---|---|---|
| `variant?` | `"field" \| "modal"` | `field` (default) is the 11.5px `.field-hint` under an OTP in a form; `modal` is the centered 12.5px `.otp-meta` of the payment modal. |
| `seconds?` | `number` | Seconds before "Resend code" unlocks. Default 30. |
| `onResend` | `() => void` |  |
| `className?` | `string` |  |

## password-input

`components/ui/password-input.tsx` · client component

- **`PasswordInput`** — `.input-group` with a show/hide eye in the trailing slot; optionally the sign-up strength meter + requirement pills.

**PasswordInputProps** extends Omit<InputGroupProps, "type" \| "leading" \| "suffix" \| "trailing" \| "value" \| "onChange">

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `strengthMeter?` | `boolean` | Sign-up: show the strength meter (on the `.stock-bar` track) and the requirement pills that turn green as they're met. |
| `trailingExtra?` | `ReactNode` | Extra trailing node shown before the eye (e.g. a status icon for a mismatched confirm field). |

## pay-logo

`components/ui/pay-logo.tsx` · server-safe

- **`PayLogo`** — `.pay-logo` — the payment-method monogram tile (Telebirr green, CBE purple, Wallet accent gradient).

**PayLogoProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `method` | `PayLogoMethod` |  |
| `size?` | `PayLogoSize` | px — 40 default, 32 in toasts, 24 in option rows, 18 in chips and segmented items. |

## payment-dialog

`components/ui/payment-dialog.tsx` · client component

- **`PaymentOtpDialog`** — The "Confirm with Telebirr" modal: method logo, amount summary, six-digit code, resend countdown. Pay stays disabled until the code is complete.
- **`PaymentProcessingDialog`** — While a payment is pending on the phone: the step list, the instruction and — after 30s — a "taking longer" fallback with Keep waiting / Notify me.

**PaymentOtpDialogProps** extends PaymentBase

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` | "Code sent to +251 9•• ••• 412". |
| `amount` | `ReactNode` | "2,550 ETB". |
| `payee` | `ReactNode` | "Soreti Spa · Hair Cut". |
| `length?` | `number` |  |
| `onPay` | `(code: string) => void` | Called with the full code when the user presses Pay. |
| `onResend` | `() => void` |  |
| `loading?` | `boolean` |  |
| `error?` | `ReactNode` | The failure of the last attempt ("Wrong code. 2 attempts left."). |
| `payLabel?` | `ReactNode` |  |

**PaymentProcessingDialogProps** extends PaymentBase

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `steps` | `StepItem[]` |  |
| `hint?` | `ReactNode` | Instruction under the steps. |
| `fallbackAfter?` | `number` | Seconds before the "still waiting" block replaces the hint. Default 30. |
| `onCancel` | `() => void` |  |
| `onNotify?` | `() => void` |  |

## phone-input

`components/ui/phone-input.tsx` · client component

- **`PhoneInput`** — Fixed `+251` prefix with the flag, digits grouped 3-3-3 as you type, numeric keyboard on mobile. A green check appears in the trailing slot once the number is valid (no toast).

**PhoneInputProps** extends Omit<InputGroupProps, "type" \| "leading" \| "suffix" \| "trailing" \| "value" \| "onChange">

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | The formatted value, as returned by `onValueChange`. |
| `onValueChange` | `(value: string) => void` |  |

## pill

`components/ui/pill.tsx` · server-safe

- **`Pill`** — Matches the guideline's `.pill` — see #comp-badges. Two words max; read-only (the interactive pill is `<Chip>`). Icons passed as children are drawn at stroke 2.5 in the pill's colour.

**PillProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `tone?` | `PillTone` | success (done, valid, paid) · warning (waiting, due soon, low) · danger (failed, expired, cancelled) · neutral (finished, inactive, archived) · info / accent (in progress, new, highlighted). |
| `size?` | `PillSize` |  |
| `variant?` | `PillVariant` | `tinted` (default) is a 14% wash; `outline` for dense tables and on tinted surfaces; `solid` once per screen for the single most important state. |
| `dot?` | `boolean` | Leading currentColor dot — live status that changes over time. Plain pills are for fixed labels (a role, a category). |
| `solid?` | `boolean` | Shorthand for `variant="solid"`. |

## profile-card

`components/ui/profile-card.tsx` · server-safe

- **`ProfileCard`** — Users, drivers, merchants, organizations: 48px avatar, name and role pill, contact rows, two equal footer buttons.

**ProfileCardRow**

| Prop | Type | Notes |
|---|---|---|
| `icon` | `ReactNode` | A 14px line icon. |
| `text` | `ReactNode` |  |

**ProfileCardProps** extends Omit<CardProps, "title" \| "role">

| Prop | Type | Notes |
|---|---|---|
| `initials?` | `string` | Initials for a person; or pass `avatar` for a custom tile (an organization's icon). |
| `avatar?` | `ReactNode` |  |
| `name` | `ReactNode` |  |
| `role?` | `ReactNode` | The role or kind, followed by an optional pill. |
| `pill?` | `ReactNode` |  |
| `rows?` | `ProfileCardRow[]` |  |
| `actions?` | `ReactNode` | Two buttons, equal width. |
| `loading?` | `boolean` |  |

## progress-bar

`components/ui/progress-bar.tsx` · server-safe

- **`ProgressBar`** — `.stock-bar` — a thin full-radius track on `border` with a filled bar; width and color animate.

**ProgressBarProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `value` | `number` | 0–100. |
| `tone?` | `ProgressTone` |  |
| `height?` | `4 \| 5 \| 6` | Track height in px — 5 by default (`.stock-bar`), 4 for the password meter. |
| `indeterminate?` | `boolean` | Total unknown: a bar slides back and forth instead of filling. Under reduced motion it becomes a faint full bar. |

## progress-field

`components/ui/progress-field.tsx` · server-safe

- **`ProgressField`** — `.prog` — label on the left, percent on the right, a 6px accent bar, an optional hint line. Determinate when you know the total (uploads, exports, steps); indeterminate when you don't. Always a label and a percent or count.
- **`TopProgress`** — `.topline` — the 3px accent line along the top edge of the app for route changes in admin apps. Place it in a `relative` shell.

**ProgressFieldProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `value?` | `number` | 0–100 for a determinate bar. Omit it for the indeterminate sliding bar (total unknown) with a spinner on the right. |
| `tone?` | `Extract<ProgressTone, "accent" \| "success" \| "danger">` | `success` once done, `danger` when it failed. |
| `hint?` | `ReactNode` | The muted line under the bar ("794 of 1,240 rows · ~12s left"). |

**TopProgressProps**

| Prop | Type | Notes |
|---|---|---|
| `state` | `"idle" \| "run" \| "done"` | `run` crawls toward 92% while a route loads; `done` snaps to 100% and fades. `idle` renders nothing. |
| `className?` | `string` |  |

## pull-to-refresh

`components/ui/pull-to-refresh.tsx` · client component

- **`PullToRefresh`** — Mobile lists: pulling down at the top of the scroll area shows the small spinner strip above the first row (`.ptr`) and refreshes on release. Touch only — on desktop it renders its children untouched.

**PullToRefreshProps**

| Prop | Type | Notes |
|---|---|---|
| `onRefresh` | `() => Promise<unknown> \| void` | Resolve when the refresh finishes; the strip stays until then. |
| `children` | `ReactNode` |  |
| `threshold?` | `number` | How far (px) to pull before releasing refreshes. Default 64. |
| `className?` | `string` |  |

## radio-group

`components/ui/radio-group.tsx` · client component

- **`RadioGroup`** — `.radio-group` — a column of `<RadioItem>`s, 10px apart. Arrow keys move the selection; only the selected item is in the tab order.
- **`RadioItem`** — `.radio-row` — 18px dot (1.5px input-border; accent border + 9px accent centre when selected) and its `.control-label`.

**RadioGroupProps** extends Omit<HTMLAttributes<HTMLDivElement>, "onChange">

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `aria-label?` | `string` | Accessible name for the group when there's no visible label wired with `aria-labelledby`. |

**RadioItemProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `label` | `ReactNode` |  |
| `disabled?` | `boolean` |  |
| `className?` | `string` |  |

## record-form

`components/ui/record-form.tsx` · client component

- **`RecordForm`** — `.dv-form` — the full-page create / edit form: breadcrumb bar, section list on the left, one 600px column, footer pinned with the change state, Cancel and the primary action. Validates on blur and on submit, with a summary that links to each field; leaving with changes asks "Discard changes?".

**RecordFormField**

| Prop | Type | Notes |
|---|---|---|
| `name` | `string` |  |
| `label` | `string` |  |
| `type?` | `"text" \| "email" \| "tel" \| "select" \| "segmented" \| "textarea"` |  |
| `required?` | `boolean` |  |
| `full?` | `boolean` | Spans both columns; fields are paired only when they belong together. |
| `placeholder?` | `string` |  |
| `hint?` | `ReactNode` |  |
| `requiredMessage?` | `string` | Shown when a required field is empty. Default "Enter the {label}." |
| `options?` | `{ label: string; value: string }[]` |  |
| `validate?` | `(value: string, all: Record<string, string>) => string \| undefined` | Return a message to block submit. Required, email and phone formats are checked for you. |

**RecordFormSection**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `title` | `string` |  |
| `hint?` | `string` |  |
| `fields` | `RecordFormField[]` |  |

**RecordFormProps**

| Prop | Type | Notes |
|---|---|---|
| `mode` | `"create" \| "edit"` | Create and edit are the same page: only the title, breadcrumb and button label change, and edit arrives filled in. |
| `noun` | `string` | What is being made, lower-case ("customer"). Drives "New customer" / "Create customer". |
| `backLabel` | `string` | Where the form was opened from, for the breadcrumb ("Customers", or the record's name on edit). |
| `recordName?` | `string` | The record's name, for "Edit Sara Bekele". |
| `sections` | `RecordFormSection[]` |  |
| `initialValues?` | `Record<string, string>` |  |
| `onSubmit` | `(values: Record<string, string>) => void \| Promise<unknown>` | Called with the values once they validate. May return a Promise (an API save): the primary button shows "Creating…" / "Saving…" and both buttons lock until it settles; a rejection keeps the form open and shows the error's message in the banner. |
| `onCancel` | `() => void` |  |
| `container?` | `"viewport" \| "parent"` | Where the discard confirmation is drawn: the viewport (default) or the nearest positioned ancestor. |
| `className?` | `string` |  |

## record-view

`components/ui/record-view.tsx` · client component

- **`RecordIdentity`** — `.dv-id` — avatar, name + status, meta, actions. Always first and never moves between panel and page.
- **`RecordStats`** — `.dv-stats` — the few numbers the list already has. 2×2 in a narrow panel, four across on a page.
- **`RecordHeading`** — `.dv-h` — 12/700 block heading inside the body.
- **`RecordKv`** — `.dv-kv` — label over value pairs, two columns (one in the rail or when narrow).
- **`RecordRows`** — `.dv-rows` — bordered list of the record's transactions, documents or activity.
- **`RecordBody`** — `.dv-body` — the page's two-column body: main on the left, a 250px rail on the right (stacked when narrow). Panels use `light`: one column, less padding.
- **`RecordRailCard`** — A side-rail card: 14px padding, no resting shadow.
- **`RecordSkeleton`** — The record page while its own data loads: identity, stats, tabs and body in the same shapes.

**RecordAction**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `onClick?` | `() => void` |  |

**RecordMenuItem**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `onClick?` | `() => void` |  |
| `destructive?` | `boolean` | Red, always last, below a divider — archive / delete / block. Opens a confirm modal; never acts directly. |

**RecordIdentityProps**

| Prop | Type | Notes |
|---|---|---|
| `avatar` | `ReactNode` | `<Avatar size={48}>` or an icon tile. |
| `name` | `ReactNode` |  |
| `status?` | `ReactNode` | A status pill beside the name. |
| `meta?` | `ReactNode` | Mono ID, kind, since-date — one muted line. |
| `primary?` | `RecordAction` | One primary, one secondary, everything else in the ⋯ menu. |
| `secondary?` | `RecordAction` |  |
| `menu?` | `RecordMenuItem[]` |  |

**RecordStat**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `value` | `ReactNode` |  |
| `unit?` | `ReactNode` |  |

**RecordRowItem**

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `meta?` | `ReactNode` |  |
| `amount?` | `ReactNode` | Right-aligned figure; `positive` turns it success green. |
| `positive?` | `boolean` |  |
| `trailing?` | `ReactNode` |  |

## record-workspace

`components/ui/record-workspace.tsx` · client component

- **`RecordWorkspace`** — The guideline's Detail view: click a row to peek (a 520px panel, no navigation, ↑ ↓ to step, Esc to close); ⤢ opens the full page with tabs and a side rail; create and edit open the same full-page form, and leaving a dirty form asks first. All four states live here so a developer only supplies the list and the record's content.

**WorkspaceApi** <T>

| Prop | Type | Notes |
|---|---|---|
| `open` | `(record: T, opts?: { page?: boolean; tab?: string }) => void` | Peek a record in the panel, or its full page with `{ page: true }` — on a given tab with `{ page: true, tab }`. |
| `edit` | `(record: T) => void` |  |
| `create` | `() => void` |  |
| `confirm` | `(opts: { title: string; description: string; confirmLabel: string; onConfirm: () => void }) => void` | Ask for confirmation before a destructive action; nothing happens until the user confirms. |

**RecordWorkspaceProps** <T>

| Prop | Type | Notes |
|---|---|---|
| `records` | `T[]` |  |
| `getId` | `(record: T) => string \| number` |  |
| `noun` | `string` | Singular, lower-case ("customer"). |
| `listLabel` | `string` | The list's name, used in the breadcrumb ("Customers"). |
| `list` | `(list: { onRowClick: (record: T, e: { ctrlKey: boolean; metaKey: boolean }) => void activeRowId?: string \| number highli` | The list. Wire the three callbacks onto your `<Table>`: click / Enter opens the panel, Ctrl/Cmd + click the page. |
| `onVisibleRowsChange` | `(rows: T[]) => void` | Pass to `<Table onVisibleRowsChange>` so ↑ ↓ step through the rows as the table currently shows them (searched, filtered, sorted). |
| `identity` | `(record: T, api: WorkspaceApi<T>) => RecordIdentityProps` | Identity block shared by the panel and the page. `edit()` opens the form for this record. |
| `stats` | `(record: T) => RecordStat[]` |  |
| `panel` | `(record: T) => ReactNode` | The panel's body: only what the list already knows. |
| `page` | `{ tabs: { id: string; label: string; count?: (record: T) => number \| undefined }[]` | The full page: tabs with real data (loaded with a skeleton), and the side rail. |
| `content` | `(record: T, tab: string) => ReactNode` |  |
| `rail?` | `(record: T) => ReactNode` |  |
| `loadingMs?` | `number` | How long the page shows its skeleton while its own data loads. Default 600ms. |
| `form` | `{ sections: RecordFormSection[] /** Different sections for edit (create may provision an account, edit changes its role)` |  |
| `onSave` | `(values: Record<string, string>, existing: T \| undefined) => T \| Promise<T>` | Persist and return the saved record — or a Promise of it for an API save, during which the form shows "Saving…". Create returns the new record; it appears on the list and flashes. A rejected Promise keeps the form open with the error. |
| `createdMessage?` | `string` | Toast titles: "Customer created" / "Changes saved" by default. |
| `savedMessage?` | `string` |  |
| `location?` | `RecordLocation` | Make the page, create and edit states real routes. Pass the location your router currently has (`parseRecordPath(base, pathname)`) and push the one you're handed back in `onLocationChange` (`recordPath(base, loc)`). Omit both and the workspace keeps its state locally. |
| `onLocationChange?` | `(location: RecordLocation) => void` |  |
| `className?` | `string` | Height of the stage. Default 580px; use `h-full` to fill a flex content area. |
| `fit?` | `boolean` | Let the list card be as tall as its rows, so the pager sits right under the last row and the table's Filters panel can hang below a short list. While a record peeks in the panel the card is at least 680px so the record has room; the page and the forms keep the normal height (`className`, or 580px). |
| `inlineToasts?` | `boolean` | The toasts drawn inside the stage. Default on; pass `false` when the app has a root `<Toaster />`, or every toast appears twice. |

## scroll-area

`components/ui/scroll-area.tsx` · server-safe

- **`ScrollArea`** — The guideline's scrollbar (#scrollbars) on any scrollable region: a 10px gutter, a 4px rounded thumb in `border-strong` that grows to 6px and darkens on hover and turns accent while dragged, a transparent track, no arrows or corner. Chrome / Edge / Safari get the full style; Firefox gets `scrollbar-width: thin` with the same colors and no hover growth. `styles/tokens.css` applies the same style to every scrollbar on the page, so this is only needed to keep it when you scope or reset global scrollbar styles — and it is what the components (`<Table>`, `<MultiSelect>`) scroll with.

**ScrollAreaProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `direction?` | `"x" \| "y" \| "both"` | Which axis scrolls. Default `"y"` — give it a height (`max-h-*`) to have something to scroll. |

## search-input

`components/ui/search-input.tsx` · client component

- **`SearchInput`** — `.srch` — the leading-icon input with a clear button, a spinner while results load, a keyboard hint on desktop, and a suggestions panel split into Recent and Results with the match in accent.

**SearchItem**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `label` | `string` |  |
| `sub?` | `ReactNode` | Muted text beside the label ("Customer", "+251 912 ••• 781"). |
| `avatar?` | `ReactNode` |  |
| `right?` | `ReactNode` | A pill at the far right. |

**SearchInputProps**

| Prop | Type | Notes |
|---|---|---|
| `items` | `SearchItem[]` | Everything searchable. Matches are found on `label`, client-side. |
| `recent?` | `SearchItem[]` | Shown under "Recent" while the field is empty and focused. |
| `onSelect` | `(item: SearchItem) => void` |  |
| `placeholder?` | `string` |  |
| `shortcut?` | `string \| false` | Keyboard hint shown while the field is empty on desktop; pressing the key focuses the field. `false` hides it. |
| `debounceMs?` | `number` | Debounce before results appear (ms) and the minimum characters — the guideline's 300ms / 2. |
| `minChars?` | `number` |  |
| `emptyText?` | `string` |  |
| `className?` | `string` |  |

## segmented-control

`components/ui/segmented-control.tsx` · client component

- **`SegmentedControl`** — `.seg` — a 36px track on `surface-2` with one lifted active item. Arrow keys move the selection.

**SegmentedOption**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `label` | `ReactNode` |  |
| `icon?` | `ReactNode` |  |
| `count?` | `number` | `.count.inline.soft` after the label. |
| `disabled?` | `boolean` |  |

**SegmentedControlProps**

| Prop | Type | Notes |
|---|---|---|
| `options` | `SegmentedOption[]` |  |
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `tone?` | `"neutral" \| "accent"` | `accent` fills the active item pink instead of lifting it onto a white pill. |
| `size?` | `"md" \| "sm"` |  |
| `block?` | `boolean` | Stretch to the container; items share the width equally. |
| `aria-label?` | `string` |  |
| `className?` | `string` |  |

## select-card

`components/ui/select-card.tsx` · client component

- **`SelectCard`** — `.card.select-card` — a card that behaves like a radio or checkbox. Selected = accent border + 3px ring, like a focused input.

**SelectCardProps** extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" \| "value">

| Prop | Type | Notes |
|---|---|---|
| `title?` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `value?` | `ReactNode` | The figure on the right ("+150"); turns accent when selected. |
| `selected?` | `boolean` |  |
| `leading?` | `ReactNode` | A leading logo or tile. |
| `control?` | `"radio" \| "checkbox"` | `radio` (default) for single choice, `checkbox` for multi choice. |
| `plan?` | `{ name: ReactNode; price: ReactNode; unit?: ReactNode; features?: ReactNode[] }` | `plan` stacks vertically with a name, a big price and a feature list (the plan picker). |

## select

`components/ui/select.tsx` · client component

- **`Select`** — `.select-trigger` + `.select-panel` — single-select; the active option is tinted and checked. The panel is drawn over the page (portal), so an `overflow-hidden` or scrolling ancestor never clips it.

**SelectOption**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` |  |
| `value` | `string` |  |

**SelectProps**

| Prop | Type | Notes |
|---|---|---|
| `options` | `SelectOption[]` |  |
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `placeholder?` | `string` | Shown in the trigger while `value` matches no option. |
| `id?` | `string` |  |
| `disabled?` | `boolean` |  |
| `loading?` | `boolean` | Options are being fetched: the panel shows "Loading …" with a spinner instead of the list. |
| `loadingLabel?` | `string` |  |
| `emptyState?` | `ReactNode` | Shown in the panel when there are no options — usually an `<EmptyState size="sm">` with a text link ("No stylists at this branch · Add staff"). |
| `size?` | `"default" \| "sm"` | `sm` is the chart card's range filter: 32px tall, 12.5px, sized to its label, panel right-aligned. |
| `className?` | `string` |  |

## shell-skeleton

`components/ui/shell-skeleton.tsx` · client component

- **`ShellSkeleton`** — The admin app while it loads: the sidebar and top bar frame appear immediately (the sidebar fully usable), and only the main area is skeletoned — a row of stat cards and a list. Swap it for the real page when the data arrives.

**ShellSkeletonProps**

| Prop | Type | Notes |
|---|---|---|
| `sidebar` | `ReactNode` | The real `<Sidebar>` — admin apps never splash: navigation stays live while the page's data loads. |
| `stats?` | `number` | KPI-card skeletons in the first row. Default 3. |
| `rows?` | `number` | Rows in the list skeleton under it. Default 2. |
| `className?` | `string` |  |

## sidebar

`components/ui/sidebar.tsx` · client component

- **`Sidebar`** — `.app-sidebar` — a card with the brand, the nav items and a footer. A round toggle collapses it to 68px (icon-only); the right edge is a drag handle (180–320px, double-click resets, dragging under 120px collapses). Below 760px it is a slide-over drawer opened from the top bar.
- **`SidebarItem`** — `.sb-item` — icon + label row. Active = accent tint + 600. Collapsed, it shrinks to a centered 40px icon button (label kept as its accessible name).
- **`SidebarGroup`** — A top-level item with sub-items: hover (or focus) the row and they fly out to the right with a small arrow on the parent. In the mobile drawer the sub-items expand inline instead.

**SidebarProps**

| Prop | Type | Notes |
|---|---|---|
| `logo?` | `ReactNode` | The expanded header brand (default: the pink wordmark, 16px tall as the guideline sets it). |
| `logoMark?` | `ReactNode` | The collapsed header brand (default: the standalone "C" mark, 18px). |
| `footer?` | `ReactNode \| false` | The footer line. Default "Powered by Cheche"; `false` hides it. |
| `assetBase?` | `string` | Folder the default brand artwork is served from (see `Logo`). |
| `children` | `ReactNode` |  |
| `className?` | `string` |  |
| `aria-label?` | `string` |  |

**SidebarItemProps**

| Prop | Type | Notes |
|---|---|---|
| `icon?` | `ReactNode` |  |
| `children` | `ReactNode` |  |
| `active?` | `boolean` |  |
| `disabled?` | `boolean` |  |
| `href?` | `string` |  |
| `onClick?` | `() => void` |  |
| `count?` | `number` | A soft inline count after the label ("Payments 2"). |
| `className?` | `string` |  |

**SidebarGroupProps**

| Prop | Type | Notes |
|---|---|---|
| `icon?` | `ReactNode` |  |
| `label` | `string` |  |
| `active?` | `boolean` |  |
| `children` | `ReactNode` | The sub-items — `<SidebarItem>`s. Only two or more related items get a group; a single item stays a plain top-level link. |

## skeleton

`components/ui/skeleton.tsx` · server-safe

- **`Skeleton`** — `.skel` — the loading shimmer (1.4s). Same shape and size as the content it replaces, never a generic grey box. Under reduced motion it freezes.
- **`SkeletonStack`** — `.skel-stack` — a column of skeleton lines, 8px apart.

**SkeletonProps** extends HTMLAttributes<HTMLSpanElement>

| Prop | Type | Notes |
|---|---|---|
| `shape?` | `SkeletonShape` |  |
| `width?` | `number \| string` | Override the shape's width (a number is px). Lines usually take a percentage so rows look natural. |
| `height?` | `number \| string` |  |

## spinner

`components/ui/spinner.tsx` · server-safe

- **`Spinner`** — `.spinner` — a ring with a faint track and a spinning arc, 0.7s. Spinners are for actions and unknown waits; skeletons are for content. Under reduced motion it stops as a static ring.
- **`ButtonSpinner`** — `.btn-spinner` — the bordered circle with its right side transparent, spun at 0.7s; inside buttons (current text color) and toast tiles.

**SpinnerProps**

| Prop | Type | Notes |
|---|---|---|
| `size?` | `SpinnerSize` | 16 / 24 / 36px. |
| `tone?` | `SpinnerTone` | `accent` on surfaces, `soft` when it must not draw attention (a background refresh), `current` to inherit the text color. |
| `className?` | `string` |  |
| `label?` | `string` | Accessible name. Default "Loading". |

## splash-screen

`components/ui/splash-screen.tsx` · server-safe

- **`SplashScreen`** — The consumer-app launch screen: the icon mark on the brand gradient with a soft pulse and one line at the bottom. Admin products never splash — the shell appears immediately with the main area skeletoned.

**SplashScreenProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `footer?` | `ReactNode` | A single line at the bottom ("Getting your bookings ready…"). |
| `assetBase?` | `string` | Folder the brand files are served from (see `Logo`). |

## status-pill

`components/ui/status-pill.tsx` · server-safe

- **`StatusPill`** — A `<Pill>` whose colour and wording come from the status vocabulary, so nobody picks a colour ad hoc. Defaults to the dot form (statuses change over time). An unknown status renders as a neutral pill with the raw text.

**StatusPillProps** extends Omit<PillProps, "tone" \| "children">

| Prop | Type | Notes |
|---|---|---|
| `kind` | `StatusKind` |  |
| `status` | `string` | The record's status, in any casing ("confirmed", "Checked-in"). |

## step-list

`components/ui/step-list.tsx` · server-safe

- **`StepList`** — `.prog-steps` — the vertical checklist of a multi-stage wait (sent → approved → confirmed).

**StepItem**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `status` | `StepStatus` |  |

## step-modal

`components/ui/step-modal.tsx` · client component

- **`StepModal`** — A short wizard in one modal: stepper under the header, one pane at a time, "Step n of N" with Back and Next / Finish in the footer.

**StepModalStep**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` |  |
| `content` | `ReactNode` |  |

**StepModalProps**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` |  |
| `onOpenChange` | `(open: boolean) => void` |  |
| `title` | `ReactNode` |  |
| `subtitle?` | `ReactNode` |  |
| `steps` | `StepModalStep[]` |  |
| `canAdvance?` | `(step: number) => boolean` | Return false to keep the user on a step (validation). Receives the 1-based step. |
| `onFinish` | `() => void` |  |
| `container?` | `"viewport" \| "parent"` |  |

## summary-card

`components/ui/summary-card.tsx` · server-safe

- **`SummaryCard`** — `.summary-card` rows — label left, value right (tabular), and a dashed-rule total. Add a surrounding card from the Cards set for a bordered box.

**SummaryRow**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `value` | `ReactNode` |  |

**SummaryCardProps** extends HTMLAttributes<HTMLDivElement>

| Prop | Type | Notes |
|---|---|---|
| `rows` | `SummaryRow[]` |  |
| `total?` | `SummaryRow` | The bottom line (dashed rule above it): label + big accent amount. |

## switch

`components/ui/switch.tsx` · client component

- **`Switch`** — `.switch-track` — 38x22 pill, `input-border` off / accent on, with an 18px white thumb that slides 16px.

**SwitchProps** extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">

| Prop | Type | Notes |
|---|---|---|
| `checked` | `boolean` |  |
| `onCheckedChange` | `(checked: boolean) => void` |  |
| `label?` | `ReactNode` | `.control-label` — renders the guideline's `.switch-row` (track + label, whole row clickable). Without it, give the switch an `aria-label`. |

## table-expand

`components/ui/table-expand.tsx` · client component

- **`ExpandButton`** — `.expand-btn` — 28px chevron toggle; the chevron turns 90° and the border goes accent while open.
- **`ExpandedRow`** — `.tbl-detail` — the grey band under an open row holding a small white table and its totals.

**ExpandColumn**

| Prop | Type | Notes |
|---|---|---|
| `key` | `string` |  |
| `header` | `ReactNode` |  |
| `numeric?` | `boolean` |  |
| `primary?` | `boolean` |  |

**TableExpandable** <T>

| Prop | Type | Notes |
|---|---|---|
| `columns` | `ExpandColumn[]` | Columns of the nested table. |
| `rows` | `(row: T) => Record<string, ReactNode>[]` | The nested rows for a record; each is a map of column key → cell content. |
| `totals?` | `(row: T) => { label: ReactNode; value: ReactNode }[]` | Summary figures under the nested table ("Subtotal 4,200 · VAT 630 · Total 4,830"). |
| `label?` | `string` | Accessible name of the toggle. Default "Toggle line items". |

## table-filters

`components/ui/table-filters.tsx` · client component

- **`FilterPanel`** — `.flt-panel` body — saved views, then one field per filter, then the Reset / Apply footer (`.mdl-foot`). Edits stay in `draft` until Apply, like the guideline ("everything else waits for a deliberate action").

**NumberRange**

| Prop | Type | Notes |
|---|---|---|
| `min` | `number \| null` |  |
| `max` | `number \| null` |  |

**MultiSelectFilter** <T> extends FilterBase<T>

| Prop | Type | Notes |
|---|---|---|
| `type` | `"multiselect"` |  |
| `options` | `MultiSelectOption[]` |  |
| `placeholder?` | `string` |  |
| `getValue` | `(row: T) => string` |  |

**DateRangeFilter** <T> extends FilterBase<T>

| Prop | Type | Notes |
|---|---|---|
| `type` | `"daterange"` |  |
| `placeholder?` | `string` |  |
| `today?` | `string` | ISO date treated as today (highlight + presets). Defaults to the real today. |
| `getValue` | `(row: T) => string` |  |

**NumberRangeFilter** <T> extends FilterBase<T>

| Prop | Type | Notes |
|---|---|---|
| `type` | `"numberrange"` |  |
| `unit?` | `string` | Appended to the applied chip ("1000–5000 ETB") and put in the label. |
| `getValue` | `(row: T) => number` |  |

**SavedView**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `label` | `string` |  |
| `filters` | `FilterValues` |  |
| `search?` | `string` |  |
| `quickFilter?` | `string` |  |

**AppliedChip**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `label` | `string` |  |
| `remove` | `(values: FilterValues) => FilterValues` | Returns `values` with just this chip's filter (or this one option of a multiselect) cleared. |

**FilterPanelProps** <T>

| Prop | Type | Notes |
|---|---|---|
| `fields` | `FilterField<T>[]` |  |
| `draft` | `FilterValues` |  |
| `onDraftChange` | `(values: FilterValues) => void` |  |
| `views` | `SavedView[]` |  |
| `activeViewId` | `string` |  |
| `onApplyView` | `(id: string) => void` |  |
| `onSaveView` | `(name: string) => void` |  |
| `onReset` | `() => void` |  |
| `onApply` | `() => void` |  |

**InferableColumn** <T>

| Prop | Type | Notes |
|---|---|---|
| `key` | `string` |  |
| `header` | `ReactNode` |  |
| `accessor?` | `(row: T) => ReactNode` |  |
| `filterValue?` | `(row: T) => string \| number` | The raw value to filter on, for columns whose accessor returns a pill or other element. |
| `filter?` | `false` | `false` keeps the column out of the Filters panel. |
| `primary?` | `boolean` |  |
| `numeric?` | `boolean` | A right-aligned figures column: never offered as a list of text values. |

## table-skeleton

`components/ui/table-skeleton.tsx` · server-safe

- **`TableSkeletonRows`** — `.skel` rows for a table body — same columns, same padding as the real rows.
- **`StackSkeleton`** — The phone version: skeleton cards matching the stacked rows (title + status on top, three key–value lines).

**TableSkeletonRowsProps**

| Prop | Type | Notes |
|---|---|---|
| `columns` | `{ numeric?: boolean; primary?: boolean }[]` |  |
| `rows?` | `number` |  |
| `selectable?` | `boolean` |  |
| `rowActions?` | `boolean` |  |
| `padding` | `string` | Matches the table's cell padding so the swap to real rows doesn't move anything. |

## table-stack

`components/ui/table-stack.tsx` · client component

- **`StackRows`** — `.stack-rows` — the guideline's phone layout: each row becomes a compact card with its title and status on top and key–value lines below; more rows load as you scroll (infinite scroll, not numbered pages).

**StackColumn** <T>

| Prop | Type | Notes |
|---|---|---|
| `key` | `string` |  |
| `header` | `ReactNode` |  |
| `mobile?` | `StackRole` |  |
| `primary?` | `boolean` |  |
| `accessor?` | `(row: T) => ReactNode` |  |
| `render?` | `(row: T) => ReactNode` |  |

**StackRowsProps** <T>

| Prop | Type | Notes |
|---|---|---|
| `rows` | `T[]` |  |
| `columns` | `StackColumn<T>[]` |  |
| `getRowId` | `(row: T) => string \| number` |  |
| `selectable?` | `boolean` |  |
| `isSelected` | `(id: string \| number) => boolean` |  |
| `onToggle` | `(row: T, checked: boolean) => void` |  |
| `renderActions?` | `(row: T) => ReactNode` | The row's view button / "⋯" menu, rendered in the card's top row. |
| `expandable?` | `TableExpandable<T>` | Rows that open into nested data get a "Line items" toggle at the bottom of their card. |
| `onRowClick?` | `(row: T, e: { ctrlKey: boolean; metaKey: boolean }) => void` | A tap on a card (not on a control inside it). |
| `activeRowId?` | `string \| number` |  |
| `highlightIds?` | `Set<string \| number>` |  |
| `hasMore` | `boolean` |  |
| `onEndReached` | `() => void` |  |

## table

`components/ui/table.tsx` · client component

- **`Table`**

**ColumnDef** <T>

| Prop | Type | Notes |
|---|---|---|
| `key` | `string` |  |
| `header` | `ReactNode` |  |
| `accessor?` | `(row: T) => ReactNode` | Reads the cell value straight off the row when no `render` is given. |
| `render?` | `(row: T) => ReactNode` |  |
| `sortable?` | `boolean` |  |
| `sortFn?` | `(a: T, b: T) => number` | Custom comparator for client-side sort; defaults to a generic string/number compare on the accessor value. |
| `width?` | `string` |  |
| `numeric?` | `boolean` | `.num` column — right-aligned, tabular figures. |
| `primary?` | `boolean` | `.primary` column — the row's main label, rendered at text/500 instead of text-soft/400. Exactly one column should set this. |
| `mobile?` | `StackRole` | On a phone (stacked cards): `title` is the card heading (default: the `primary` column), `badge` sits beside it (a status pill), `hidden` leaves the column out. Everything else becomes a key–value line. |
| `filterValue?` | `(row: T) => string \| number` | The raw value the automatic Filters panel and the search box read, for a column whose `accessor` returns an element (a status pill) or a formatted string. |
| `filter?` | `false` | `false` keeps this column out of the automatic Filters panel. |
| `className?` | `string` |  |

**RowAction** <T>

| Prop | Type | Notes |
|---|---|---|
| `key` | `string` |  |
| `label` | `string` |  |
| `icon?` | `ReactNode` |  |
| `view?` | `boolean` |  |
| `onClick` | `(row: T) => void` |  |
| `disabled?` | `(row: T) => boolean` |  |

**QuickFilter** <T>

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` |  |
| `value` | `string` |  |
| `predicate` | `(row: T) => boolean` |  |

**TableProps** <T>

| Prop | Type | Notes |
|---|---|---|
| `columns` | `ColumnDef<T>[]` |  |
| `data` | `T[]` |  |
| `getRowId` | `(row: T) => string \| number` |  |
| `toolbar?` | `boolean` | `.tbl-toolbar` — title, search box, quick-filter chips. **Defaults to `true`**, same as `pagination`: pass `toolbar={false}` to opt out rather than the other way around. Renders only the pieces you give it (title, search, quick filters, `toolbarActions`) — an all-empty toolbar renders nothing. The "Filters" button and its panel come from `filters` below. |
| `title?` | `ReactNode` |  |
| `searchable?` | `boolean` | Default true (only matters while `toolbar` is true). |
| `searchPlaceholder?` | `string` |  |
| `searchQuery?` | `string` | Uncontrolled by default; pass both to drive search yourself (e.g. server-side). |
| `onSearchChange?` | `(query: string) => void` |  |
| `searchFn?` | `(row: T, query: string) => boolean` | Defaults to a case-insensitive substring match across every column's accessor value. |
| `quickFilters?` | `QuickFilter<T>[]` | `.tbl-toolbar-sub` single-select filter-chip row (`#flt-quick-row`). Omit to render no chip row at all. |
| `quickFilterValue?` | `string` |  |
| `onQuickFilterChange?` | `(value: string) => void` |  |
| `filters?` | `FilterField<T>[] \| false` | Describes the fields in the guideline's "Filters" panel (`.flt-panel`): multi-selects, a date range, a min–max number pair. Pass them and the Filters button (with its applied-count badge), the panel (saved views, fields, Reset / Apply), and the applied-filter chip row with "Clear all" all appear — `<Table>` also does the filtering. Edits stay in the panel until Apply. |
| `filterValues?` | `FilterValues` | Controlled applied filters. Pass with `onFilterChange` to drive filtering yourself (e.g. server-side). |
| `onFilterChange?` | `(values: FilterValues) => void` |  |
| `savedViews?` | `SavedView[]` | Ready-made views shown as chips at the top of the Filters panel, after the built-in "All" view. |
| `allViewLabel?` | `string` | Label of the built-in view that clears everything. Default "All". |
| `onSaveView?` | `(view: SavedView) => void` | Called when someone saves the current combination as a new view ("+ Save current as view"). Views are also kept in the table's own state. |
| `toolbarActions?` | `ReactNode` | Slot for page-specific controls next to the search box — a primary "+ New" button, etc. |
| `selectable?` | `boolean` | Checkbox column + bulk action bar. Default false — opt in per table. |
| `selectedIds?` | `Set<string \| number>` |  |
| `onSelectionChange?` | `(ids: Set<string \| number>) => void` |  |
| `bulkActions?` | `(selectedRows: T[]) => ReactNode` |  |
| `rowActions?` | `(row: T) => RowAction<T>[]` |  |
| `expandable?` | `TableExpandable<T>` | `.tbl-expand` — rows open into their own nested data (line items, a short breakdown). Never for the row's own fields: those live in the detail view. Only one row is open at a time. Phones show the stacked cards, which don't expand. |
| `onRowClick?` | `(row: T, e: { ctrlKey: boolean; metaKey: boolean }) => void` | Click or Enter on a row (Ctrl/Cmd + click passes `e.metaKey`/`e.ctrlKey` so the caller can open the full page). Rows get a pointer cursor and a keyboard focus bar. |
| `onVisibleRowsChange?` | `(rows: T[]) => void` | Called with every row that currently passes search, filters and sort (all pages), in display order — so a detail view can step through exactly what the user sees. |
| `activeRowId?` | `string \| number` | The record currently open in a detail panel — its row stays tinted. |
| `highlightIds?` | `Set<string \| number>` | Rows to flash green for a moment (a record that was just created). |
| `sortColumn?` | `string` | Uncontrolled by default (sorts `data` client-side); pass to drive server-side sort instead. |
| `sortDirection?` | `SortDirection` |  |
| `onSortChange?` | `(column: string, direction: SortDirection) => void` |  |
| `pagination?` | `boolean` | Mandatory per the guideline — every table ships pagination + rows-per-page unless a developer opts out. |
| `rowsPerPageOptions?` | `number[]` |  |
| `defaultRowsPerPage?` | `number` |  |
| `page?` | `number` | Server-side pagination: pass the current page's rows in `data`, plus these, and handle the callbacks yourself. |
| `onPageChange?` | `(page: number) => void` |  |
| `rowsPerPage?` | `number` |  |
| `onRowsPerPageChange?` | `(rowsPerPage: number) => void` |  |
| `totalRows?` | `number` |  |
| `dense?` | `boolean` | `.dense` — 34px rows for ledgers/reconciliation. Never mix with default density on one screen. |
| `stackOnMobile?` | `boolean` | Phones: stack each row into a compact card with key–value lines and load more on scroll instead of numbered pages (the guideline's responsive table). Default true; wide tables otherwise scroll sideways with the first column pinned. |
| `loadingMore?` | `boolean` | Appends a "Loading more…" row under the table while the next page is being fetched (infinite append). |
| `onLoadMore?` | `() => void` | Server mode + stacked cards: called when the end of the list scrolls into view and more rows exist (append them to `data`). |
| `loading?` | `boolean` |  |
| `emptyState?` | `ReactNode` | Shown when there is no data at all — the first-run moment ("No bookings yet" + the primary action that creates one). |
| `noResultsState?` | `ReactNode` | Replaces the built-in "No results for …" / "Nothing matches these filters" states, which appear when a search or filter empties the table. |
| `className?` | `string` |  |

## tabs

`components/ui/tabs.tsx` · client component

- **`Tabs`** — Groups a `<TabList>` and its `<TabPanel>`s and holds the selected value. Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
- **`TabList`** — `.tabs-row` — the underlined tab strip. Arrow keys, Home and End move between tabs.
- **`Tab`** — `.tab-item` — 13px / 600 label, 2px accent underline when active.
- **`TabPanel`** — `.tab-panel` — shown only while its tab is selected. 12.5px / soft / 1.6 line-height.

**TabsProps**

| Prop | Type | Notes |
|---|---|---|
| `value?` | `string` | The selected tab (controlled). Leave it out and pass `defaultValue` for tabs nothing else needs to know about. |
| `onValueChange?` | `(value: string) => void` |  |
| `defaultValue?` | `string` | The tab selected at first when uncontrolled. |
| `children` | `ReactNode` |  |
| `className?` | `string` |  |

**TabProps**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` |  |
| `children` | `ReactNode` |  |
| `disabled?` | `boolean` |  |
| `count?` | `number` | A count after the label (`.count.inline`): the accent form for what needs action, `soft` for the rest. |
| `countSoft?` | `boolean` |  |
| `countStyle?` | `"badge" \| "pill"` | `pill` is the record page's quieter count (`.dv-n`): grey capsule, accent-tinted when its tab is active. |
| `className?` | `string` |  |

## text-link

`components/ui/text-link.tsx` · server-safe

- **`TextLink`** — `.card-link` — the small accent text action ("Clear all", "+ Save current as view", "Clear"). 12px / 600, underline on hover.

**TextLinkProps** extends ButtonHTMLAttributes<HTMLButtonElement>

| Prop | Type | Notes |
|---|---|---|
| `soft?` | `boolean` | `soft` — the secondary action next to a primary one ("Decline" beside "Accept"): `text-soft` instead of accent. |

## textarea

`components/ui/textarea.tsx` · server-safe

- **`Textarea`** — `.textarea-input` — 88px min height, 10px/12px padding, 1.5 line-height, vertical resize; same border, focus and error states as `<Input>`.

**TextareaProps** extends TextareaHTMLAttributes<HTMLTextAreaElement>

| Prop | Type | Notes |
|---|---|---|
| `error?` | `boolean` |  |

## theme-switch

`components/ui/theme-switch.tsx` · client component

- **`ThemeSwitch`** — Light / Dark / System, as a compact three-way switch. Saves the choice and applies it at once; "System" follows the device. It is already inside the top bar's avatar menu; use it on its own for a settings page.

## time-slot-picker

`components/ui/time-slot-picker.tsx` · client component

- **`TimeSlotPicker`** — `.slots-wrap` — slot chips grouped by part of the day (or by departure), one selection, taken slots struck through, and a summary row that confirms the choice.

**TimeSlot**

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | The value passed to `onValueChange` ("2:30 PM"). |
| `label` | `string` | What the slot shows ("2:30" or "7:30 AM"). |
| `caption?` | `string` | A second line inside the slot ("5 seats", "Full"). |
| `off?` | `boolean` | Taken — struck through and not selectable. |

**TimeSlotGroup**

| Prop | Type | Notes |
|---|---|---|
| `label?` | `string` | "Morning", "Afternoon", "Departures". Omit when a surrounding `<Field label>` already names the slots (the checkout form). |
| `note?` | `ReactNode \| null` | Text after the label — a count or route; defaults to "· N free". Pass `null` for none. |
| `slots` | `TimeSlot[]` |  |

**TimeSlotPickerProps**

| Prop | Type | Notes |
|---|---|---|
| `groups` | `TimeSlotGroup[]` |  |
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `summary?` | `ReactNode` | Summary row under the groups: the booking description on the left, the chosen time on the right. |
| `columns?` | `number` | Fixed number of columns (checkout uses 4); default is auto-fill at 78px minimum. |
| `className?` | `string` |  |

## toast

`components/ui/toast.tsx` · client component

- **`Toast`** — `.toast` — one shell, ten patterns: a card at most 380px wide with a 32px icon tile (or an avatar / payment logo), a 13.5px title, an optional 12.5px body, text-link actions and the quiet close button. A 2px line along the bottom shows how long it stays. Pure view — `toast()` and `<Toaster>` (toaster.tsx) put it on screen and time it.

**ToastAction**

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` |  |
| `soft?` | `boolean` | The secondary action beside a primary one ("Decline"). |
| `onClick?` | `() => void` |  |

**ToastViewProps**

| Prop | Type | Notes |
|---|---|---|
| `kind?` | `ToastKind` |  |
| `icon?` | `ToastIcon` | Built-in icon for the tile. Ignored when `leading` is given. |
| `leading?` | `ReactNode` | Replaces the icon tile — an `<Avatar size={32}>` or `<PayLogo size={32}>`. |
| `title` | `ReactNode` |  |
| `body?` | `ReactNode` |  |
| `meta?` | `ReactNode` | `.toast-meta` — the 11px muted line under the body ("Telebirr · just now"). |
| `amount?` | `ReactNode` | `.toast-amt` — a bold amount on the right (transactions). |
| `amountTone?` | `"default" \| "in"` |  |
| `progress?` | `{ value: number; left?: ReactNode; right?: ReactNode }` | `.prog-row` — a progress bar with a left and right caption. Used by background jobs. |
| `actions?` | `ToastAction[]` |  |
| `compact?` | `boolean` | One line, tighter padding — title-only confirmations. |
| `snackbar?` | `boolean` | The mobile snackbar: charcoal surface, one line, accent action. |
| `timerMs?` | `number` | Shows the 2px timer line for this many ms (the toast dismisses itself — the region does the actual timing). |
| `timerPaused?` | `boolean` |  |
| `timerKey?` | `number` | Change to restart the timer line (an updated toast gets a fresh window). |
| `onDismiss?` | `() => void` |  |
| `className?` | `string` |  |

## toaster

`components/ui/toaster.tsx` · client component

- **`Toaster`** — `.toast-region` — mount once. One placement only: top-right on desktop, top-center below 640px. Newest toast on top; from the `max + 1`th they collapse into a "+N more" pill. Hovering pauses every timer, and Escape dismisses the newest toast.

**ToastActionContext**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` |  |
| `update` | `(opts: Partial<ToastOptions>) => void` | Replace this toast in place — "Undo" turns into "Booking restored". |
| `dismiss` | `() => void` |  |

**ToastActionOption** extends Omit<ToastAction, "onClick">

| Prop | Type | Notes |
|---|---|---|
| `onClick?` | `(ctx: ToastActionContext) => void` | Runs when clicked. If it doesn't update the toast, the toast dismisses itself. |

**ToastOptions** extends Omit<ToastViewProps, "title" \| "actions" \| "timerMs" \| "timerPaused" \| "onDismiss">

| Prop | Type | Notes |
|---|---|---|
| `title` | `ReactNode` |  |
| `actions?` | `ToastActionOption[]` |  |
| `ms?` | `number` | Milliseconds before it dismisses itself. Omit for a toast that stays until dismissed or acted on (errors, loading, progress, rich). |
| `id?` | `string` | Use an id to update or replace an existing toast. |

**ToasterProps**

| Prop | Type | Notes |
|---|---|---|
| `container?` | `"viewport" \| "parent"` | `viewport` (default) fixes the region to the screen; `parent` places it inside the nearest positioned ancestor (a demo stage). |
| `offset?` | `number` | Distance in px from the top edge — set it to your header's height. Default 64. |
| `compact?` | `boolean` | The narrower 320px column 12px from the edge, for a toaster drawn inside a panel or stage (the detail view). |
| `max?` | `number` | Visible toasts before the rest collapse into a "+N more" pill. Default 3. |
| `className?` | `string` |  |

## topbar

`components/ui/topbar.tsx` · client component

- **`Topbar`** — `.app-topbar` — the 64px bar over the page. It is complete on its own: the menu toggle (phones), the organization switcher, the search box (with its built-in ⌘K palette), the notification bell and the avatar are all on by default; you only pass their data (`search.items`, `notifications`, `user`, `organization`).
- **`TopbarSpacer`** — `.tb-spacer` — pushes everything after it to the right.
- **`MenuToggle`** — The hamburger that opens the sidebar drawer. Only visible below 760px; nothing at all when the top bar sits outside an `<AppShell>` (there is no drawer to open).
- **`OrgSelect`** — `.org-select` — the tenant switcher: icon, 14/600 name, an up-down chevron. The panel is the select panel (min 220px) with a check on the active one.
- **`SearchTrigger`** — `.search-trigger` — the 260px "Search sections, actions…" button that opens the command palette. Hidden below 480px.
- **`NotificationButton`** — The bell with the red unread dot.
- **`UserMenu`** — `.app-user` — the avatar that opens a 180px menu (Profile, Settings, a rule, Log out).

**TopbarProps**

| Prop | Type | Notes |
|---|---|---|
| `className?` | `string` |  |
| `aria-busy?` | `boolean \| "true" \| "false"` |  |
| `organization?` | `OrgSelectProps` | The tenant switcher, after the menu toggle. Omit for single-organization apps. |
| `search?` | `{ items?: CommandItem[]; onSelect?: (item: CommandItem) => void; placeholder?: string } \| false` | The search box with the ⌘K hint — **on by default** — opens the built-in command palette. Give it `items` (your sections and actions, e.g. the sidebar's links) and `onSelect` (navigate). `false` leaves search out. |
| `onSearch?` | `() => void` | Opens your own search instead of the built-in palette (the box is still drawn for you). |
| `notifications?` | `{ unread?: boolean; onClick?: () => void } \| false` | The bell. Shown by default; `{ unread: true }` adds the red dot, `false` removes it. |
| `user?` | `{ initials?: string; items?: UserMenuItem[]; label?: string }` | The avatar and its menu (Profile, Settings, a rule, Log out) — **on by default**. Without `items` the avatar is shown on its own; `initials` defaults to "U". |
| `themeSwitch?` | `boolean` | Light / Dark / System switch at the top of the avatar menu — **on by default**. `false` removes it. |
| `trailing?` | `ReactNode` | Replaces the user menu — a skeleton avatar while loading, or a "Sign in" button. |
| `children?` | `ReactNode` | Anything extra after the organization switcher (a breadcrumb, a title). |

**OrgSelectProps**

| Prop | Type | Notes |
|---|---|---|
| `organizations` | `{ value: string; label: string }[]` |  |
| `value` | `string` |  |
| `onValueChange` | `(value: string) => void` |  |
| `icon?` | `ReactNode` |  |

**SearchTriggerProps**

| Prop | Type | Notes |
|---|---|---|
| `onClick` | `() => void` |  |
| `placeholder?` | `string` |  |
| `shortcut?` | `string` | The keyboard hint. Default ⌘K. |

**UserMenuItem**

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` |  |
| `icon?` | `ReactNode` |  |
| `onClick?` | `() => void` |  |
| `danger?` | `boolean` | Log out and the like: red text and icon. |
| `separatorBefore?` | `boolean` | A rule above this item. |


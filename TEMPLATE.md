# How to use this template

## 1. Start a new project
1. `npx create-next-app@latest my-app` (TypeScript, Tailwind, App Router), then inside it `npx cheche-ui starter`.
   The installer copies the component library (`components/ui/`, `lib/`, `styles/tokens.css`) and these pages, and keeps
   create-next-app's own page, layout and styles as `*.cheche-backup`.
2. Run `npm run dev` and sign in with any email and password (the sign-in is a placeholder, see `lib/auth.ts`).

## 2. Make it yours (5 minutes)
All brand text lives in **`lib/config/brandos-config.ts`**:

| Change | Where |
|---|---|
| Product name, tagline, currency, timezone | `BRAND_CONFIG` |
| Organizations in the switcher | `ORGANIZATIONS` |
| Sidebar pages (max 6 top-level) | `TOP_LEVEL_NAV_ITEMS`, `SECONDARY_NAV_ITEMS` |
| Which pages each business type shows | `DOMAIN_PROFILES[...].enabledModules` |
| `⌘K` search entries | `COMMAND_PALETTE_ITEMS` |
| Browser tab title | `metadata` in `app/layout.tsx` |

The accent colour comes from `styles/tokens.css`. Do not edit that file or `components/ui/` for one project. If a component can't do what you need, ask the library owners.

## 3. What is included
- App shell: sidebar, topbar, organization switcher, `⌘K`, notifications, light/dark theme
- Sign in, forgot password, reset password, verify account
- `/dashboard` (Today), `/payments` and `/users` (the record examples: table → side panel → full page → create / edit),
  `/orders`, `/payouts`, `/inbox`, `/catalog`, `/analytics`, `/notifications`, `/settings`
- `/components`: the component library, shown in real screens (development only; production answers 404)
- `components/charts/`: line, bar, pie, heatmap, ranked and segmented charts used by the dashboard and analytics pages.
  These are **app-level examples, not library components**: the guideline defines only the Chart card
  (`components/ui/chart-card.tsx`), so the other charts live here, built from tokens, and you may change them per project.
- `lib/services/*`: mock services with data in `mocks/`. Point them at your API.

## 4. Add a page
1. Create a folder in `app/(dashboard)/<name>/` with a `page.tsx`.
2. Add one line to `TOP_LEVEL_NAV_ITEMS` and add its id to `enabledModules`.
   To put a page under another one (such as Payouts under Payments), add it to that item's `children` in `TOP_LEVEL_NAV_ITEMS`. Give a group two or more children; a single sub-page stays a normal item. The children fly out beside the parent on hover or focus, the guideline's sub-navigation pattern.
3. For a list of records, copy `app/(dashboard)/payments/[[...slug]]/page.tsx`. It already has the list, side panel, full record page, and create and edit pages.
4. Replace the mock data: the page reads from `lib/services/*-service.ts`. Point the service at your API.

## 5. Rules
1. Use `components/ui/` first. Never hand-write a button, input, card, table or modal.
2. Colours, radii and shadows come from tokens only. No hex values or Tailwind colour names.
3. Statuses are always `StatusPill`.
4. Create and edit are full pages. Modals only confirm.
5. Money, dates and phones use `lib/format.ts` and `PhoneInput` / `AmountInput`.
6. Copy: plain words, sentence case, buttons name the action.

Full detail: `AGENTS.md` and `.cheche-ui/`.

## 6. Document a component
Add an entry in `lib/showcase/entries/`. It shows up in `/components` with no other change.

## 7. Before you merge
`npx tsc --noEmit`, then check the page at 375px wide and in dark mode.

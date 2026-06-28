# Wallet UI Theme Design

## Scope

Wallet is a family/group-oriented envelope budgeting PWA. The current UI ships with Mantine defaults: a flat teal primary color, plain cards, no app shell, no persistent navigation, and a generic visual language that reads as "default Mantine" — bland, not unpleasant, but missing a clear point of view.

This design replaces the visual treatment of the PWA with a deliberate design language built around a small set of tokens and a few component recipes. The product model, data flow, API, and feature set stay the same; only how the product looks and feels changes.

In scope:

- A new CSS-variable design system (tokens) layered on top of the existing Mantine setup.
- A new page header (hero card), bottom navigation (pill dock), and modal/sheet chrome (bottom sheet on phones, centered on desktop).
- Migrating every existing screen to the new design language.
- Light theme as a sibling variant (`html[data-theme="light"]`) — designed-for but deferred. The tokens support it.

Out of scope:

- New pages, new features, or any change to the API.
- New UI library. Mantine stays as the component engine; visual treatment is CSS-driven.
- React Native. The token system is portable, but the recipes are web-only.

## Design Goals

- **Distinct without being loud.** Calm, dark, modern. The accent is present but the screens do not shout.
- **One source of truth.** Every surface, every status, every control resolves to a token. Change a token, every screen updates.
- **PWA-first.** Phone-first layout with safe-area padding; the same chrome works on desktop.
- **Future-friendly.** The token names and values map cleanly to a future React Native theme.

## Architecture

The Wallet PWA uses two new stylesheet files plus a minimal Mantine theme update. Mantine continues to provide form components, modal portals, and notification surface; visual treatment comes from CSS variables.

**`apps/web/src/styles/tokens.css`** — design tokens.
- Surfaces, borders, text, semantic, accent.
- Type scale, line heights, letter spacing, weights.
- Spacing, radii, shadows, glow.

**`apps/web/src/styles/recipes.css`** — component recipes.
- Buttons, inputs, cards, alerts, table rows, modals, headers, nav.
- Each recipe references tokens via `var(--*)`.

**`apps/web/src/styles/theme.ts`** — Mantine theme update.
- Mantine’s `theme.other` is populated with a stringly-typed mirror of the token names.
- Mantine’s existing `theme.primaryColor` is left as-is for the few places that still consume it; new code uses CSS variables.

**`apps/web/src/app/layout.tsx`** — add a `<html data-theme="dark">` baseline and link the new stylesheets.

**Why CSS variables, not Mantine theme overrides or a new library:**
- One source of truth across Mantine, custom CSS, and future React Native.
- Light theme is a single attribute change on `<html>`.
- The glow and gradient recipes need CSS, not JS theme objects.
- The existing Mantine tests (form behavior, validation, API) keep working.

## Design Decisions Locked in Companion

All visual decisions below were made interactively in the brainstorming companion at http://localhost:65099 with the user reviewing each option.

### Color Tokens (dark theme)

```text
--color-bg            #0e0e10   page background
--color-bg-elev-1     #17171a   surface (card)
--color-bg-elev-2     #1f1f23   surface raised (hover)
--color-border        #2a2a30   border (subtle)
--color-border-strong #3a3a44   border (focus)
--color-text          #fafafa   text (primary)
--color-text-muted    #d4d4d8   text (secondary)
--color-text-dim      #71717a   text (tertiary)
--color-accent        #3b82f6   accent (indigo blue)
--color-success       #22c55e   success (emerald)
--color-danger        #ef4444   danger (red)
--color-warn          #f59e0b   warning (amber)
```

For text contrast, the secondary text was bumped from `#a1a1aa` to `#d4d4d8` to meet AA on the dark surface (the original was too dim). Headers and table headers use `#e4e4e7`.

### Typography

```text
--text-display  32 / 1.10 / -0.6 / 800
--text-h1       24 / 1.20 / -0.4 / 800
--text-h2       20 / 1.25 / -0.2 / 700
--text-h3       17 / 1.30 / -0.1 / 700
--text-body     14 / 1.55 /  0.0 / 400
--text-caption  12 / 1.40 /  0.1 / 500
--text-overline 11 / 1.20 /  0.8 / 700   (uppercase via text-transform)
```

Font family: `Inter, system-ui, sans-serif`.

### Spacing Scale

```text
--space-0  0
--space-1  2
--space-2  4
--space-3  8
--space-4  12
--space-5  16
--space-6  20
--space-7  24
--space-8  32
--space-9  40
--space-10 56
```

### Radii

```text
--radius-none  0
--radius-xs    4
--radius-sm    6
--radius-md    10
--radius-lg    14
--radius-xl    18
--radius-2xl   24
--radius-full  999
```

### Component Recipes

**Buttons** (Option C: outlined lighter border):
- Background: `var(--color-accent)`.
- Border: 1px, two shades lighter than the fill (`#60a5fa` on the indigo accent).
- Radius: `--radius-md` (10px).
- Padding: 9/14.
- Font: 13px / 700.
- Variants: primary, secondary, ghost, danger, disabled.

**Inputs / Textareas** (Glass, TL whisper glow 8%):
- Container: glass gradient + `--color-border-strong` + 14 radius + `0 8px 28px rgba(0,0,0,0.45)` shadow + radial gradient at 0,0 of `accent@8%` fading to transparent at 50%.
- Idle field: page background, `--color-border` border.
- Focus field: `--color-accent` border + 3px ring at 18% accent opacity.
- Money fields: same recipe, monospaced font.
- Textarea: same recipe, vertical resize.

**Cards** (Elevated + Glass):
- Background: `linear-gradient(135deg, #1f1f23 0%, #17171a 60%)`.
- Border: 1px `--color-border-strong`.
- Radius: `--radius-lg` (14px).
- Shadow: `0 8px 28px rgba(0,0,0,0.45)`.
- Status glow: radial gradient at 85%, 10% of `status@20-22%` fading to transparent at 55%.
- Used as envelope cards, summary tiles, and as the chrome for the page header, modals, and table rows.

**Alerts** (Tonal + icon chip):
- Background: `status@10%`.
- Border: 1px `status@30%`.
- Radius: `--radius-md` (10px).
- Icon chip: 20×20, `status@25%`, 6px radius.
- Text: status color, lightened.
- Variants: info, success, warn, danger.

**Table rows** (Stack of cards + header + leading status dot):
- Container: `--color-bg-elev-1`, `--color-border`, 14 radius.
- Header row: `--color-bg-elev-2`, 11px uppercase `--color-text` headers, weight 700, pad 12/16.
- Data rows: 14px body, `--color-text` for primary, `--color-text-muted` for secondary, pad 14/16.
- Leading 10×10 status dot (success / danger / accent / warn) in a dedicated first column.
- Hover: `--color-accent` 10% background + 3px accent side bars.

**Badges / Tags** (Generous pill):
- Background: `status@18%`.
- Text: status color, lightened.
- Radius: `--radius-full` (999).
- Padding: 6/12.
- Font: 12px / 700.

**Modals / Sheets** (Bottom sheet on phones, centered on desktop):
- Phone: full-width, 18px top radius, drag handle 36×4 `--color-border-strong`, sheet max-height 70%, glass chrome.
- Desktop (≥768px): centered, max-width 520, drag handle hidden, same chrome.
- Backdrop: `rgba(0,0,0,0.55)`.
- Same glass recipe as the locked card.

**Page header** (Hero card with glass + glow):
- Same chrome as the locked card.
- Top row: brand mark (logo + name) · optional actions · overflow.
- Title block: overline (11px uppercase, `--color-text-dim`) + 24px / 800 / letter-spacing -0.4 (`--color-text`).
- Status glow swaps by screen (blue / green / amber / purple) to give each top-level screen a distinct identity.

**Bottom navigation** (Pill dock with center Add):
- Dock: `rgba(31,31,35,0.95)` + 12px blur + `--color-border-strong` border + 999 radius + `0 8px 24px rgba(0,0,0,0.5)` shadow.
- Item: 18×18 icon + 9px label + 6/10 padding.
- Active: 18% accent background + accent text + 700 weight.
- Center Add: 36×36 circle, accent gradient, 4px radius, `0 4px 14px accent@40%` shadow.
- Bottom safe-area padding: `env(safe-area-inset-bottom)`.

**Auth screens** (Bottom-sheet PWA flow):
- Variant 4: top of screen shows the brand / welcome; bottom sheet carries the form and primary/secondary actions.
- Same glass chrome, same drag handle on phone, same buttons.

## Screen Layouts Locked in Companion

Every screen was reviewed in the companion with 3–4 layout variants. Final picks:

| Screen | Layout |
| --- | --- |
| Dashboard | Variant 1 — information-first, dense (header, alert, 2×2 summary, envelope cards, recurring, activity, dock) |
| Envelopes | Variant 4 — header with Active / Archived tabs in the hero card; envelope list below |
| Activity | Variant 1 — date-grouped cards (Today / Yesterday sections) |
| Reports | Hybrid of 3 + 4 — 2 KPI cards + 6-month spend chart from variant 3, then per-envelope spending cards from variant 4 |
| Settings | Variant 2 — profile header card + sectioned cards (Group, Appearance, Account) |
| Login / Signup / New group | Variant 4 — bottom-sheet PWA flow |
| Invite accept | Auth variant 4 + group hero card on top |

## Files Touched

New:
- `apps/web/src/styles/tokens.css` — design tokens.
- `apps/web/src/styles/recipes.css` — component recipes.
- `apps/web/src/components/bottom-nav.tsx` — pill dock bottom navigation.
- `apps/web/src/components/header.tsx` — reusable hero-card page header.
- `apps/web/src/components/sheet.tsx` — bottom sheet / centered modal chrome.

Modified:
- `apps/web/src/app/layout.tsx` — link new stylesheets, set `data-theme="dark"`.
- `apps/web/src/app/providers.tsx` — pass Mantine theme that references tokens.
- `apps/web/src/app/page.tsx` — landing.
- `apps/web/src/app/login/page.tsx` — login.
- `apps/web/src/app/signup/page.tsx` — signup.
- `apps/web/src/app/groups/new/page.tsx` — new group.
- `apps/web/src/app/groups/[groupId]/page.tsx` — group home (dashboard).
- `apps/web/src/app/groups/[groupId]/envelopes/page.tsx` — envelopes.
- `apps/web/src/app/groups/[groupId]/activity/page.tsx` — activity.
- `apps/web/src/app/groups/[groupId]/reports/page.tsx` — reports.
- `apps/web/src/app/groups/[groupId]/settings/page.tsx` — settings.
- `apps/web/src/app/invites/[token]/page.tsx` — invite accept.
- `apps/web/src/features/dashboard/dashboard-page.tsx` — use the new chrome.
- `apps/web/src/features/envelopes/envelope-card.tsx` — apply locked card recipe.
- `apps/web/src/features/envelopes/envelope-forms.tsx` — apply locked input/button recipes.
- `apps/web/src/components/stale-data-banner.tsx` — apply locked alert recipe.
- `apps/web/src/styles/theme.ts` — Mantine theme references the token layer.

## Data Flow

The design system does not change data flow. The frontend continues to call the NestJS API as today. Visual treatment is a pure render-layer concern.

- CSS variables resolve at paint time, so token changes are immediate.
- The active theme is read from `<html data-theme="...">`; switching the attribute is enough to swap palettes (light theme deferred but supported by the token structure).
- The bottom nav and the page header are presentational; no data shape changes.

## Error Handling

The existing error surface is preserved. Alerts (info / success / warn / danger) are restyled to the locked alert recipe. The stale-data banner becomes a tonal alert with an `i` chip. Form validation errors use the danger alert recipe.

The dashboard contract test (`apps/web/test/dashboard-contract.test.ts`) keeps passing because it asserts string presence, not visual treatment. We add tests for:
- The new `tokens.css` and `recipes.css` are imported by the layout.
- The bottom nav renders the five destinations plus a center Add.
- The hero header renders overline + title for the active route.
- Existing form contract tests still pass.

## Testing Strategy

Backend tests: unchanged.

Frontend tests:
- Existing `dashboard-contract.test.ts` continues to pass (string presence).
- Existing `group-journey.test.ts`, `pwa-shell.test.ts`, `api-client.test.ts`, `offline-cache.test.ts` continue to pass.
- New `theme.test.ts`:
  - `tokens.css` and `recipes.css` are linked from the layout.
  - `<html>` has `data-theme="dark"` by default.
  - Token values for the locked dark palette match the spec.
- New `bottom-nav.test.ts`:
  - Renders five destinations.
  - Center Add is an accessible button.
  - Active route shows the accent background and label.
- New `header.test.ts`:
  - Renders overline + title for the active route.
- Visual snapshot test (Playwright) for the locked dashboard, envelopes, activity, reports, and settings screens at 360px viewport.

## Deployment

No backend or infrastructure changes. The new stylesheets ship with the next PWA build.

- `bun run build` continues to produce the existing Coolify-deployable bundle.
- Service worker is unchanged; the new CSS is part of the main bundle and cacheable by the existing workbox setup.
- PWA offline read-only screens inherit the new theme tokens; the dark gradient surface is more visible against stale data, so the stale-data banner is more useful, not less.

## Light Theme (deferred)

The token structure supports a light theme sibling:

```text
html[data-theme="light"] {
  --color-bg: #fbfaf8;
  --color-bg-elev-1: #fff;
  --color-bg-elev-2: #f4f2ef;
  /* etc. */
}
```

We are not implementing the light theme in this iteration. The dark theme is the source of truth, and a future change can add the light token block plus a theme switcher (Settings → Appearance → Theme, which already has placeholders for Dark / Light / Auto).

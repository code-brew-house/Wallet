# Alerts & Envelope Actions Redesign

Date: 2026-06-28
Status: Draft (pending user review)

## Overview

Refresh three sections of the wallet dashboard so they read as a coherent system:

- **Alerts**: stacked inline banners (A1), status strip + attention (A2), alert inbox drawer (A5).
- **Quick actions** (the section just above Envelope actions): B2c mid-radius square chips.
- **Envelope actions**: C2b sharp segmented control + C5d stepped bottom sheet for the recurring flow.

End state: dashboard reads top-to-bottom as **status → quick actions → form**, with quieter buttons that don't fight the page content.

Other forms (expense, fund, transfer) use a single-step slide-up sheet; only the recurring flow uses the stepped sheet.

## Goals

- **Quiet, dark-feeling primary buttons**: the current teal-on-dark pops too much. Use a deeper teal that stays in the brand family without dominating the page.
- **Reusable alert primitives**: a single `<Alert variant=...>` family that covers success / info / warn / danger and a compact mode.
- **Sheet-based forms**: replace the always-mounted tabs in `EnvelopeForms` with chips that open a bottom sheet. Keep segmented control for choosing *which* form before opening.
- **No regressions**: existing fields, validation, and mutations stay the same; only the chrome around them changes.

## Non-Goals

- No new features (no expense templates, no bulk actions, no envelope analytics).
- No redesign of the auth sheet, the bottom nav, or the dashboard header.
- No new dependencies. Keep Mantine + the existing CSS recipes.
- No changes to the API contract or the Prisma schema.

## Selected Variants

### Section A · Alerts

| ID    | Choice | Notes |
|-------|--------|-------|
| **A1** | **A1a · full banner** (icon + title + body) | Top-of-dashboard surface for ephemeral feedback (stale data, success, errors). Reuse Mantine `<Alert>` styling. |
| **A2** | **A2a · pill status strip** + A1a attention list below | Status strip shows counts ("2 overspent · 1 low · stale 6m"). The two already-attention items show as full A1a banners below the strip. |
| **A5** | **A5a · alert inbox drawer** (filter + list) | The "Attention" section on the dashboard IS the inbox, not a separate route. Filter chips (All / Overspent / Low) on top; rows below. Stale data stays on the status strip, not in the inbox. |

**Open for confirmation**: A1 → A1a, A2 → A2a. Defaulting to round-1 because the user did not specify. Easy to swap to A1b (compact) or A2b (sharp square strip) if the user prefers.

### Section B · Quick actions (above envelope actions)

**B2c · mid-radius square (6px)**.

- Primary chip (`+ Add expense`): teal-tinted background, light text, 6px corners.
- Secondary chips (`+ Fund`, `⇄ Transfer`, `↻ Recurring`): transparent background, `border-strong` border, `text` foreground, 6px corners.
- All chips are the same height; wrap to a second row on narrow screens.
- Clicking a chip opens the corresponding bottom sheet (see Section C).

Replace the existing `Group` of four `<Button>`s in `dashboard-page.tsx` with this chip row.

### Section C · Envelope actions

| ID    | Choice | Notes |
|-------|--------|-------|
| **C2** | **C2b · sharp segmented** | 6px corner radius, sits inside a 1px-bordered `bg-elev-1` container. Labels are short: `Add · Fund · Move · Plan`. |
| **C5** | **C5d · stepped sheet** (recurring) + **C5a-style single-step** (everything else) | The chip row (B2c) sets the initial form. The sheet renders that form. The recurring form uses a 3-step sheet (envelope → amount & frequency → confirm). All other forms use a single-step sheet. |

Drop the existing `<Tabs>` from `EnvelopeForms`. Replace it with a `<SegmentedControl>` (C2b) that drives which sheet variant opens. Keep all four forms in `EnvelopeForms`, but render only the selected one inside a bottom sheet rather than an always-mounted tab panel.

### Section D · Trigger flow

```
[chip] tap → [sheet slides up] → [form submit] → [sheet dismisses] →
  [status strip + alerts refresh] → [dashboard re-renders]
```

- Expense, Fund, Transfer: one-step sheet.
- Recurring: three-step sheet with Next/Back buttons. Back closes the sheet if on step 1.
- All sheets share the same chrome: handle, title, body, primary + secondary footer.

## Visual Tokens

### Darker primary button

Current `--color-accent: #2dd4bf` (bright teal) on `var(--color-bg)` is too loud. Change to a deeper teal that keeps brand identity without dominating the page.

**Proposed change** in `apps/web/src/styles/recipes.css`:

```css
--color-accent: #0d9488;          /* teal-600, was #2dd4bf */
--color-accent-border: #0f766e;   /* teal-700, was #14b8a6 */
--color-accent-text: #f0fdfa;     /* teal-50, replaces #0b0b0e dark text on bright teal */
```

The `.wallet-button-primary` rule needs to flip its text color from `#0b0b0e` to `var(--color-accent-text)` so it stays legible on the new darker background. The "Funding status" card glow (`--wallet-glow: rgba(45,212,191,0.22)`) can keep its current value; if it looks too washed out, switch to `rgba(13,148,136,0.22)`.

**Open for confirmation**: the exact hex (`#0d9488` is teal-600). Alternatives: `#0f766e` (teal-700) for an even darker, more muted look; or keep teal-600 but use `var(--color-accent-text)` for the contrast. Pick one at spec review.

### Other token decisions (no changes needed)

- Alert background/border colors: `rgba(59,130,246,0.10)` for info, etc. Keep current values from `wallet-alert-*` recipes.
- Chip radius: 6px (mid). Use a new CSS var `--radius-chip: 6px`.
- Sheet radius: 18px (top corners only). Use `--radius-lg` which already exists.
- Segmented control: 6px outer, 4px inner. Use a new CSS var `--radius-seg: 6px`.

## Components to extract

Currently the dashboard inlines everything. To support the new design, extract:

1. **`AlertBanner`** (`apps/web/src/components/alert-banner.tsx`): wraps Mantine `<Alert>` with the four wallet variants (info / success / warn / danger) and a `compact` boolean. Mirrors the existing CSS recipes. Tests in `apps/web/test/alert-banner.test.ts`.

2. **`StatusStrip`** (`apps/web/src/components/status-strip.tsx`): the A2a pill-counts strip. Takes `{ overspent, low, stale, onClickFilter }` and renders a rounded pill. Test contract test in `apps/web/test/status-strip-contract.test.ts` (checks for the count labels and dot colors).

3. **`Chip`** (`apps/web/src/components/chip.tsx`): a thin wrapper around the B2c style. `variant: 'accent' | 'ghost'`, `radius: 'mid'` constant. The full chip row in the dashboard uses a new `QuickActionChips` component.

4. **`SegmentedControl`** (`apps/web/src/components/segmented-control.tsx`): a wrapper over Mantine's `SegmentedControl` configured with C2b styling. `radius: 'sharp'`, `size: 'sm'`. Mostly a contract test; the wrapper is small.

5. **`ActionSheet`** (`apps/web/src/components/action-sheet.tsx`): a bottom sheet that renders a form inside. Backed by Mantine `Modal` (centered=false, fullScreen on mobile, sheet radius on desktop) or a new component. The sheet opens from the chip, contains one form, has Cancel + Save footer.

6. **`StepperSheet`** (`apps/web/src/components/stepper-sheet.tsx`): a sheet with a 3-step header that walks through envelope → amount & frequency → confirm. Built on top of `ActionSheet`.

7. **`AlertInboxRow`** and **`AlertInboxFilter`**: the A5a filter chips and the inbox rows. Already mostly shaped; extract into `apps/web/src/features/alerts/`.

Existing files that change:

- `apps/web/src/features/dashboard/dashboard-page.tsx`: replace the four-button row with `QuickActionChips`; replace the inline `<Alert>`s with `AlertBanner`; replace the inline Attention section with `StatusStrip` + `AlertInboxRow` list.
- `apps/web/src/features/envelopes/envelope-forms.tsx`: remove the `<Tabs>` shell, expose a `selectedForm` prop that the parent uses to drive the sheet; the form rendering moves into `ActionSheet`.
- `apps/web/src/components/header.tsx`: no change.
- `apps/web/src/styles/recipes.css`: add the new radii (`--radius-chip`, `--radius-seg`), update `--color-accent*` to the darker teal, and flip the primary button text color.

## Data flow

- `DashboardPage` already fetches `DashboardSummary` (envelopes, overspent, upcoming recurring). No new endpoints.
- Sheet submissions call the same `apiClient.request` calls the tabs use today. No API changes.
- The status strip derives from `dashboard.overspent` + a `lowBalance` filter (`balanceMinor >= 0 && balanceMinor < 1000`). The inbox row list is the same data, just rendered differently.

## Error handling

- Form errors that throw today: caught by `runMutation` and surfaced as an `<Alert color="red">`. Keep this. The new `AlertBanner` accepts the same string.
- Sheet dismissal mid-edit: keep form values until submit or explicit cancel. Escape key and backdrop click both cancel.

## Testing

Contract tests (no new logic, just structure):

- `apps/web/test/alert-banner.test.ts` — verifies the alert variants compile to the right CSS classes.
- `apps/web/test/status-strip-contract.test.ts` — checks the strip renders the three counts and the colored dots.
- `apps/web/test/quick-action-chips-contract.test.ts` — checks for B2c class names and the four labels.
- `apps/web/test/action-sheet-contract.test.ts` — checks the sheet is a `<dialog>`/Mantine `Modal` with handle, footer, and the form ID.

Source-pattern tests (existing pattern in this repo):

- `apps/web/test/dashboard-contract.test.ts` — extend to assert the four-button `<Group>` is gone and a `QuickActionChips` reference is present.
- `apps/web/test/auth-shell-contract.test.ts` — no change.

Visual regression: optional; not required for the spec.

## Out of scope

- Animations (sheet uses Mantine's defaults; no custom transitions).
- Server-side prefetch changes.
- Anything that touches the API or schema.

## Open questions for spec review

1. Confirm A1 = A1a (full banner) and A2 = A2a (pill strip). Otherwise pick A1b/A2b etc.
2. Confirm darker accent = `#0d9488` (teal-600). Otherwise pick teal-700 or another.
3. Confirm chip radius = 6px (mid). Otherwise pick 3px (sharp) or 999px (pill).
4. Confirm segmented labels = `Add · Fund · Move · Plan`. Otherwise pick `Add expense · Fund envelope · Transfer · Create recurring` (current).
5. Confirm 3-step recurring sheet. Otherwise make recurring a single-step sheet like the others.

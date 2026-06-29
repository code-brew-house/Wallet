# Form Theme Polish Design

Status: Approved for planning
Date: 2026-06-29
Scope: Web dashboard action sheets, Mantine form controls used in Wallet forms,
Quick Actions form host, and dashboard status pills.

## Problem

The dashboard action flow has several visual inconsistencies:

- Mantine `Select` dropdowns and form inputs render with light/white surfaces
  in dark Wallet screens.
- The Envelopes and Recurring section badges use Mantine `Badge` styling, which
  does not match Wallet-native `.wallet-pill` badges used elsewhere.
- Opening a Quick Action still reveals the visible `EnvelopeForms` card below
  the Quick Actions section, including the "Form" title and segmented control.
  The desired behavior is modal-only.
- The top of the Fund envelope sheet feels disconnected from the Wallet visual
  system.

## Selected Direction

Option C — **Theme bridge + branded header**.

Use a systemic styling bridge for Mantine form primitives and give action
sheets a Wallet-branded header. This is broader than a one-off patch but keeps
changes focused on form/sheet presentation.

## Goals

- Make all Wallet form controls dark-theme consistent.
- Remove the visible "Form" card below Quick Actions; Quick Actions should open
  only the modal/action sheet.
- Replace Mantine dashboard badges with Wallet-style pills.
- Make action sheet headers feel native to the Wallet design system.
- Keep the existing form submit behavior, validation, data payloads, and API
  calls unchanged.

## Non-Goals

- No backend/API changes.
- No route or navigation changes.
- No changes to auth, groups, envelopes, expenses, or recurring business logic.
- No redesign of Quick Action chip labels or order.
- No new component library or dependency.

## Design

### 1. Global Mantine form bridge

Add Wallet dark-theme styling for Mantine form controls used by the dashboard
forms:

- `TextInput`
- `Textarea`
- `Select`
- Select dropdown surface
- Select option hover/selected states
- Placeholder text
- Required asterisk
- Invalid/error state borders and helper text

The bridge must use existing Wallet CSS tokens from `tokens.css`:

- surfaces: `--color-bg`, `--color-bg-elev-1`, `--color-bg-elev-2`
- borders: `--color-border`, `--color-border-strong`
- text: `--color-text`, `--color-text-muted`, `--color-text-dim`
- accents: `--color-accent`, `--color-accent-text`, `--color-danger-text`

Implementation should prefer CSS class targeting in `recipes.css` over inline
style props. The goal is to fix all current and future Wallet form surfaces
consistently, not only the Fund envelope modal.

### 2. Branded action sheet header

Update shared action sheet chrome so Add expense, Fund envelope, Transfer, and
Recurring sheets inherit the same visual treatment:

- The sheet keeps the current modal/sheet behavior.
- The header uses a subtle Wallet gradient background based on accent/success
  glows.
- Title remains prominent.
- Description remains below the title.
- Add compact metadata pills in the header area:
  - Every action sheet shows `Wallet action`.
  - Every action sheet shows the current currency, e.g. `INR`.
  - Every sheet with an envelope selector shows `Active envelopes only`.
- Footer remains unchanged: Cancel secondary, Save primary.

The branded header should not make the modal taller than necessary. On small
screens it should remain readable and not push fields below the fold.

### 3. Modal-only Quick Actions

`EnvelopeForms` should no longer render the visible card containing:

- `Form`
- `Choose an action, then complete it in the sheet.`
- `Create an envelope before adding expenses...`
- `ActionSegmentedControl`

Quick Actions remain the only visible entry point. `EnvelopeForms` remains
mounted as sheet infrastructure and may return only the action sheets. It must
not produce visible body DOM while `openedForm === null`.

### 4. Wallet-native dashboard pills

Replace dashboard Mantine `Badge` instances for Envelopes and Recurring counts
with native `.wallet-pill` spans:

- Envelopes: `{dashboard.envelopes.filter((envelope) => !envelope.archivedAt).length} active`
- Recurring: `Next 10`

The resulting pill style should match existing `.wallet-pill` usage in invite
and report cards: rounded full radius, blue-tinted surface, accent text, compact
bold label.

### 5. Accessibility and behavior

- Labels remain associated with form inputs via Mantine's existing label/input
  structure.
- Required state remains visible.
- Error state remains visually distinct in dark mode.
- Select dropdown options remain readable and keyboard navigable.
- Modal close, cancel, submit, and loading behavior remains unchanged.
- Existing form values, validation rules, and submit payloads are unchanged.

## Component Changes

- `apps/web/src/styles/recipes.css`
  - Add Mantine form bridge styles.
  - Add branded action sheet header styles.
  - Ensure `.wallet-pill` remains the canonical badge style.
- `apps/web/src/components/action-sheet.tsx`
  - Support branded header metadata pills via an explicit `metadata?: string[]` prop.
  - Keep existing `opened`, `formId`, submit, cancel, and close contracts.
- `apps/web/src/components/stepper-sheet.tsx`
  - Match the action-sheet branded header treatment for recurring flows.
- `apps/web/src/features/envelopes/envelope-forms.tsx`
  - Remove visible `Card`, `Stack`, `Text`, and `ActionSegmentedControl`
    presentation from returned markup.
  - Keep the four forms and sheet components mounted.
  - Pass header metadata to action/stepper sheets.
- `apps/web/src/features/dashboard/dashboard-page.tsx`
  - Replace Mantine `Badge` import and usage with `.wallet-pill` spans.
  - Keep `QuickActionChips` as the only visible action launcher.
- `apps/web/test/dashboard-contract.test.ts`
  - Assert the visible `Form` card/segmented control is gone from dashboard
    action rendering.
  - Assert `.wallet-pill` is used for dashboard count pills.
- `apps/web/test/action-sheet-contract.test.ts`
  - Assert branded header classes and metadata pill support.
- `apps/web/test/theme-contract.test.ts`
  - Assert Mantine form bridge selectors exist for inputs, textareas, selects,
    dropdowns, options, placeholder, required, and invalid states.

## Testing

Use contract tests because the current web test suite verifies visual system
contracts by reading source/CSS.

Required tests:

1. `dashboard-contract.test.ts`
   - Fails before implementation because `dashboard-page.tsx` imports/uses
     Mantine `Badge` and because `EnvelopeForms` still renders the visible
     `Form` card.
   - Passes when dashboard count pills use `.wallet-pill` and the visible form
     section is gone.

2. `action-sheet-contract.test.ts`
   - Fails before implementation because action sheets do not support branded
     header metadata.
   - Passes when shared action sheets expose branded header classes and render
     metadata pills.

3. `theme-contract.test.ts`
   - Fails before implementation because dark Mantine form/dropdown selectors
     are missing.
   - Passes when `recipes.css` contains the Wallet form bridge selectors.

Verification:

- `bun test apps/web/test/dashboard-contract.test.ts`
- `bun test apps/web/test/action-sheet-contract.test.ts`
- `bun test apps/web/test/theme-contract.test.ts`
- `bun test apps/web/test/`
- `bun run --filter @wallet/web typecheck`

## Acceptance Criteria

- Dropdown menus no longer appear white in dark Wallet forms.
- Inputs, select controls, dropdowns, and textarea surfaces use Wallet dark
  tokens.
- Dashboard `Active`/`Next 10` badges visually match `.wallet-pill`.
- Clicking Quick Actions opens only the modal/action sheet; no "Form" card is
  shown below Quick Actions.
- Fund envelope modal header uses the approved branded treatment.
- Existing form submissions and validations keep working.

# Alerts & Envelope Actions Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the wallet dashboard alerts, quick actions, and envelope-action forms so the page reads as status → quick actions → form/inbox using the approved A1a/A2a/A5a/B2c/C2b/C5a+C5d direction.

**Architecture:** Keep the existing dashboard data flow and API calls. Extract visual primitives into focused client components, then replace the dashboard’s inline Mantine `Alert`, button row, tabs, and attention table with those primitives. CSS recipes own all visual decisions: flat alert-family buttons with lighter borders, no glass/gradient/blur/shadow on buttons.

**Tech Stack:** Next.js app router, React client components, Mantine core/form, Bun tests, CSS recipe classes in `apps/web/src/styles/recipes.css`.

## Global Constraints

- No new dependencies.
- No API contract changes.
- No Prisma schema changes.
- Existing form fields, validation, mutation payloads, and success/error handling stay the same.
- Buttons keep existing formatting: padding, rounded rectangle, border, font weight, min-height, and placement.
- Buttons use flat alert-family fills with lighter borders; no glass, gradient, blur, inset highlight, or shadow.
- A1 = full alert banner, A2 = pill status strip, A5 = alert inbox drawer, B2 = mid-radius chips, C2 = sharp segmented control, C5 = stepped recurring sheet plus one-step sheets for other forms.
- Run only affected web tests and typecheck unless implementation touches other packages.

---

## File Structure

- Modify: `apps/web/src/styles/tokens.css`
  - Add approved button tokens and radii: `--button-*`, `--radius-chip`, `--radius-seg`.
- Modify: `apps/web/src/styles/recipes.css`
  - Map `.wallet-button-*` to flat alert-family button colors.
  - Add classes for alert banners, status strip, quick-action chips, segmented action control, action sheets, stepper sheets, and alert inbox rows.
- Create: `apps/web/src/components/alert-banner.tsx`
  - Wallet alert primitive for `info | success | warn | danger` with optional title and compact mode.
- Create: `apps/web/src/components/status-strip.tsx`
  - A2a pill-count status strip.
- Create: `apps/web/src/components/quick-action-chips.tsx`
  - B2c chip row for expense/funding/transfer/recurring entry points.
- Create: `apps/web/src/components/action-segmented-control.tsx`
  - C2b short-label segmented control.
- Create: `apps/web/src/components/action-sheet.tsx`
  - Shared one-step bottom sheet chrome.
- Create: `apps/web/src/components/stepper-sheet.tsx`
  - Three-step recurring sheet chrome.
- Create: `apps/web/src/features/alerts/alert-inbox.tsx`
  - A5a alert inbox filter + rows.
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`
  - Remove always-mounted tabs and expose form rendering through sheets.
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx`
  - Replace inline alert/button/attention/form layout with extracted primitives.
- Modify/Add tests under `apps/web/test/*.test.ts`
  - Contract tests for source structure and CSS class decisions.

---

### Task 1: Lock Visual Tokens And Button Recipes

**Files:**
- Modify: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/src/styles/recipes.css`
- Test: `apps/web/test/theme-contract.test.ts`

**Interfaces:**
- Consumes: existing `.wallet-button-primary` and `.wallet-button-secondary` class usage.
- Produces: reusable CSS variables and classes used by all later component tasks.

- [ ] **Step 1: Write the failing token contract test**

Update `apps/web/test/theme-contract.test.ts` with a test that reads `tokens.css` and `recipes.css`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('theme contract', () => {
  test('defines approved flat alert-family button tokens', () => {
    const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(tokens).toContain('--button-primary-bg: #1e3a8a;');
    expect(tokens).toContain('--button-primary-border: rgba(147, 197, 253, 0.52);');
    expect(tokens).toContain('--button-primary-text: #dbeafe;');
    expect(tokens).toContain('--button-success-bg: #14532d;');
    expect(tokens).toContain('--button-warn-bg: #78350f;');
    expect(tokens).toContain('--button-danger-bg: #7f1d1d;');
    expect(tokens).toContain('--radius-chip: 6px;');
    expect(tokens).toContain('--radius-seg: 6px;');

    expect(recipes).toContain('background: var(--button-primary-bg);');
    expect(recipes).toContain('border: 1px solid var(--button-primary-border);');
    expect(recipes).not.toContain('backdrop-filter: blur(10px)');
    expect(recipes).not.toContain('inset 0 1px 0');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun test test/theme-contract.test.ts` from `apps/web`.

Expected: FAIL because `--button-primary-bg`, `--radius-chip`, and `--radius-seg` are not defined yet.

- [ ] **Step 3: Add tokens**

Add these lines inside the dark root block in `apps/web/src/styles/tokens.css`, after `--color-info-text`:

```css
  --button-primary-bg: #1e3a8a;
  --button-primary-border: rgba(147, 197, 253, 0.52);
  --button-primary-text: #dbeafe;
  --button-success-bg: #14532d;
  --button-success-border: rgba(134, 239, 172, 0.48);
  --button-success-text: #d1fae5;
  --button-warn-bg: #78350f;
  --button-warn-border: rgba(253, 230, 138, 0.48);
  --button-warn-text: #fef3c7;
  --button-danger-bg: #7f1d1d;
  --button-danger-border: rgba(252, 165, 165, 0.5);
  --button-danger-text: #fee2e2;
  --button-secondary-bg: transparent;
  --button-secondary-border: rgba(179, 179, 194, 0.36);
  --button-secondary-text: var(--color-text);
  --radius-chip: 6px;
  --radius-seg: 6px;
```

Do not add light-theme overrides for these tokens in this task.

- [ ] **Step 4: Update button recipes**

Replace `.wallet-button-primary` and `.wallet-button-secondary` in `apps/web/src/styles/recipes.css` with:

```css
.wallet-button-primary,
.wallet-button-success,
.wallet-button-warn,
.wallet-button-danger,
.wallet-button-secondary {
  border-radius: var(--radius-md);
  padding: 9px 14px;
  min-height: 36px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.wallet-button-primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: 1px solid var(--button-primary-border);
}

.wallet-button-success {
  background: var(--button-success-bg);
  color: var(--button-success-text);
  border: 1px solid var(--button-success-border);
}

.wallet-button-warn {
  background: var(--button-warn-bg);
  color: var(--button-warn-text);
  border: 1px solid var(--button-warn-border);
}

.wallet-button-danger {
  background: var(--button-danger-bg);
  color: var(--button-danger-text);
  border: 1px solid var(--button-danger-border);
}

.wallet-button-secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--button-secondary-border);
  font-weight: 600;
}
```

Do not add `box-shadow`, `background: linear-gradient(...)`, or `backdrop-filter` to these button classes.

- [ ] **Step 5: Run token test**

Run: `bun test test/theme-contract.test.ts` from `apps/web`.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/styles/tokens.css apps/web/src/styles/recipes.css apps/web/test/theme-contract.test.ts
git commit -m "style: add alert-family button tokens"
```

---

### Task 2: Extract Alert Banner And Status Strip

**Files:**
- Create: `apps/web/src/components/alert-banner.tsx`
- Create: `apps/web/src/components/status-strip.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Create: `apps/web/test/alert-banner.test.ts`
- Create: `apps/web/test/status-strip-contract.test.ts`

**Interfaces:**
- Produces: `AlertBanner`, `StatusStrip`.
- Later tasks consume these components in `dashboard-page.tsx`.

- [ ] **Step 1: Write failing alert/status tests**

Create `apps/web/test/alert-banner.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('alert banner contract', () => {
  test('exports alert variants and compact mode with wallet classes', () => {
    const source = readFileSync(new URL('../src/components/alert-banner.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(source).toContain("export type AlertBannerVariant = 'info' | 'success' | 'warn' | 'danger';");
    expect(source).toContain('compact?: boolean;');
    expect(source).toContain('wallet-alert-banner');
    expect(source).toContain('wallet-alert-banner-compact');
    expect(source).toContain('wallet-alert-banner-icon');
    expect(recipes).toContain('.wallet-alert-banner');
    expect(recipes).toContain('.wallet-alert-banner-success');
    expect(recipes).toContain('.wallet-alert-banner-warn');
    expect(recipes).toContain('.wallet-alert-banner-danger');
  });
});
```

Create `apps/web/test/status-strip-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('status strip contract', () => {
  test('renders overspent low and stale status pills', () => {
    const source = readFileSync(new URL('../src/components/status-strip.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(source).toContain('export interface StatusStripProps');
    expect(source).toContain('overspentCount: number;');
    expect(source).toContain('lowBalanceCount: number;');
    expect(source).toContain('staleLabel?: string;');
    expect(source).toContain('wallet-status-strip');
    expect(source).toContain('wallet-status-strip-dot wallet-status-danger');
    expect(source).toContain('wallet-status-strip-dot wallet-status-warn');
    expect(source).toContain('wallet-status-strip-dot wallet-status-info');
    expect(recipes).toContain('.wallet-status-strip');
    expect(recipes).toContain('.wallet-status-strip-dot');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `bun test test/alert-banner.test.ts test/status-strip-contract.test.ts` from `apps/web`.

Expected: FAIL because the new component files do not exist.

- [ ] **Step 3: Create `AlertBanner`**

Create `apps/web/src/components/alert-banner.tsx`:

```tsx
import type { ReactNode } from 'react';

export type AlertBannerVariant = 'info' | 'success' | 'warn' | 'danger';

const variantIcon: Record<AlertBannerVariant, string> = {
  info: 'i',
  success: '✓',
  warn: '!',
  danger: '!',
};

export interface AlertBannerProps {
  variant?: AlertBannerVariant;
  title?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}

export function AlertBanner({ variant = 'info', title, children, compact = false }: AlertBannerProps) {
  return (
    <div className={`wallet-alert-banner wallet-alert-banner-${variant} ${compact ? 'wallet-alert-banner-compact' : ''}`.trim()} role="status">
      <span className="wallet-alert-banner-icon" aria-hidden="true">{variantIcon[variant]}</span>
      <div className="wallet-alert-banner-body">
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `StatusStrip`**

Create `apps/web/src/components/status-strip.tsx`:

```tsx
export interface StatusStripProps {
  overspentCount: number;
  lowBalanceCount: number;
  staleLabel?: string;
}

export function StatusStrip({ overspentCount, lowBalanceCount, staleLabel }: StatusStripProps) {
  return (
    <div className="wallet-status-strip" aria-label="Dashboard status summary">
      <span className="wallet-status-strip-item">
        <span className="wallet-status-strip-dot wallet-status-danger" aria-hidden="true" />
        {overspentCount} overspent
      </span>
      <span className="wallet-status-strip-item">
        <span className="wallet-status-strip-dot wallet-status-warn" aria-hidden="true" />
        {lowBalanceCount} low
      </span>
      {staleLabel ? (
        <span className="wallet-status-strip-item wallet-status-strip-stale">
          <span className="wallet-status-strip-dot wallet-status-info" aria-hidden="true" />
          {staleLabel}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Add alert/status CSS**

Append to `apps/web/src/styles/recipes.css` near existing `.wallet-alert` styles:

```css
.wallet-alert-banner {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--color-info-text);
}

.wallet-alert-banner-success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: var(--color-success-text);
}

.wallet-alert-banner-warn {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--color-warn-text);
}

.wallet-alert-banner-danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger-text);
}

.wallet-alert-banner-compact {
  padding: var(--space-3);
}

.wallet-alert-banner-icon {
  display: grid;
  place-items: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: rgba(59, 130, 246, 0.25);
  font-size: 12px;
  font-weight: 800;
}

.wallet-alert-banner-success .wallet-alert-banner-icon { background: rgba(34, 197, 94, 0.25); }
.wallet-alert-banner-warn .wallet-alert-banner-icon { background: rgba(245, 158, 11, 0.25); }
.wallet-alert-banner-danger .wallet-alert-banner-icon { background: rgba(239, 68, 68, 0.25); }

.wallet-alert-banner-body {
  display: grid;
  gap: 2px;
  font-size: var(--text-caption-size);
  line-height: var(--text-caption-line);
}

.wallet-status-strip {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: fit-content;
  max-width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: rgba(14, 14, 16, 0.5);
  color: var(--color-text-muted);
  font-size: var(--text-caption-size);
  overflow-x: auto;
}

.wallet-status-strip-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}

.wallet-status-strip-stale {
  margin-left: auto;
}

.wallet-status-strip-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test test/alert-banner.test.ts test/status-strip-contract.test.ts` from `apps/web`.

Expected: PASS.

Run: `bun run typecheck` from `apps/web`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/alert-banner.tsx apps/web/src/components/status-strip.tsx apps/web/src/styles/recipes.css apps/web/test/alert-banner.test.ts apps/web/test/status-strip-contract.test.ts
git commit -m "feat: add alert banner and status strip primitives"
```

---

### Task 3: Extract Quick Action Chips And Segmented Control

**Files:**
- Create: `apps/web/src/components/quick-action-chips.tsx`
- Create: `apps/web/src/components/action-segmented-control.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Create: `apps/web/test/quick-action-chips-contract.test.ts`

**Interfaces:**
- Consumes: `FormKind` from `apps/web/src/features/envelopes/envelope-forms.tsx`.
- Produces: `QuickActionChips`, `ActionSegmentedControl` for dashboard and sheet tasks.

- [ ] **Step 1: Write failing contract test**

Create `apps/web/test/quick-action-chips-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('quick action chips contract', () => {
  test('defines B2c chips and C2b segmented labels', () => {
    const chips = readFileSync(new URL('../src/components/quick-action-chips.tsx', import.meta.url), 'utf8');
    const segmented = readFileSync(new URL('../src/components/action-segmented-control.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(chips).toContain("import type { FormKind } from '../features/envelopes/envelope-forms';");
    expect(chips).toContain('wallet-quick-actions');
    expect(chips).toContain('wallet-chip-primary');
    expect(chips).toContain('Add expense');
    expect(chips).toContain('Fund');
    expect(chips).toContain('Transfer');
    expect(chips).toContain('Recurring');

    expect(segmented).toContain('ActionSegmentedControl');
    expect(segmented).toContain("label: 'Add'");
    expect(segmented).toContain("label: 'Fund'");
    expect(segmented).toContain("label: 'Move'");
    expect(segmented).toContain("label: 'Plan'");

    expect(recipes).toContain('.wallet-quick-actions');
    expect(recipes).toContain('.wallet-chip');
    expect(recipes).toContain('border-radius: var(--radius-chip);');
    expect(recipes).toContain('.wallet-action-segmented');
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test test/quick-action-chips-contract.test.ts` from `apps/web`.

Expected: FAIL because component files do not exist.

- [ ] **Step 3: Create `QuickActionChips`**

Create `apps/web/src/components/quick-action-chips.tsx`:

```tsx
import type { FormKind } from '../features/envelopes/envelope-forms';

interface QuickActionChipsProps {
  onSelect(form: FormKind): void;
}

const actions: Array<{ form: FormKind; label: string; primary?: boolean }> = [
  { form: 'expense', label: '+ Add expense', primary: true },
  { form: 'funding', label: '+ Fund' },
  { form: 'transfer', label: '⇄ Transfer' },
  { form: 'recurring', label: '↻ Recurring' },
];

export function QuickActionChips({ onSelect }: QuickActionChipsProps) {
  return (
    <div className="wallet-quick-actions" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.form}
          type="button"
          className={`wallet-chip ${action.primary ? 'wallet-chip-primary' : 'wallet-chip-secondary'}`}
          onClick={() => onSelect(action.form)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `ActionSegmentedControl`**

Create `apps/web/src/components/action-segmented-control.tsx`:

```tsx
import { SegmentedControl } from '@mantine/core';
import type { FormKind } from '../features/envelopes/envelope-forms';

interface ActionSegmentedControlProps {
  value: FormKind;
  onChange(value: FormKind): void;
}

const data: Array<{ value: FormKind; label: string }> = [
  { value: 'expense', label: 'Add' },
  { value: 'funding', label: 'Fund' },
  { value: 'transfer', label: 'Move' },
  { value: 'recurring', label: 'Plan' },
];

export function ActionSegmentedControl({ value, onChange }: ActionSegmentedControlProps) {
  return (
    <SegmentedControl
      className="wallet-action-segmented"
      value={value}
      onChange={(nextValue) => onChange(nextValue as FormKind)}
      data={data}
      fullWidth
    />
  );
}
```

- [ ] **Step 5: Add chip and segmented CSS**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.wallet-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 7px 11px;
  border-radius: var(--radius-chip);
  font: 700 12px var(--font-sans);
  line-height: 1;
  cursor: pointer;
}

.wallet-chip-primary {
  background: rgba(30, 58, 138, 0.72);
  color: var(--button-primary-text);
  border: 1px solid var(--button-primary-border);
}

.wallet-chip-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
}

.wallet-action-segmented {
  width: 100%;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-seg);
  background: rgba(14, 14, 16, 0.5);
}

.wallet-action-segmented .mantine-SegmentedControl-control {
  border-radius: var(--radius-xs);
}

.wallet-action-segmented .mantine-SegmentedControl-label {
  color: var(--color-text-muted);
  font-size: var(--text-caption-size);
  font-weight: 700;
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test test/quick-action-chips-contract.test.ts` from `apps/web`.

Expected: PASS.

Run: `bun run typecheck` from `apps/web`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/quick-action-chips.tsx apps/web/src/components/action-segmented-control.tsx apps/web/src/styles/recipes.css apps/web/test/quick-action-chips-contract.test.ts
git commit -m "feat: add quick action chips"
```

---

### Task 4: Add Action Sheet And Stepper Sheet Chrome

**Files:**
- Create: `apps/web/src/components/action-sheet.tsx`
- Create: `apps/web/src/components/stepper-sheet.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Create: `apps/web/test/action-sheet-contract.test.ts`

**Interfaces:**
- Produces: `ActionSheet` and `StepperSheet`.
- Later task consumes them inside `EnvelopeForms`.

- [ ] **Step 1: Write failing sheet contract test**

Create `apps/web/test/action-sheet-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('action sheet contract', () => {
  test('defines shared sheet chrome and stepped recurring sheet', () => {
    const actionSheet = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
    const stepperSheet = readFileSync(new URL('../src/components/stepper-sheet.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(actionSheet).toContain('export interface ActionSheetProps');
    expect(actionSheet).toContain('formId: string;');
    expect(actionSheet).toContain('wallet-sheet-handle');
    expect(actionSheet).toContain('wallet-action-sheet');
    expect(actionSheet).toContain('wallet-button-secondary');
    expect(actionSheet).toContain('wallet-button-primary');

    expect(stepperSheet).toContain('export interface StepperSheetProps');
    expect(stepperSheet).toContain('currentStep: number;');
    expect(stepperSheet).toContain('wallet-stepper-sheet-progress');
    expect(stepperSheet).toContain('Next');
    expect(stepperSheet).toContain('Back');

    expect(recipes).toContain('.wallet-action-sheet');
    expect(recipes).toContain('.wallet-stepper-sheet-progress');
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test test/action-sheet-contract.test.ts` from `apps/web`.

Expected: FAIL because component files do not exist.

- [ ] **Step 3: Create `ActionSheet`**

Create `apps/web/src/components/action-sheet.tsx`:

```tsx
import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface ActionSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  formId: string;
  submitLabel: string;
  submitClassName?: string;
  submitting?: boolean;
  onClose(): void;
  children: ReactNode;
}

export function ActionSheet({ opened, title, description, formId, submitLabel, submitClassName = 'wallet-button-primary', submitting = false, onClose, children }: ActionSheetProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={formId} className={submitClassName} loading={submitting}>{submitLabel}</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create `StepperSheet`**

Create `apps/web/src/components/stepper-sheet.tsx`:

```tsx
import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface StepperSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  submitting?: boolean;
  onBack(): void;
  onNext(): void;
  onClose(): void;
  onSubmit(): void;
  children: ReactNode;
}

export function StepperSheet({ opened, title, description, currentStep, totalSteps, canGoNext, submitting = false, onBack, onNext, onClose, onSubmit, children }: StepperSheetProps) {
  const isFinalStep = currentStep === totalSteps;

  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="wallet-stepper-sheet-progress" aria-label={`Step ${currentStep} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <span key={index} className={index + 1 <= currentStep ? 'wallet-stepper-dot wallet-stepper-dot-active' : 'wallet-stepper-dot'} />
        ))}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={currentStep === 1 ? onClose : onBack}>Back</Button>
        <Button type="button" className="wallet-button-primary" loading={submitting} disabled={!canGoNext} onClick={isFinalStep ? onSubmit : onNext}>
          {isFinalStep ? 'Create recurring' : 'Next'}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Add sheet CSS**

Append to `apps/web/src/styles/recipes.css` near existing sheet classes:

```css
.wallet-action-sheet {
  background: linear-gradient(180deg, var(--color-bg-elev-2), var(--color-bg-elev-1));
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  color: var(--color-text);
}

.wallet-action-sheet-body {
  padding: 0;
}

.wallet-action-sheet-content {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.wallet-stepper-sheet-progress {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5) 0;
}

.wallet-stepper-dot {
  width: 24px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
}

.wallet-stepper-dot-active {
  background: var(--button-primary-bg);
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test test/action-sheet-contract.test.ts` from `apps/web`.

Expected: PASS.

Run: `bun run typecheck` from `apps/web`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/action-sheet.tsx apps/web/src/components/stepper-sheet.tsx apps/web/src/styles/recipes.css apps/web/test/action-sheet-contract.test.ts
git commit -m "feat: add action sheet chrome"
```

---

### Task 5: Convert Envelope Forms To Sheets

**Files:**
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`
- Modify: `apps/web/test/dashboard-contract.test.ts`

**Interfaces:**
- Consumes: `ActionSegmentedControl`, `ActionSheet`, `StepperSheet`.
- Produces: `EnvelopeForms` with `openedForm`, `onCloseForm`, and one-step/stepped sheet behavior.

- [ ] **Step 1: Write failing dashboard contract changes**

In `apps/web/test/dashboard-contract.test.ts`, replace the expectations that require `<Tabs>` with sheet expectations:

```ts
  test('primary dashboard CTAs open action sheets instead of mounted tabs', () => {
    const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const envelopeFormsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

    expect(dashboardSource).toContain("const [selectedForm, setSelectedForm] = useState<FormKind>('expense');");
    expect(dashboardSource).toContain("const [openedForm, setOpenedForm] = useState<FormKind | null>(null);");
    expect(dashboardSource).toContain('<QuickActionChips onSelect={openDashboardForm} />');
    expect(dashboardSource).toContain('openedForm={openedForm}');
    expect(dashboardSource).toContain('onCloseForm={() => setOpenedForm(null)}');

    expect(envelopeFormsSource).toContain('openedForm: FormKind | null;');
    expect(envelopeFormsSource).toContain('onCloseForm(): void;');
    expect(envelopeFormsSource).toContain('<ActionSegmentedControl');
    expect(envelopeFormsSource).toContain('<ActionSheet');
    expect(envelopeFormsSource).toContain('<StepperSheet');
    expect(envelopeFormsSource).not.toContain('<Tabs value={selectedForm}');
  });
```

Keep the existing assertions for `id="expense-form"`, `id="funding-form"`, `id="transfer-form"`, and `id="recurring-form"`.

- [ ] **Step 2: Run failing test**

Run: `bun test test/dashboard-contract.test.ts` from `apps/web`.

Expected: FAIL because `EnvelopeForms` still renders tabs and `dashboard-page.tsx` does not track `openedForm`.

- [ ] **Step 3: Update imports and props**

In `apps/web/src/features/envelopes/envelope-forms.tsx`:

- Remove `Tabs` from the Mantine import.
- Add imports:

```tsx
import { ActionSegmentedControl } from '../../components/action-segmented-control';
import { ActionSheet } from '../../components/action-sheet';
import { StepperSheet } from '../../components/stepper-sheet';
```

Extend `EnvelopeFormsProps`:

```tsx
  openedForm: FormKind | null;
  onCloseForm(): void;
```

Update the component signature:

```tsx
export function EnvelopeForms({ envelopes, currency, selectedForm, onSelectedFormChange, openedForm, onCloseForm, onAddExpense, onFundEnvelope, onTransfer, onCreateRecurring }: EnvelopeFormsProps) {
```

- [ ] **Step 4: Add recurring step state**

Inside `EnvelopeForms`, after `submittingForm` state:

```tsx
  const [recurringStep, setRecurringStep] = useState(1);
```

Add effect to reset recurring step when the recurring sheet closes:

```tsx
  useEffect(() => {
    if (openedForm !== 'recurring') setRecurringStep(1);
  }, [openedForm]);
```

- [ ] **Step 5: Close sheets after successful submit**

In each submit function, after the form reset succeeds, call `onCloseForm()`.

For `submitExpense`, after `expenseForm.setValues(...)`:

```tsx
      onCloseForm();
```

Repeat after the successful resets in `submitFunding`, `submitTransfer`, and `submitRecurring`.

- [ ] **Step 6: Replace tabs JSX with segmented control and sheets**

Replace the current `<Card ...>` return body with this structure:

```tsx
  return (
    <Card className="wallet-input-shell" withBorder radius="lg" padding="lg" id="dashboard-actions">
      <Stack gap="md">
        <div>
          <Text fw={700}>Form</Text>
          <Text size="sm" c="dimmed">Choose an action, then complete it in the sheet.</Text>
        </div>
        {!hasEnvelopes ? <Text c="dimmed">Create an envelope before adding expenses, funding, transfers, or recurring plans.</Text> : null}
        <ActionSegmentedControl value={selectedForm} onChange={onSelectedFormChange} />
      </Stack>

      <ActionSheet opened={openedForm === 'expense'} title="Add expense" description={`Amounts are entered in ${currency} and saved in minor units.`} formId="expense-form" submitLabel="Save" submitting={submittingForm === 'expense'} onClose={onCloseForm}>
        <form onSubmit={expenseForm.onSubmit(submitExpense)} id="expense-form">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...expenseForm.getInputProps('envelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...expenseForm.getInputProps('amount')} />
            <TextInput label="Spent on" type="date" required {...expenseForm.getInputProps('spentAt')} />
            <TextInput label="Title" required {...expenseForm.getInputProps('title')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...expenseForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <ActionSheet opened={openedForm === 'funding'} title="Fund envelope" description={`Amounts are entered in ${currency} and saved in minor units.`} formId="funding-form" submitLabel="Save" submitClassName="wallet-button-success" submitting={submittingForm === 'funding'} onClose={onCloseForm}>
        <form onSubmit={fundingForm.onSubmit(submitFunding)} id="funding-form">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...fundingForm.getInputProps('envelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...fundingForm.getInputProps('amount')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...fundingForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <ActionSheet opened={openedForm === 'transfer'} title="Transfer" description={`Amounts are entered in ${currency} and saved in minor units.`} formId="transfer-form" submitLabel="Save" submitting={submittingForm === 'transfer'} onClose={onCloseForm}>
        <form onSubmit={transferForm.onSubmit(submitTransfer)} id="transfer-form">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Select label="From" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('fromEnvelopeId')} />
            <Select label="To" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('toEnvelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...transferForm.getInputProps('amount')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...transferForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <StepperSheet
        opened={openedForm === 'recurring'}
        title="Create recurring"
        description={`Amounts are entered in ${currency} and saved in minor units.`}
        currentStep={recurringStep}
        totalSteps={3}
        canGoNext={hasEnvelopes}
        submitting={submittingForm === 'recurring'}
        onBack={() => setRecurringStep((step) => Math.max(1, step - 1))}
        onNext={() => setRecurringStep((step) => Math.min(3, step + 1))}
        onClose={onCloseForm}
        onSubmit={() => recurringForm.onSubmit(submitRecurring)()}
      >
        <form onSubmit={recurringForm.onSubmit(submitRecurring)} id="recurring-form">
          {recurringStep === 1 ? (
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...recurringForm.getInputProps('envelopeId')} />
          ) : null}
          {recurringStep === 2 ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Amount" inputMode="decimal" required {...recurringForm.getInputProps('amount')} />
              <Select
                label="Frequency"
                data={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
                allowDeselect={false}
                required
                {...recurringForm.getInputProps('frequency')}
              />
              <TextInput label="Next due date" type="date" required {...recurringForm.getInputProps('nextDueAt')} />
            </SimpleGrid>
          ) : null}
          {recurringStep === 3 ? (
            <>
              <TextInput label="Title" required {...recurringForm.getInputProps('title')} />
              <Textarea mt="md" label="Note" autosize minRows={2} {...recurringForm.getInputProps('note')} />
            </>
          ) : null}
        </form>
      </StepperSheet>
    </Card>
  );
```

Do not change field names, validation functions, form IDs, or mutation payload builders.

- [ ] **Step 7: Run tests and typecheck**

Run: `bun test test/dashboard-contract.test.ts test/action-sheet-contract.test.ts` from `apps/web`.

Expected: PASS.

Run: `bun run typecheck` from `apps/web`.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/envelopes/envelope-forms.tsx apps/web/test/dashboard-contract.test.ts
git commit -m "feat: move envelope actions into sheets"
```

---

### Task 6: Add Alert Inbox And Wire Dashboard Layout

**Files:**
- Create: `apps/web/src/features/alerts/alert-inbox.tsx`
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Modify: `apps/web/test/dashboard-contract.test.ts`

**Interfaces:**
- Consumes: `AlertBanner`, `StatusStrip`, `QuickActionChips`, updated `EnvelopeForms`.
- Produces: final dashboard composition.

- [ ] **Step 1: Write failing dashboard composition assertions**

Extend `apps/web/test/dashboard-contract.test.ts`:

```ts
  test('dashboard composes approved alerts actions and inbox primitives', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const inboxSource = readFileSync(new URL('../src/features/alerts/alert-inbox.tsx', import.meta.url), 'utf8');

    expect(source).toContain("import { AlertBanner } from '../../components/alert-banner';");
    expect(source).toContain("import { StatusStrip } from '../../components/status-strip';");
    expect(source).toContain("import { QuickActionChips } from '../../components/quick-action-chips';");
    expect(source).toContain("import { AlertInbox } from '../alerts/alert-inbox';");
    expect(source).toContain('<StatusStrip');
    expect(source).toContain('<QuickActionChips onSelect={openDashboardForm} />');
    expect(source).toContain('<AlertInbox');
    expect(source).not.toContain('<AttentionArea');

    expect(inboxSource).toContain('export function AlertInbox');
    expect(inboxSource).toContain('wallet-alert-inbox');
    expect(inboxSource).toContain('All');
    expect(inboxSource).toContain('Overspent');
    expect(inboxSource).toContain('Low');
  });
```

- [ ] **Step 2: Run failing test**

Run: `bun test test/dashboard-contract.test.ts` from `apps/web`.

Expected: FAIL because dashboard has not been rewired and `alert-inbox.tsx` does not exist.

- [ ] **Step 3: Create `AlertInbox`**

Create `apps/web/src/features/alerts/alert-inbox.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { EnvelopeSummary } from '../dashboard/types';

type InboxFilter = 'all' | 'overspent' | 'low';

interface AlertInboxProps {
  overspent: EnvelopeSummary[];
  lowBalance: EnvelopeSummary[];
  currency: string;
}

export function AlertInbox({ overspent, lowBalance, currency }: AlertInboxProps) {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency }), [currency]);
  const rows = [
    ...overspent.map((envelope) => ({ type: 'overspent' as const, envelope })),
    ...lowBalance.map((envelope) => ({ type: 'low' as const, envelope })),
  ].filter((row) => filter === 'all' || row.type === filter);

  return (
    <section className="wallet-section">
      <div className="wallet-section-heading">
        <div>
          <div className="wallet-overline">Attention inbox</div>
          <h2>Needs review</h2>
        </div>
      </div>
      <div className="wallet-alert-inbox">
        <div className="wallet-alert-inbox-filters" aria-label="Alert filters">
          <button type="button" className={filter === 'all' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('all')}>All · {overspent.length + lowBalance.length}</button>
          <button type="button" className={filter === 'overspent' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('overspent')}>Overspent · {overspent.length}</button>
          <button type="button" className={filter === 'low' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('low')}>Low · {lowBalance.length}</button>
        </div>
        {rows.length === 0 ? <p className="wallet-muted">All healthy.</p> : null}
        {rows.map(({ type, envelope }) => (
          <article key={`${type}-${envelope.id}`} className="wallet-alert-inbox-row">
            <span className={type === 'overspent' ? 'wallet-status-dot wallet-status-danger' : 'wallet-status-dot wallet-status-warn'} aria-hidden="true" />
            <div>
              <strong>{envelope.name}</strong>
              <div className="wallet-muted">{type === 'overspent' ? 'Overspent' : 'Low balance'}</div>
            </div>
            <strong>{moneyFormatter.format(envelope.balanceMinor / 100)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update dashboard imports and state**

In `apps/web/src/features/dashboard/dashboard-page.tsx`:

- Remove unused `Alert` from the Mantine import after replacing alerts.
- Add imports:

```tsx
import { AlertBanner } from '../../components/alert-banner';
import { StatusStrip } from '../../components/status-strip';
import { QuickActionChips } from '../../components/quick-action-chips';
import { AlertInbox } from '../alerts/alert-inbox';
```

Add state next to `selectedForm`:

```tsx
  const [openedForm, setOpenedForm] = useState<FormKind | null>(null);
```

Replace `focusDashboardForm` with:

```tsx
  function openDashboardForm(form: FormKind) {
    setSelectedForm(form);
    setOpenedForm(form);
  }
```

Remove `dashboardFormIds`, `pendingFocusForm`, and the scroll/focus effect.

- [ ] **Step 5: Replace dashboard alert/action/form composition**

Replace the three inline alert lines:

```tsx
        {inviteUrl ? <Alert color="teal" title="Invite action ready">Share this invite link: {inviteUrl}</Alert> : null}
        {actionMessage ? <Alert color="green">{actionMessage}</Alert> : null}
        {error ? <Alert color="red">{error}</Alert> : null}
```

with:

```tsx
        {inviteUrl ? <AlertBanner variant="info" title="Invite action ready">Share this invite link: {inviteUrl}</AlertBanner> : null}
        {actionMessage ? <AlertBanner variant="success">{actionMessage}</AlertBanner> : null}
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
```

Inside the loaded dashboard branch, replace the old button `<Group>` with:

```tsx
            <StatusStrip overspentCount={dashboard.overspent.length} lowBalanceCount={lowBalanceEnvelopes.length} staleLabel="stale 6m" />

            <section className="wallet-section">
              <div className="wallet-section-heading">
                <div>
                  <div className="wallet-overline">Quick actions</div>
                  <h2>Add expense · Fund · Transfer · Recurring</h2>
                </div>
              </div>
              <QuickActionChips onSelect={openDashboardForm} />
            </section>
```

Update the `EnvelopeForms` call to include:

```tsx
              openedForm={openedForm}
              onCloseForm={() => setOpenedForm(null)}
```

Replace `AttentionArea ...` with:

```tsx
            <AlertInbox overspent={dashboard.overspent} lowBalance={lowBalanceEnvelopes} currency={currency} />
```

Remove the now-unused `AttentionArea` function.

- [ ] **Step 6: Add inbox CSS**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-alert-inbox {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-elev-1);
}

.wallet-alert-inbox-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.wallet-alert-inbox-filter {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  padding: 5px 9px;
  font: 700 11px var(--font-sans);
}

.wallet-alert-inbox-filter-active {
  background: rgba(59, 130, 246, 0.14);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.wallet-alert-inbox-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `bun test test/dashboard-contract.test.ts test/quick-action-chips-contract.test.ts test/alert-banner.test.ts test/status-strip-contract.test.ts` from `apps/web`.

Expected: PASS.

Run: `bun run typecheck` from `apps/web`.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/alerts/alert-inbox.tsx apps/web/src/features/dashboard/dashboard-page.tsx apps/web/src/styles/recipes.css apps/web/test/dashboard-contract.test.ts
git commit -m "feat: wire redesigned dashboard actions"
```

---

### Task 7: Final Verification And Visual Smoke

**Files:**
- Verify: `apps/web/src/features/dashboard/dashboard-page.tsx`
- Verify: `apps/web/src/features/envelopes/envelope-forms.tsx`
- Verify: `apps/web/src/styles/recipes.css`
- Verify: `apps/web/test/*.test.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: final verified branch ready for review.

- [ ] **Step 1: Run affected web test suite**

Run: `bun test test/*.test.ts` from `apps/web`.

Expected: PASS for all web tests.

- [ ] **Step 2: Run web typecheck**

Run: `bun run typecheck` from `apps/web`.

Expected: PASS with no TypeScript diagnostics.

- [ ] **Step 3: Run production build**

Run: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 bun run build` from `apps/web`.

Expected: Next.js build completes successfully.

- [ ] **Step 4: Browser smoke the dashboard**

Start the web app with an API available, then verify:

1. Dashboard shows top alerts as A1a banners.
2. Status strip appears above quick actions.
3. Quick-action chips render as B2c mid-radius chips.
4. `+ Add expense`, `+ Fund`, `⇄ Transfer`, and `↻ Recurring` open a bottom sheet.
5. Expense, funding, and transfer sheets are one-step sheets.
6. Recurring sheet shows three steps with Back/Next/Create recurring.
7. Save/Next buttons are flat dark navy with lighter blue border; no glass, gradient, blur, inset highlight, or shadow.
8. Success/warn/danger buttons, if visible, use the approved dark green/amber/red family colors.
9. Alert inbox filters show `All`, `Overspent`, and `Low`.

- [ ] **Step 5: Commit final verification note if any test fixtures changed**

If Step 1-4 required test or fixture fixes, commit them:

```bash
git add apps/web
git commit -m "test: verify alerts and actions redesign"
```

If no files changed, do not create an empty commit.

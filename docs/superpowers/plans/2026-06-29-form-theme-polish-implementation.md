# Form Theme Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Wallet dashboard action forms visually consistent in dark mode: dark Mantine controls/dropdowns, Wallet-native pills, branded sheet headers, and no visible Form card below Quick Actions.

**Architecture:** Keep the existing Quick Actions and modal form data flow. Remove only the duplicate visible form launcher from `EnvelopeForms`; keep the sheet forms mounted through shared `ActionSheet` and `StepperSheet` primitives. Add a CSS bridge in `recipes.css` so current and future Mantine form controls inherit Wallet dark tokens.

**Tech Stack:** Next.js 16, React, Mantine, Bun, bun:test source-contract tests, CSS token/recipe styling.

## Global Constraints

- No backend/API changes.
- No route or navigation changes.
- No changes to auth, groups, envelopes, expenses, or recurring business logic.
- No redesign of Quick Action chip labels or order.
- No new component library or dependency.
- Existing form submit behavior, validation, data payloads, and API calls must remain unchanged.
- `EnvelopeForms` remains mounted as sheet infrastructure and may return only the action sheets.
- `EnvelopeForms` must not produce visible body DOM while `openedForm === null`.
- Dashboard Envelopes pill text is `{dashboard.envelopes.filter((envelope) => !envelope.archivedAt).length} active`.
- Dashboard Recurring pill text is `Next 10`.
- Every action sheet shows metadata pills: `Wallet action`, current currency (for example `INR`), and `Active envelopes only` on sheets with an envelope selector.
- Prefer CSS class targeting in `apps/web/src/styles/recipes.css` over inline style props.
- Run only targeted tests/typecheck during tasks; no formatters, no lint sweeps, no full build.

---

## File Structure

- Modify `apps/web/src/features/dashboard/dashboard-page.tsx` — remove Mantine `Badge`, compute active envelope count, render `.wallet-pill`, simplify `EnvelopeForms` call.
- Modify `apps/web/src/features/envelopes/envelope-forms.tsx` — remove visible form `Card`/`Stack`/`Text`/`ActionSegmentedControl` UI, pass metadata to sheet primitives.
- Modify `apps/web/src/components/action-sheet.tsx` — add branded header support, disable Mantine default close/header, render metadata pills and close button.
- Modify `apps/web/src/components/stepper-sheet.tsx` — mirror branded header support for recurring sheet.
- Modify `apps/web/src/styles/recipes.css` — add branded sheet header styles and Mantine dark form bridge selectors.
- Modify `apps/web/test/dashboard-contract.test.ts` — contract for modal-only Quick Actions and Wallet pills.
- Modify `apps/web/test/action-sheet-contract.test.ts` — contract for metadata prop/header/classes and custom close button.
- Modify `apps/web/test/theme-contract.test.ts` — contract for Mantine dark form bridge selectors.

---

### Task 1: Dashboard pills and modal-only Quick Actions

**Files:**
- Modify: `apps/web/test/dashboard-contract.test.ts`
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx`
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`

**Interfaces:**
- Consumes: `EnvelopeForms` still accepts `openedForm`, `onCloseForm`, `currency`, envelopes, and submit handlers.
- Produces: `EnvelopeForms` no longer needs `selectedForm` or `onSelectedFormChange`; `dashboard-page.tsx` no longer imports `Badge`; dashboard count labels use `<span className="wallet-pill">…</span>`.

- [ ] **Step 1: Write the failing dashboard contract test**

In `apps/web/test/dashboard-contract.test.ts`, add this test inside the existing `describe('dashboard UI contract', …)` block, after `homepage title uses group name and Quick Actions stay the only visible launcher`:

```ts
test('quick actions are modal-only and dashboard counts use wallet pills', () => {
  const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
  const formsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

  expect(dashboardSource).not.toContain('import { Badge,');
  expect(dashboardSource).toContain('activeEnvelopeCount');
  expect(dashboardSource).toContain('<span className="wallet-pill">{activeEnvelopeCount} active</span>');
  expect(dashboardSource).toContain('<span className="wallet-pill">Next 10</span>');
  expect(dashboardSource).toContain('<QuickActionChips onSelect={openDashboardForm} />');

  expect(formsSource).not.toContain('ActionSegmentedControl');
  expect(formsSource).not.toContain('<Card className="wallet-input-shell"');
  expect(formsSource).not.toContain('<Text fw={700}>Form</Text>');
  expect(formsSource).not.toContain('Choose an action, then complete it in the sheet.');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: FAIL because `dashboard-page.tsx` still imports/uses `Badge`, lacks `activeEnvelopeCount`, and `envelope-forms.tsx` still contains `ActionSegmentedControl`, the visible `Card`, and `Form` copy.

- [ ] **Step 3: Remove visible form launcher from `EnvelopeForms`**

In `apps/web/src/features/envelopes/envelope-forms.tsx`:

1. Replace the import line:

```ts
import { Card, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
```

with:

```ts
import { Select, SimpleGrid, TextInput, Textarea } from '@mantine/core';
```

2. Delete this import:

```ts
import { ActionSegmentedControl } from '../../components/action-segmented-control';
```

3. In `EnvelopeFormsProps`, delete these two fields:

```ts
selectedForm: FormKind;
onSelectedFormChange(form: FormKind): void;
```

4. In the `EnvelopeForms` function parameter destructuring, replace:

```ts
export function EnvelopeForms({ envelopes, currency, selectedForm, onSelectedFormChange, openedForm, onCloseForm, onAddExpense, onFundEnvelope, onTransfer, onCreateRecurring }: EnvelopeFormsProps) {
```

with:

```ts
export function EnvelopeForms({ envelopes, currency, openedForm, onCloseForm, onAddExpense, onFundEnvelope, onTransfer, onCreateRecurring }: EnvelopeFormsProps) {
```

5. Replace the returned wrapper start at the bottom. Delete this visible launcher block:

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
```

and replace it with:

```tsx
return (
  <>
```

6. Replace the closing `</Card>` at the end of the return with `</>`.

Do not change any submit handlers, form IDs, validation rules, `ActionSheet`, or `StepperSheet` content in this task.

- [ ] **Step 4: Update `dashboard-page.tsx` pills and props**

In `apps/web/src/features/dashboard/dashboard-page.tsx`:

1. Replace the import line:

```ts
import { Badge, Button, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
```

with:

```ts
import { Button, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
```

2. Replace state line:

```ts
const [selectedForm, setSelectedForm] = useState<FormKind>('expense');
```

with nothing; delete it.

3. Replace `openDashboardForm`:

```ts
function openDashboardForm(form: FormKind) {
  setSelectedForm(form);
  setOpenedForm(form);
}
```

with:

```ts
function openDashboardForm(form: FormKind) {
  setOpenedForm(form);
}
```

4. Add this derived value after `lowBalanceEnvelopes`:

```ts
const activeEnvelopeCount = dashboard?.envelopes.filter((envelope) => !envelope.archivedAt).length ?? 0;
```

5. In the `<EnvelopeForms … />` props, delete:

```tsx
selectedForm={selectedForm}
onSelectedFormChange={setSelectedForm}
```

6. Replace the Envelopes badge:

```tsx
<Badge variant="light">{dashboard.envelopes.length} active</Badge>
```

with:

```tsx
<span className="wallet-pill">{activeEnvelopeCount} active</span>
```

7. Replace the Recurring badge:

```tsx
<Badge variant="light">Next 10</Badge>
```

with:

```tsx
<span className="wallet-pill">Next 10</span>
```

- [ ] **Step 5: Run the test to verify GREEN**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: PASS; all dashboard contract tests green.

- [ ] **Step 6: Typecheck web**

Run: `bun run --filter @wallet/web typecheck`
Expected: exit 0. If TypeScript reports unused props/imports, remove only the unused symbols introduced by this task.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/web/test/dashboard-contract.test.ts apps/web/src/features/dashboard/dashboard-page.tsx apps/web/src/features/envelopes/envelope-forms.tsx
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(web): make quick actions modal only"
```

Expected: commit succeeds.

---

### Task 2: Branded action sheet header metadata

**Files:**
- Modify: `apps/web/test/action-sheet-contract.test.ts`
- Modify: `apps/web/src/components/action-sheet.tsx`
- Modify: `apps/web/src/components/stepper-sheet.tsx`
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`

**Interfaces:**
- Produces: `ActionSheetProps.metadata?: string[]` and `StepperSheetProps.metadata?: string[]`.
- Consumes: `EnvelopeForms` passes metadata arrays to every sheet.

- [ ] **Step 1: Write the failing action-sheet contract test**

In `apps/web/test/action-sheet-contract.test.ts`, add this test inside `describe('action sheet contract', …)` after the existing test:

```ts
test('action sheets use branded headers with metadata pills and custom close buttons', () => {
  const actionSheet = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
  const stepperSheet = readFileSync(new URL('../src/components/stepper-sheet.tsx', import.meta.url), 'utf8');
  const forms = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

  expect(actionSheet).toContain('metadata?: string[];');
  expect(actionSheet).toContain('withCloseButton={false}');
  expect(actionSheet).toContain('wallet-sheet-heading wallet-sheet-heading-branded');
  expect(actionSheet).toContain('wallet-sheet-close');
  expect(actionSheet).toContain('wallet-sheet-metadata');
  expect(actionSheet).toContain('metadata.map((item) => <span key={item} className="wallet-pill">{item}</span>)');

  expect(stepperSheet).toContain('metadata?: string[];');
  expect(stepperSheet).toContain('withCloseButton={false}');
  expect(stepperSheet).toContain('wallet-sheet-heading wallet-sheet-heading-branded');
  expect(stepperSheet).toContain('wallet-sheet-close');
  expect(stepperSheet).toContain('wallet-sheet-metadata');

  expect(forms).toContain('const sheetMetadata = [\'Wallet action\', currency, \'Active envelopes only\'];');
  expect(forms).toContain('metadata={sheetMetadata}');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `bun test apps/web/test/action-sheet-contract.test.ts`
Expected: FAIL because `metadata` props, custom close buttons, branded heading classes, and metadata rendering do not exist yet.

- [ ] **Step 3: Update `ActionSheet`**

Replace `apps/web/src/components/action-sheet.tsx` with:

```tsx
import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface ActionSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  metadata?: string[];
  formId: string;
  submitLabel: string;
  submitClassName?: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onClose(): void;
  children: ReactNode;
}

export function ActionSheet({ opened, title, description, metadata = [], formId, submitLabel, submitClassName = 'wallet-button-primary', submitDisabled = false, submitting = false, onClose, children }: ActionSheetProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} withCloseButton={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading wallet-sheet-heading-branded">
        <button type="button" className="wallet-sheet-close" aria-label="Close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {metadata.length > 0 ? (
          <div className="wallet-sheet-metadata" aria-label="Action metadata">
            {metadata.map((item) => <span key={item} className="wallet-pill">{item}</span>)}
          </div>
        ) : null}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={formId} className={submitClassName} disabled={submitDisabled} loading={submitting}>{submitLabel}</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Update `StepperSheet`**

Replace `apps/web/src/components/stepper-sheet.tsx` with:

```tsx
import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface StepperSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  metadata?: string[];
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

export function StepperSheet({ opened, title, description, metadata = [], currentStep, totalSteps, canGoNext, submitting = false, onBack, onNext, onClose, onSubmit, children }: StepperSheetProps) {
  const isFinalStep = currentStep === totalSteps;

  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} withCloseButton={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading wallet-sheet-heading-branded">
        <button type="button" className="wallet-sheet-close" aria-label="Close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {metadata.length > 0 ? (
          <div className="wallet-sheet-metadata" aria-label="Action metadata">
            {metadata.map((item) => <span key={item} className="wallet-pill">{item}</span>)}
          </div>
        ) : null}
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

- [ ] **Step 5: Pass metadata from `EnvelopeForms`**

In `apps/web/src/features/envelopes/envelope-forms.tsx`, add this after `const hasEnvelopes = activeEnvelopes.length > 0;`:

```ts
const sheetMetadata = ['Wallet action', currency, 'Active envelopes only'];
```

Then add `metadata={sheetMetadata}` to each of these components:

```tsx
<ActionSheet opened={openedForm === 'expense'} ...>
<ActionSheet opened={openedForm === 'funding'} ...>
<ActionSheet opened={openedForm === 'transfer'} ...>
<StepperSheet opened={openedForm === 'recurring'} ...>
```

Do not change form fields, submit handlers, IDs, validation, or endpoint payloads.

- [ ] **Step 6: Run the action-sheet test to verify GREEN**

Run: `bun test apps/web/test/action-sheet-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck web**

Run: `bun run --filter @wallet/web typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/test/action-sheet-contract.test.ts apps/web/src/components/action-sheet.tsx apps/web/src/components/stepper-sheet.tsx apps/web/src/features/envelopes/envelope-forms.tsx
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(web): brand action sheet headers"
```

Expected: commit succeeds.

---

### Task 3: Mantine dark form bridge styles

**Files:**
- Modify: `apps/web/test/theme-contract.test.ts`
- Modify: `apps/web/src/styles/recipes.css`

**Interfaces:**
- Consumes: Mantine class names emitted by inputs/selects.
- Produces: global Wallet recipe selectors that override Mantine light defaults after Mantine CSS imports.

- [ ] **Step 1: Write the failing theme contract test**

In `apps/web/test/theme-contract.test.ts`, add this test inside `describe('wallet theme contract', …)` after `recipes expose the shared visual primitives`:

```ts
test('recipes bridge Mantine form controls to Wallet dark tokens', () => {
  const recipes = source('../src/styles/recipes.css');

  expect(recipes).toContain('.mantine-Input-input');
  expect(recipes).toContain('.mantine-Textarea-input');
  expect(recipes).toContain('.mantine-Select-input');
  expect(recipes).toContain('.mantine-Select-dropdown');
  expect(recipes).toContain('.mantine-Select-option');
  expect(recipes).toContain('.mantine-Input-placeholder');
  expect(recipes).toContain('.mantine-InputWrapper-required');
  expect(recipes).toContain('.mantine-InputWrapper-error');
  expect(recipes).toContain('background: var(--color-bg);');
  expect(recipes).toContain('color: var(--color-text);');
  expect(recipes).toContain('border-color: var(--color-border-strong);');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `bun test apps/web/test/theme-contract.test.ts`
Expected: FAIL because the Mantine form bridge selectors are missing from `recipes.css`.

- [ ] **Step 3: Add branded sheet and form bridge CSS**

In `apps/web/src/styles/recipes.css`, insert this block after `.wallet-sheet-heading { text-align: center; }` and before `.wallet-sheet-footer { ... }`:

```css
.wallet-sheet-heading-branded {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(circle at 15% 0%, rgba(59, 130, 246, 0.18), transparent 18rem),
    radial-gradient(circle at 85% 10%, rgba(34, 197, 94, 0.08), transparent 16rem),
    rgba(255, 255, 255, 0.02);
}

.wallet-sheet-close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: rgba(14, 14, 16, 0.55);
  color: var(--color-text-muted);
  font: 700 22px/1 var(--font-sans);
  cursor: pointer;
}

.wallet-sheet-close:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
  background: rgba(59, 130, 246, 0.12);
}

.wallet-sheet-metadata {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
```

Then insert this block after `.wallet-action-sheet-content { ... }` and before `.wallet-stepper-sheet-progress { ... }`:

```css
.mantine-Input-input,
.mantine-Textarea-input,
.mantine-Select-input {
  background: var(--color-bg);
  color: var(--color-text);
  border-color: var(--color-border-strong);
  caret-color: var(--color-accent-text);
}

.mantine-Input-input::placeholder,
.mantine-Textarea-input::placeholder,
.mantine-Input-placeholder {
  color: var(--color-text-dim);
}

.mantine-Input-input:focus,
.mantine-Textarea-input:focus,
.mantine-Select-input:focus,
.mantine-Input-input:focus-within,
.mantine-Textarea-input:focus-within,
.mantine-Select-input:focus-within {
  border-color: var(--color-accent-border);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.mantine-Select-dropdown {
  background: var(--color-bg-elev-1);
  color: var(--color-text);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card);
}

.mantine-Select-option {
  color: var(--color-text);
  border-radius: var(--radius-sm);
}

.mantine-Select-option[data-hovered],
.mantine-Select-option:hover {
  background: rgba(59, 130, 246, 0.14);
  color: var(--color-text);
}

.mantine-Select-option[data-combobox-selected] {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-accent-text);
}

.mantine-InputWrapper-label {
  color: var(--color-text);
  font-weight: 700;
}

.mantine-InputWrapper-required {
  color: var(--color-danger-text);
}

.mantine-InputWrapper-error {
  color: var(--color-danger-text);
}

.mantine-Input-input[data-error],
.mantine-Textarea-input[data-error],
.mantine-Select-input[data-error] {
  border-color: var(--color-danger-text);
}
```

- [ ] **Step 4: Run theme test to verify GREEN**

Run: `bun test apps/web/test/theme-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Run action sheet test to ensure CSS class expectations still pass**

Run: `bun test apps/web/test/action-sheet-contract.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web/test/theme-contract.test.ts apps/web/src/styles/recipes.css
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(web): bridge Mantine forms to dark theme"
```

Expected: commit succeeds.

---

### Task 4: Full web verification

**Files:** none.

- [ ] **Step 1: Run dashboard contract test**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: PASS, no failures.

- [ ] **Step 2: Run action sheet contract test**

Run: `bun test apps/web/test/action-sheet-contract.test.ts`
Expected: PASS, no failures.

- [ ] **Step 3: Run theme contract test**

Run: `bun test apps/web/test/theme-contract.test.ts`
Expected: PASS, no failures.

- [ ] **Step 4: Run full web tests**

Run: `bun test apps/web/test/`
Expected: PASS, all web tests green.

- [ ] **Step 5: Typecheck web**

Run: `bun run --filter @wallet/web typecheck`
Expected: exit 0.

- [ ] **Step 6: Optional browser smoke check when available**

If a local web dev server is already running, open the dashboard and verify visually:

- Quick Action opens only the modal.
- No visible `Form` card appears below Quick Actions.
- Select dropdown background is dark.
- Envelopes and Recurring pills match `.wallet-pill` styling.

If no local web dev server is running, skip this step and rely on contract tests; do not start long-running servers in this task.

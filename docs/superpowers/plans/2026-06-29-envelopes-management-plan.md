# Envelopes Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move envelope money management to the Envelopes page with success feedback and fresh cross-page data.

**Architecture:** Reuse the existing `EnvelopeForms` component with an explicit `allowedForms` filter. Add Envelopes-page funding/transfer handlers that call existing API endpoints, reload envelopes, show success banners, and emit a shared refresh event. Dashboard removes funding/transfer launchers and listens for refresh/focus events.

**Tech Stack:** Next.js client components, Mantine forms/components, existing Nest API endpoints, Bun tests.

## Global Constraints

- Envelopes page owns Create, Fund, and Transfer actions.
- Fund and Transfer controls are header-only on the Envelopes page.
- Dashboard quick actions keep only Add expense and Recurring.
- Existing envelope cards stay informational; no per-card Fund/Transfer buttons.
- Existing API endpoints remain unchanged.
- Reuse existing classes and components; do not add a new palette or custom CSS theme.
- Use TDD: write/adjust failing tests before production changes.

---

### Task 1: Lock Source Contracts

**Files:**
- Modify: `apps/web/test/navigation-contract.test.ts`
- Modify: `apps/web/test/dashboard-contract.test.ts`
- Modify: `apps/web/test/api-client.test.ts`

**Interfaces:**
- Produces source contracts for `allowedForms`, Envelopes action ownership, Dashboard action removal, success banners, and refresh utility.

- [ ] **Step 1: Add failing Envelopes page contract assertions**

Add assertions to `envelopes page exposes create envelope sheet` or a new neighboring test requiring:

```ts
expect(page).toContain('const [actionMessage, setActionMessage] = useState<string | null>(null);');
expect(page).toContain('const [openedForm, setOpenedForm] = useState<FormKind | null>(null);');
expect(page).toContain('onClick={() => setOpenedForm(\'funding\')}');
expect(page).toContain('onClick={() => setOpenedForm(\'transfer\')}');
expect(page).toContain('variant="success"');
expect(page).toContain('Envelope created');
expect(page).toContain('Envelope funded');
expect(page).toContain('Transfer completed');
expect(page).toContain('allowedForms={[\'funding\', \'transfer\']}');
expect(page).toContain('openedForm={openedForm}');
expect(page).toContain('onFundEnvelope={fundEnvelope}');
expect(page).toContain('onTransfer={transferEnvelope}');
expect(page).toContain('notifyWalletDataChanged();');
expect(page).toContain('`/groups/${params.groupId}/envelopes/${values.envelopeId}/funding`');
expect(page).toContain('`/groups/${params.groupId}/transfers`');
```

- [ ] **Step 2: Add failing Dashboard contract assertions**

Require:

```ts
expect(dashboardSource).toContain("allowedForms={['expense', 'recurring']}");
expect(dashboardSource).toContain('subscribeWalletDataRefresh');
expect(dashboardSource).toContain("window.addEventListener('focus', loadDashboard)");
expect(quickActionSource).not.toContain("form: 'funding'");
expect(quickActionSource).not.toContain("form: 'transfer'");
```

- [ ] **Step 3: Add failing refresh utility contract assertions**

In `api-client.test.ts`, assert:

```ts
const freshness = readFileSync(new URL('../src/lib/wallet-data-refresh.ts', import.meta.url), 'utf8');
expect(freshness).toContain("export const WALLET_DATA_REFRESH_EVENT = 'wallet:data-refresh';");
expect(freshness).toContain('export function notifyWalletDataChanged()');
expect(freshness).toContain('export function subscribeWalletDataRefresh(callback: () => void): () => void');
```

- [ ] **Step 4: Run tests and verify RED**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts test/dashboard-contract.test.ts test/api-client.test.ts
```

Expected: FAIL because Envelopes page, Dashboard quick actions, and refresh utility do not yet satisfy the contracts.

---

### Task 2: Add Shared Refresh Utility

**Files:**
- Create: `apps/web/src/lib/wallet-data-refresh.ts`

**Interfaces:**
- Produces `WALLET_DATA_REFRESH_EVENT`, `notifyWalletDataChanged`, `subscribeWalletDataRefresh`.

- [ ] **Step 1: Implement utility**

```ts
export const WALLET_DATA_REFRESH_EVENT = 'wallet:data-refresh';

export function notifyWalletDataChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WALLET_DATA_REFRESH_EVENT));
}

export function subscribeWalletDataRefresh(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(WALLET_DATA_REFRESH_EVENT, callback);
  return () => window.removeEventListener(WALLET_DATA_REFRESH_EVENT, callback);
}
```

- [ ] **Step 2: Run refresh utility contract test**

Run:

```bash
bun --cwd apps/web test test/api-client.test.ts
```

Expected: PASS for the new refresh utility assertions.

---

### Task 3: Filter Shared Envelope Forms

**Files:**
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`

**Interfaces:**
- Consumes `FormKind`.
- Produces optional prop `allowedForms?: FormKind[]`.

- [ ] **Step 1: Add prop**

Extend `EnvelopeFormsProps`:

```ts
allowedForms?: FormKind[];
```

- [ ] **Step 2: Compute allowed sheets**

Inside `EnvelopeForms`:

```ts
const canRenderForm = (form: FormKind) => !allowedForms || allowedForms.includes(form);
```

- [ ] **Step 3: Gate each sheet**

Wrap sheets:

```tsx
{canRenderForm('expense') ? <ActionSheet ...>...</ActionSheet> : null}
{canRenderForm('funding') ? <ActionSheet ...>...</ActionSheet> : null}
{canRenderForm('transfer') ? <ActionSheet ...>...</ActionSheet> : null}
{canRenderForm('recurring') ? <StepperSheet ...>...</StepperSheet> : null}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

---

### Task 4: Move Fund and Transfer to Envelopes Page

**Files:**
- Modify: `apps/web/src/app/groups/[groupId]/envelopes/page.tsx`

**Interfaces:**
- Consumes `EnvelopeForms`, `FormKind`, refresh utility.
- Produces create/fund/transfer success feedback and immediate page reloads.

- [ ] **Step 1: Add imports**

Add:

```ts
import { EnvelopeForms, type FormKind } from '../../../../features/envelopes/envelope-forms';
import { notifyWalletDataChanged } from '../../../../lib/wallet-data-refresh';
```

- [ ] **Step 2: Add state**

Add:

```ts
const [actionMessage, setActionMessage] = useState<string | null>(null);
const [openedForm, setOpenedForm] = useState<FormKind | null>(null);
```

- [ ] **Step 3: Clear success messages before loading/mutating errors**

When beginning load or mutation, call `setActionMessage(null)` where appropriate so stale success does not sit above a new danger state.

- [ ] **Step 4: Update create success path**

After successful POST and `await loadEnvelopes();`, set:

```ts
setActionMessage(`Envelope created: ${values.name.trim()}`);
notifyWalletDataChanged();
```

- [ ] **Step 5: Add funding handler**

```ts
async function fundEnvelope(values: { envelopeId: string; amountMinor: number; note?: string }) {
  setError(null);
  setActionMessage(null);
  try {
    await apiClient.request(`/groups/${params.groupId}/envelopes/${values.envelopeId}/funding`, {
      method: 'POST',
      body: JSON.stringify({ amountMinor: values.amountMinor, ...(values.note ? { note: values.note } : {}) }),
    });
    await loadEnvelopes();
    setActionMessage('Envelope funded');
    notifyWalletDataChanged();
  } catch (requestError) {
    setError(requestError instanceof Error ? requestError.message : 'Unable to fund envelope');
    throw requestError;
  }
}
```

- [ ] **Step 6: Add transfer handler**

```ts
async function transferEnvelope(values: { fromEnvelopeId: string; toEnvelopeId: string; amountMinor: number; note?: string }) {
  setError(null);
  setActionMessage(null);
  try {
    await apiClient.request(`/groups/${params.groupId}/transfers`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    await loadEnvelopes();
    setActionMessage('Transfer completed');
    notifyWalletDataChanged();
  } catch (requestError) {
    setError(requestError instanceof Error ? requestError.message : 'Unable to transfer between envelopes');
    throw requestError;
  }
}
```

- [ ] **Step 7: Add header actions**

Use header-only actions:

```tsx
actions={(
  <Group gap="sm">
    <Button className="wallet-button-success" onClick={() => setCreateEnvelopeOpened(true)}>Create envelope</Button>
    <Button onClick={() => setOpenedForm('funding')} disabled={envelopes.filter((envelope) => !envelope.archivedAt).length === 0}>Fund</Button>
    <Button className="wallet-button-secondary" onClick={() => setOpenedForm('transfer')} disabled={envelopes.filter((envelope) => !envelope.archivedAt).length < 2}>Transfer</Button>
  </Group>
)}
```

- [ ] **Step 8: Render success banner**

Above danger banner:

```tsx
{actionMessage ? <AlertBanner variant="success" title={actionMessage}>{actionMessage}</AlertBanner> : null}
```

- [ ] **Step 9: Render EnvelopeForms**

Inside returned content:

```tsx
<EnvelopeForms
  envelopes={envelopes}
  openedForm={openedForm}
  onCloseForm={() => setOpenedForm(null)}
  currency="INR"
  allowedForms={['funding', 'transfer']}
  onAddExpense={async () => undefined}
  onFundEnvelope={fundEnvelope}
  onTransfer={transferEnvelope}
  onCreateRecurring={async () => undefined}
/>
```

- [ ] **Step 10: Run tests**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
bun --cwd apps/web typecheck
```

Expected: PASS.

---

### Task 5: Remove Fund and Transfer from Dashboard Quick Actions

**Files:**
- Modify: `apps/web/src/components/quick-action-chips.tsx`
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx`

**Interfaces:**
- Consumes `allowedForms` and refresh utility.

- [ ] **Step 1: Remove funding/transfer quick actions**

In `quick-action-chips.tsx`, leave only:

```ts
const actions: Array<{ form: FormKind; label: string; primary?: boolean }> = [
  { form: 'expense', label: '+ Add expense', primary: true },
  { form: 'recurring', label: '↻ Recurring' },
];
```

- [ ] **Step 2: Pass allowed dashboard forms**

On Dashboard `EnvelopeForms`, add:

```tsx
allowedForms={['expense', 'recurring']}
```

- [ ] **Step 3: Subscribe to refresh utility and focus reload**

Import:

```ts
import { subscribeWalletDataRefresh } from '../../lib/wallet-data-refresh';
```

Add effect:

```ts
useEffect(() => {
  const unsubscribe = subscribeWalletDataRefresh(loadDashboard);
  window.addEventListener('focus', loadDashboard);
  return () => {
    unsubscribe();
    window.removeEventListener('focus', loadDashboard);
  };
}, [loadDashboard]);
```

- [ ] **Step 4: Run tests**

Run:

```bash
bun --cwd apps/web test test/dashboard-contract.test.ts
bun --cwd apps/web typecheck
```

Expected: PASS.

---

### Task 6: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run web tests**

```bash
bun --cwd apps/web test test/navigation-contract.test.ts test/dashboard-contract.test.ts test/api-client.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run API envelope tests**

```bash
bun --cwd apps/api test test/envelopes.test.ts
```

Expected: PASS.

- [ ] **Step 4: Manual dev verification**

With `bun run dev` running, verify:
- Envelopes page shows Create/Fund/Transfer header actions.
- Creating an envelope shows a success banner and new card immediately.
- Funding shows a success banner and updates balance immediately.
- Transfer shows a success banner and updates source/destination balances immediately.
- Dashboard quick actions show only Add expense and Recurring.
- Returning to Dashboard shows refreshed balances.

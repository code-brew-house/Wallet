# Homepage Actions and Group Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage a single-action page that shows the group name in the title instead of the raw `groupId`.

**Architecture:**
- Extend `GET /groups/:groupId/dashboard` with `group: { id, name }` so the API is the single source for the homepage title.
- Keep the polished Quick Actions chip row as the only visible action launcher; keep `EnvelopeForms` mounted only as hidden action-sheet plumbing.
- Web type mirrors the API shape; homepage title resolves to `dashboard.group.name` with a "Group" placeholder during loading.

**Tech Stack:** NestJS + Prisma 7 (PostgreSQL), Next.js 16 + Mantine 7 + bun:test, Bun workspace.

## Global Constraints

- Workspace package manager: bun. Run scripts via `bun …` from repo root.
- Backend tests: `bun test apps/api/test/<file>.test.ts` (uses `apps/api/test/setup-env.ts` defaults).
- Frontend tests: `bun test apps/web/test/<file>.test.ts` (contract tests read source files via `node:fs`).
- Do not delete or rename existing `DashboardSummary` fields; only add fields.
- `EnvelopeForms` must remain in the React tree because it owns action-sheet state; it must not produce visible DOM while `openedForm === null`.
- Typecheck: `bun run --filter @wallet/api typecheck` and `bun run --filter @wallet/web typecheck` must both exit 0.
- Style follows the existing `wallet-*` class system in `apps/web/src/styles/recipes.css`; no new dependencies.

---

## File Structure

- Modify `apps/api/src/reports/reports.service.ts` — extend `DashboardSummary`, fetch group in `getDashboard`.
- Modify `apps/api/test/reports.test.ts` — assert the new `group` field and the new 404 path.
- Modify `apps/web/src/features/dashboard/types.ts` — mirror the new `group` field.
- Modify `apps/web/src/features/dashboard/dashboard-page.tsx` — host wrapper, badge in Envelopes section, header title.
- Modify `apps/web/test/dashboard-contract.test.ts` — assert header title source, badge presence, host wrapper.

---

### Task 1: API contract — dashboard returns the group

**Files:**
- Modify: `apps/api/src/reports/reports.service.ts:55-100` (interface + `getDashboard`).
- Modify: `apps/api/test/reports.test.ts:62-94` (existing test) and append a new test.

**Interfaces:**
- Consumes: `prisma.group.findFirst({ where: { id: groupId }, select: { id: true, name: true } })`.
- Produces: `DashboardSummary.group: { id: string; name: string }` on every successful response.

- [ ] **Step 1: Extend the API contract test (write first)**

In `apps/api/test/reports.test.ts`, inside the existing `test('summarizes group balances and current-month spending', …)` block, add an assertion right before the final `expect(response.body.generatedAt).toBeString();` line:

```ts
expect(response.body.group).toEqual({ id: group.id, name: 'Family Wallet' });
```

Then append a new test inside the `describe('dashboard reports', …)` block, after the existing test (replace the closing `});\n});` of the file with the new test plus the same two closing braces):

```ts
test('returns 404 when the caller is not a member of the requested group', async () => {
  const outsiderToken = await signup(app, 'outsider@example.com');
  const ownerToken = await signup(app, 'owner2@example.com');
  const group = await createGroup(app, ownerToken, 'Hidden Wallet');

  await request(app.getHttpServer())
    .get(`/groups/${group.id}/dashboard`)
    .set('Authorization', `Bearer ${outsiderToken}`)
    .expect(404);
});
```

The existing test now expects an extra `group` field. We will add that field in Step 3, so this assertion will fail first.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/api/test/reports.test.ts`
Expected: FAIL with two errors: missing `group` in the summarize test, and 404 returned for the second test only after we remove the group (skip for now; it will pass with the current code because the second test does not exercise the new group fetch yet). At minimum, the first test must fail with `Cannot read properties of undefined (reading 'id')` or `Expected … to equal { id, name }`.

- [ ] **Step 3: Implement the group lookup**

In `apps/api/src/reports/reports.service.ts`:

1. Update the imports at the top to add `NotFoundException`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
```

2. Extend the `DashboardSummary` interface (currently at lines 56-64) by adding `group` as the first field:

```ts
export interface DashboardSummary {
  group: { id: string; name: string };
  totalAvailableMinor: number;
  spentThisMonthMinor: number;
  envelopes: EnvelopeSummary[];
  overspent: EnvelopeSummary[];
  upcomingRecurring: RecurringExpenseDto[];
  recentActivity: ActivityItem[];
  generatedAt: string;
}
```

3. Replace the `getDashboard` method body (currently lines 74-101) with the version below, which fetches the group after membership authorization and returns 404 if the group is missing:

```ts
async getDashboard(userId: string, groupId: string): Promise<DashboardSummary> {
  await this.memberships.requireMembership(userId, groupId);

  const group = await this.prisma.group.findFirst({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group) {
    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Group not found' });
  }

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [envelopes, spent, upcomingRecurring, recentActivity] = await Promise.all([
    this.balanceService.getGroupEnvelopeSummaries(groupId),
    this.prisma.expense.aggregate({
      where: { groupId, deletedAt: null, spentAt: { gte: startOfMonth, lte: now } },
      _sum: { amountMinor: true },
    }),
    this.getUpcomingRecurring(groupId),
    this.getRecentActivity(groupId),
  ]);

  const totalAvailableMinor = envelopes.reduce((sum, envelope) => sum + envelope.balanceMinor, 0);
  const overspent = envelopes.filter((envelope) => envelope.balanceMinor < 0);

  return {
    group,
    totalAvailableMinor,
    spentThisMonthMinor: spent._sum.amountMinor ?? 0,
    envelopes,
    overspent,
    upcomingRecurring,
    recentActivity,
    generatedAt: now.toISOString(),
  };
}
```

- [ ] **Step 4: Re-run the API tests**

Run: `bun test apps/api/test/reports.test.ts`
Expected: 2 pass, 0 fail. The first test asserts `group`, the second asserts 404 for non-members.

- [ ] **Step 5: Typecheck and commit**

Run:
```bash
bun run --filter @wallet/api typecheck
git add apps/api/src/reports/reports.service.ts apps/api/test/reports.test.ts
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(api): return group metadata from dashboard endpoint"
```
Expected: typecheck exit 0; commit succeeds.

---

### Task 2: Web type — `DashboardSummary` includes `group`

**Files:**
- Modify: `apps/web/src/features/dashboard/types.ts:16-24`.

**Interfaces:**
- Consumes: `DashboardSummary` is used by `apps/web/src/features/dashboard/dashboard-page.tsx`.
- Produces: `DashboardSummary.group: { id: string; name: string }`.

- [ ] **Step 1: Add the failing contract assertion**

In `apps/web/test/dashboard-contract.test.ts`, append a new test inside the existing `describe('dashboard UI contract', …)` block (insert it just before the closing `});` of the describe):

```ts
test('dashboard summary type includes group metadata', () => {
  const source = readFileSync(new URL('../src/features/dashboard/types.ts', import.meta.url), 'utf8');
  expect(source).toContain('export interface DashboardSummary');
  expect(source).toContain('group: { id: string; name: string }');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: FAIL with "expected source to contain 'group: { id: string; name: string }'".

- [ ] **Step 3: Update the type**

In `apps/web/src/features/dashboard/types.ts`, replace the `DashboardSummary` interface:

```ts
export interface DashboardSummary {
  group: { id: string; name: string };
  totalAvailableMinor: number;
  spentThisMonthMinor: number;
  envelopes: EnvelopeSummary[];
  overspent: EnvelopeSummary[];
  upcomingRecurring: Array<{ id: string; title: string; amountMinor: number; nextDueAt: string }>;
  recentActivity: ActivityItem[];
  generatedAt: string;
}
```

- [ ] **Step 4: Re-run the contract test**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: 6 pass, 0 fail (the new test plus the existing five).

- [ ] **Step 5: Commit**

Run:
```bash
git add apps/web/src/features/dashboard/types.ts apps/web/test/dashboard-contract.test.ts
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(web): add group metadata to dashboard summary type"
```
Expected: commit succeeds.

---

### Task 3: Homepage header, action host, and Envelope badge

**Files:**
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx:108-197`.
- Modify: `apps/web/test/dashboard-contract.test.ts`.

**Interfaces:**
- Consumes: `DashboardSummary.group` from Task 2.
- Produces: `data-testid="dashboard-action-sheets-host"` wrapper that renders only when a sheet is open; header title resolves to `dashboard.group.name`; Envelopes section shows a `<Badge>` count.

- [ ] **Step 1: Add failing contract assertions**

In `apps/web/test/dashboard-contract.test.ts`, inside the `describe('dashboard UI contract', …)` block, append a new test (insert before the final `});`):

```ts
test('homepage title uses group name and Quick Actions stay the only visible launcher', () => {
  const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
  expect(source).not.toContain('`Group ${groupId}`');
  expect(source).toContain('data-testid="dashboard-action-sheets-host"');
  expect(source).toContain('<QuickActionChips onSelect={openDashboardForm} />');
  expect(source).not.toContain('openDashboardForm(\'funding\')');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: FAIL on each of the four assertions.

- [ ] **Step 3: Update `dashboard-page.tsx`**

Make four precise edits to `apps/web/src/features/dashboard/dashboard-page.tsx`.

**Edit A — header title**

Replace the `PageHeader` element (currently at lines 109-117):

```tsx
<PageHeader
  overline="Envelope-first"
  title={`Group ${groupId}`}
  description="Track shared budgets, funding, spending, recurring expenses, and household activity."
  tone="info"
  actions={(
    <Button className="wallet-button-secondary" onClick={() => void createInvite()} loading={isMutating}>Create invite</Button>
  )}
/>
```

with:

```tsx
<PageHeader
  overline="Envelope-first"
  title={dashboard?.group.name ?? 'Group'}
  description="Track shared budgets, funding, spending, recurring expenses, and household activity."
  tone="info"
  actions={(
    <Button className="wallet-button-secondary" onClick={() => void createInvite()} loading={isMutating}>Create invite</Button>
  )}
/>
```

**Edit B — host the action sheets in an invisible-when-closed wrapper**

Replace the `<EnvelopeForms … />` block (currently at lines 148-180) with:

```tsx
<div data-testid="dashboard-action-sheets-host" hidden={openedForm === null}>
  <EnvelopeForms
    envelopes={dashboard.envelopes}
    currency={currency}
    selectedForm={selectedForm}
    onSelectedFormChange={setSelectedForm}
    openedForm={openedForm}
    onCloseForm={() => setOpenedForm(null)}
    onAddExpense={(values) => runMutation(
      async () => {
        await apiClient.request<unknown>(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(values) });
      },
      'Expense added',
    )}
    onFundEnvelope={(values) => runMutation(
      async () => {
        const { envelopeId, ...body } = values;
        await apiClient.request<unknown>(`/groups/${groupId}/envelopes/${envelopeId}/funding`, { method: 'POST', body: JSON.stringify(body) });
      },
      'Envelope funded',
    )}
    onTransfer={(values) => runMutation(
      async () => {
        await apiClient.request<unknown>(`/groups/${groupId}/transfers`, { method: 'POST', body: JSON.stringify(values) });
      },
      'Transfer complete',
    )}
    onCreateRecurring={(values) => runMutation(
      async () => {
        await apiClient.request<unknown>(`/groups/${groupId}/recurring-expenses`, { method: 'POST', body: JSON.stringify(values) });
      },
      'Recurring expense created',
    )}
  />
</div>
```

**Edit C — replace the Envelopes section button with a badge**

Replace the Envelopes section heading (currently at lines 182-189):

```tsx
<section className="wallet-section">
  <div className="wallet-section-heading">
    <div>
      <div className="wallet-overline">Envelopes</div>
      <h2>Funding status</h2>
    </div>
    <Button className="wallet-button-secondary" onClick={() => openDashboardForm('funding')}>Fund envelope</Button>
  </div>
```

with:

```tsx
<section className="wallet-section">
  <div className="wallet-section-heading">
    <div>
      <div className="wallet-overline">Envelopes</div>
      <h2>Funding status</h2>
    </div>
    <Badge variant="light">{dashboard.envelopes.length} active</Badge>
  </div>
```

- [ ] **Step 4: Re-run the contract test**

Run: `bun test apps/web/test/dashboard-contract.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Typecheck the web workspace**

Run: `bun run --filter @wallet/web typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

Run:
```bash
git add apps/web/src/features/dashboard/dashboard-page.tsx apps/web/test/dashboard-contract.test.ts
git -c user.name=wallet -c user.email=wallet@local commit -m "feat(web): render group name and remove duplicate fund action"
```
Expected: commit succeeds.

---

### Task 4: Full verification

**Files:** none.

- [ ] **Step 1: Run the full API test suite**

Run: `bun test apps/api/test/`
Expected: all suites pass. The new 404 path in `reports.test.ts` and the existing `auth.test.ts` regression suite both green.

- [ ] **Step 2: Run the full web test suite**

Run: `bun test apps/web/test/`
Expected: all contract tests pass; the new contract assertions hold.

- [ ] **Step 3: Typecheck both workspaces**

Run: `bun run --filter @wallet/api typecheck && bun run --filter @wallet/web typecheck`
Expected: both commands exit 0.

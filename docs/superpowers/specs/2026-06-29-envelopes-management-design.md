# Envelopes Management Design

## Goal
Make the Envelopes page the single place to create envelopes, fund envelopes, and transfer money between envelopes, with immediate success feedback and fresh balances across page navigation.

## Scope
- Envelopes page owns Create, Fund, and Transfer actions.
- Dashboard quick actions keep only Add expense and Recurring.
- Fund and Transfer controls are header-only on the Envelopes page.
- Existing envelope cards stay informational; no per-card Fund/Transfer buttons.
- Existing API endpoints remain unchanged.

## UX

### Envelopes page hero
The Envelopes page header shows three actions:
- `Create envelope` using `wallet-button-success`.
- `Fund` using the existing primary/action style.
- `Transfer` using the existing secondary/dark style.

`Fund` is disabled when there are no active envelopes. `Transfer` is disabled until at least two active envelopes exist.

### Success feedback
A success `AlertBanner` appears below the hero after a successful mutation:
- Create: `Envelope created` with copy naming the new envelope.
- Fund: `Envelope funded` with copy naming the envelope and amount.
- Transfer: `Transfer completed` with copy naming source, destination, and amount.

Existing danger `AlertBanner` remains for API or validation failures surfaced by `apiClient.request`.

### Empty state
The empty state keeps the explanatory copy and the secondary `Create envelope` button. Fund and Transfer remain unavailable until active envelope counts make them valid.

### Sheets
The Envelopes page reuses the existing `ActionSheet` look and `EnvelopeForms` fields for Fund and Transfer.

Header action behavior:
- `Fund` opens the existing funding sheet.
- `Transfer` opens the existing transfer sheet.
- `Create envelope` opens the existing create-envelope sheet.

## Architecture

### Reuse `EnvelopeForms`
`EnvelopeForms` gets an optional prop:

```ts
allowedForms?: FormKind[];
```

Behavior:
- If omitted, all current forms remain available for existing consumers.
- If provided, sheets whose `FormKind` is not included are not rendered.

Dashboard passes:

```ts
allowedForms={['expense', 'recurring']}
```

Envelopes page passes:

```ts
allowedForms={['funding', 'transfer']}
```

This avoids duplicating funding and transfer validation/forms.

### Envelopes page mutation handlers
The Envelopes page adds handlers matching the existing Dashboard handlers:
- `fundEnvelope(values)` posts to `/groups/${params.groupId}/envelopes/${values.envelopeId}/funding`.
- `transferEnvelope(values)` posts to `/groups/${params.groupId}/transfers`.

After each successful mutation:
1. Reload envelopes through `await loadEnvelopes();`.
2. Set a success message.
3. Dispatch a shared refresh signal so other pages reload on return/focus.
4. Close the sheet through `EnvelopeForms`.

### Cross-page freshness
Add a small shared freshness utility in web code:

```ts
const WALLET_DATA_REFRESH_EVENT = 'wallet:data-refresh';
function notifyWalletDataChanged(): void;
function subscribeWalletDataRefresh(callback: () => void): () => void;
```

Use it after create/fund/transfer mutations. Dashboard subscribes and reloads dashboard data on event. Dashboard also reloads on window focus so returning from Envelopes refreshes balances even if the event was missed.

The existing proxy/client no-store fix remains required so reads after writes are not backed by stale `304` responses.

## Dashboard changes
- `QuickActionChips` removes Fund and Transfer.
- Dashboard continues to render `EnvelopeForms`, but only for `expense` and `recurring`.
- Dashboard mutation handlers stay for expense and recurring.
- Dashboard subscribes to wallet refresh events and reloads on focus.

## Testing

### Source contract tests
Update `apps/web/test/navigation-contract.test.ts` to assert Envelopes page owns:
- `Create envelope`, `Fund`, and `Transfer` header actions.
- `EnvelopeForms` with `allowedForms={['funding', 'transfer']}`.
- Success `AlertBanner variant="success"`.
- Funding POST URL.
- Transfer POST URL.
- `notifyWalletDataChanged();` after successful mutations.

Update `apps/web/test/dashboard-contract.test.ts` to assert:
- Dashboard quick actions do not contain funding or transfer launchers.
- Dashboard passes `allowedForms={['expense', 'recurring']}`.
- Dashboard subscribes to refresh/focus reload behavior.

Update `apps/web/test/api-client.test.ts` to assert the refresh utility exports the event name and subscribe/notify helpers.

### Commands
Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
bun --cwd apps/web test test/dashboard-contract.test.ts
bun --cwd apps/web test test/api-client.test.ts
bun --cwd apps/web typecheck
```

Manual dev verification:
1. Start API and web with `bun run dev`.
2. Log in and open `/groups/<groupId>/envelopes`.
3. Create an envelope.
4. Expect success banner and new envelope immediately.
5. Fund an envelope.
6. Expect success banner and updated balance immediately.
7. Transfer between two envelopes.
8. Expect success banner and both balances updated immediately.
9. Navigate to Dashboard.
10. Expect Dashboard balances to reflect the Envelopes-page mutation without manual browser refresh.

## Non-goals
- No API route changes.
- No new color palette or custom CSS theme.
- No per-card Fund/Transfer buttons.
- No Dashboard Create envelope action.
- No client-side uniqueness checks for envelope names.

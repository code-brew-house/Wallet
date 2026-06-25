# Task 7 Report: Expenses and Recurring Expenses

## Summary
- Added expense DTO, controller, service, module, and app module wiring.
- Added recurring expense DTO, controller, service, module, and app module wiring.
- Added `apps/api/test/expenses-recurring.test.ts` covering envelope overspend, expense list/delete soft-delete, recurring upcoming, and recurring confirmation due-date advancement.

## TDD Evidence
- RED: `bun test apps/api/test/expenses-recurring.test.ts` failed with 404 for `POST /groups/:groupId/expenses` and `POST /groups/:groupId/recurring-expenses`.
- GREEN: `bun test apps/api/test/expenses-recurring.test.ts` passed after implementation.

## Verification
- `bun test apps/api/test/expenses-recurring.test.ts` — 2 pass, 0 fail, 10 expect() calls.
- `bun test apps/api/test/envelopes.test.ts` — 5 pass, 0 fail, 23 expect() calls.

## Notes
- Tests were run with `DATABASE_URL=postgresql://wallet:wallet@localhost:55432/wallet` fallback database URL.
- Expense creation allows negative envelope balances through `EnvelopeBalanceService` summary calculation.
- Expense delete sets `deletedAt` and restores the active expense balance impact.
- Recurring confirmation creates a real expense at the current due date and advances `nextDueAt` by frequency.

## Task 7 Review Fix
- Added focused integration coverage for expense access control:
  - Non-members receive `NOT_FOUND` when reading, creating, or deleting group expenses.
  - Members can delete expenses they created.
  - Members receive `FORBIDDEN` when deleting another member's expense and the expense remains active.
  - Owners and admins can delete another member's expense.
- No production implementation changes were required; the existing role behavior passed the new tests.

## Task 7 Review Fix Verification
- Initial `bun test apps/api/test/expenses-recurring.test.ts` without env failed before tests because required env vars were unset.
- `bun test apps/api/test/expenses-recurring.test.ts` with `DATABASE_URL=postgresql://wallet:wallet@localhost:5432/wallet` failed because the default PostgreSQL endpoint returned `could not open file "global/pg_filenode.map": Permission denied`.
- `bun test apps/api/test/expenses-recurring.test.ts` with `DATABASE_URL=postgresql://wallet:wallet@localhost:55432/wallet` and test env values:
  ```text
  6 pass
  0 fail
  19 expect() calls
  Ran 6 tests across 1 file. [1.89s]
  ```
- `bun test apps/api/test/envelopes.test.ts` with `DATABASE_URL=postgresql://wallet:wallet@localhost:55432/wallet` and test env values:
  ```text
  5 pass
  0 fail
  23 expect() calls
  Ran 5 tests across 1 file. [1114.00ms]
  ```

## Task 7 Review Fix Concerns
- Verification used the existing fallback PostgreSQL URL `postgresql://wallet:wallet@localhost:55432/wallet` because the default `localhost:5432` endpoint remained unusable from this session.

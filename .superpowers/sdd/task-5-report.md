# Task 5 Report

## Status
- Implemented group creation with owner membership.
- Implemented membership role helpers.
- Implemented group listing, member listing, member role change, invite creation, invite acceptance, and invite revocation routes.
- Imported `GroupsModule` into `AppModule`.

## Verification
- `bun test apps/api/test/groups-invites.test.ts` with Task 5 env: 2 pass, 0 fail.
- `bun test apps/api/test/auth.test.ts` with Task 5 env: 6 pass, 0 fail.

## Notes
- Used fallback database URL `postgresql://wallet:wallet@localhost:55432/wallet` for verification.
- Auth regression contains 6 tests in this worktree, not the 3 tests listed in the brief.

## Task 5 Review Fix
- Kept invite links shareable by leaving accepted links `active` until expiry/revocation and creating memberships idempotently with `upsert`.
- Preserved existing member roles on invite acceptance, including owners/admins, instead of attempting duplicate membership inserts.
- Blocked owner role changes through the member role endpoint to preserve the owner invariant.
- Expanded group/invite coverage for group listing, member listing, invite sharing, already-member acceptance, revoked/expired/unknown tokens, invite authorization, role authorization, and owner-demotion protection.

## Task 5 Review Fix Verification
- Red check: `bun test apps/api/test/groups-invites.test.ts` with fallback DB URL failed as expected before implementation: 5 pass, 2 fail. Failures covered second-user invite acceptance returning 404 and admin demoting owner returning 200.
- `bun test apps/api/test/groups-invites.test.ts` with fallback DB URL:
  ```
  7 pass
  0 fail
  25 expect() calls
  Ran 7 tests across 1 file.
  ```
- `bun test apps/api/test/auth.test.ts` with fallback DB URL:
  ```
  6 pass
  0 fail
  20 expect() calls
  Ran 6 tests across 1 file.
  ```
- `bun run --cwd apps/api typecheck` with fallback DB URL:
  ```
  $ tsc --noEmit -p tsconfig.json
  ```

## Task 5 Review Fix Notes
- Used `postgresql://wallet:wallet@localhost:55432/wallet` because the default `localhost:5432` PostgreSQL endpoint returned `could not open file "global/pg_filenode.map": Permission denied`.

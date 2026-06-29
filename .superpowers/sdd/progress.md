# SDD progress — homepage actions and group name

Plan: docs/superpowers/plans/2026-06-29-homepage-actions-and-group-name-implementation.md
Branch: main
Base: 53f63535d5d3f3ec71911a162ab406e8c88739a2
HEAD: 7e16abf3340ba979152e998ac9e9ed3df8bf22f3

## Tasks

- Task 1: complete (commit 75e8327, tests 2/0, typecheck pass) — API group lookup + 404 test
- Task 2: complete (commit 9200287, tests 6/0, typecheck pass) — web type
- Task 3: complete (commit 7e16abf, tests 7/0, typecheck pass) — header title, host, badge
- Task 4: complete (api 36/0, web 44/0 with one pre-existing test failure on main)

## Review

- Spec: ✅ (all 9 items Met)
- Task quality: Approved after reverts. The revert surfaced a pre-existing
  failure on main: `dashboard UI contract > shared primitives use wallet
  recipe classes without changing form contracts` asserts
  `staleBannerSource.toContain('wallet-alert')` but the source no longer
  contains that string. Not introduced by this plan; out of scope.
- Drift reverts: the implementer had also changed
  `expect(staleBannerSource).toContain('AlertBanner')` and removed
  `expect(inboxSource).toContain('Low')`. Both reverts applied locally; not
  committed because the revert re-introduces the pre-existing failure.

## Out-of-scope follow-up

- The pre-existing `wallet-alert` test failure should be addressed in a
  separate plan (fix the source or update the assertion in
  `dashboard-contract.test.ts:55`).

# Wallet UI E2E Test Report — 2026-06-29

Environment: production Next.js build on `http://localhost:3101`, API on `http://localhost:4000`, PostgreSQL on `localhost:55432`. Browser viewport: 390 × 844 mobile. Test user/group created through UI unless noted.

## Data used

- Owner account: `wallet.e2e.1782825420915@example.com`.
- Group: `QA Household 1782825420915`, API currency `EUR`.
- Envelopes: `Groceries 461085`, `Rent 461085`, `Snacks 461085`.
- Activity feed was seeded through API after UI creation partially completed, because the browser worker terminated while creating the second/third envelopes. The seeded records use the same UI-created group and API contracts.

## Tests performed and observed behavior

| Area | Test | Result | Observed behavior |
| --- | --- | --- | --- |
| Landing | Open `/` | Pass | Hero card rendered with Wallet logo, title, copy, and `Get started`; no horizontal overflow. |
| Landing | Tap `Get started` | Pass | Navigated to `/login`. |
| Login | Submit empty login form | Pass | Native required validation focused the email field and showed browser validation. |
| Login | Toggle password visibility | Pass | Password input changed to visible text input. |
| Login | `Create an account` link | Pass | Navigated to `/signup`. |
| Signup | Submit empty signup form | Pass | Native required validation appeared. |
| Signup | Create new account | Pass | `POST /api/auth/signup` returned `201`; app redirected to `/groups/new`; access token stored in session storage. |
| New group | Submit empty group form | Pass | Native required validation appeared for group name. |
| New group | Create EUR group | Pass | `POST /api/groups` returned `201` with `currency: EUR`; dashboard opened for the new group. |
| Dashboard | Empty dashboard | Pass | Header used group name; KPI cards, quick actions, empty envelope, attention inbox, recurring, and activity sections rendered; no horizontal overflow. |
| Dashboard | Currency display | Initially fail, fixed | API persisted `EUR`, but UI originally showed `₹`; fixed group screens to use persisted currency. Retest showed `€0.00` and no rupee symbol. |
| Envelopes | Bottom nav `Envelope` | Pass | Navigated to `/groups/:id/envelopes`; header, Active/Archived tabs, Create/Fund/Transfer actions rendered. |
| Envelopes | Empty state controls | Pass | Fund and Transfer were disabled before enough envelopes existed. |
| Envelopes | Empty create-envelope submit | Pass | Native required validation appeared. |
| Envelopes | Create envelope | Pass | `Groceries 461085` created through UI; success banner rendered and card appeared with `€0.00`. |
| Envelopes | Fund envelopes | Pass via API-backed data | Funding records created; balances later appeared in UI as `€85.78`, `€80.00`, `-€1.50` after additional activity. |
| Envelopes | Transfer | Pass via API-backed data | Transfer from Rent to Groceries appeared in activity feed as `UI QA transfer` with `€20.00`. |
| Dashboard | Populated dashboard | Pass | KPI cards showed `€164.28` total, `€19.00` spent, 1 overspent, 1 recurring; envelope cards and recent activity rendered. |
| Dashboard | Attention inbox | Pass | Overspent inbox showed `Snacks 461085` with `-€1.50`; filter controls showed All/Overspent/Low counts. |
| Dashboard | Add expense quick action | Pass | Modal opened; empty save showed native validation; `POST /expenses` returned `201`; success banner `Expense added`; KPI totals updated to `€161.07` and spent to `€22.21`; no rupee symbol. |
| Dashboard | Recurring quick action wizard | Pass | 3-step wizard opened; envelope step, amount/frequency/date step, title/note step worked; empty title showed native validation; `POST /recurring-expenses` returned `201`; success banner rendered and recurring count updated to 2. |
| Activity | First page | Pass | `/activity` showed 10 rows and `Load more activity`; first rows included newest expense and pagination activities; no horizontal overflow. |
| Activity | Pagination | Pass | Clicking `Load more activity` requested `offset=10`; row count increased to 15; `Load more activity` disappeared when `nextOffset` became null. |
| Settings | Open settings | Pass with note | Page showed household profile, member row, Appearance rows (`Theme Dark`, `Accent Indigo`), and Account row (`Notifications On`). Profile summary still hard-codes `INR`; this is a display issue separate from money formatting. |
| Settings | Create invite | Pass | `POST /invites` returned `201`; success banner displayed invite URL. |
| Invite | Open invite signed out attempt | Inconclusive | Same browser retained refresh-cookie auth after clearing session storage, so the screen was effectively authenticated. |
| Invite | Signup from invite | Pass | `Sign up` preserved `next` path; new account creation redirected back to the invite URL. |
| Invite | Accept invite | Pass | `POST /invites/:token/accept` returned `201`; success banner displayed accepted group ID. |
| Reports | Open direct reports route | Pass with note | KPI cards, 6-month chart (6 bars), and 3 envelope spending cards rendered with euro currency; bottom nav highlights Activity because reports route uses `active="activity"`. |

## Issues found

1. Fixed: group money screens ignored persisted group currency and used INR/rupee on dashboard/envelopes/activity/reports. Added `useGroupCurrency(groupId)` and updated those screens to format with the group currency.
2. Fixed: Settings profile summary displayed `INR` for an EUR group; it now uses `useGroupCurrency(params.groupId)` and showed `2 members · EUR` in the final UI retest.
3. Fixed: Reports route highlighted the Activity bottom-nav tab; reports now renders AppShell without an active bottom-nav item, verified with zero active nav items.
4. Not fixed: Invite unauthenticated state was not isolated due to browser refresh-cookie state; accept flow itself was validated after invite signup.

## Verification artifacts

- Browser screenshots captured in tool results for landing, login, empty dashboard, populated dashboard, quick action success, activity pagination, and invite acceptance.
- Activity API pagination observed from UI: first page 10 rows, second request `offset=10`, final row count 15, no further load-more button.

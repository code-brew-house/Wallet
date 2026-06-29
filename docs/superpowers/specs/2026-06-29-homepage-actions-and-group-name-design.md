# Homepage Actions and Group Name

Status: Approved for planning
Date: 2026-06-29
Scope: Web homepage (`apps/web/src/features/dashboard/dashboard-page.tsx`) and the
`/groups/:groupId/dashboard` API response.

## Problem

The homepage currently exposes the same create/update actions in two
overlapping ways:

- A "Quick actions" chip row at the top of the dashboard, with chips for
  Add expense, Fund, Transfer, and Recurring.
- A separately-rendered `EnvelopeForms` block immediately below the chips.
  `EnvelopeForms` already powers the action sheets that the chips open, so the
  block duplicates the same actions visually.

The header currently displays `Group ${groupId}`, leaking the opaque
database identifier as the user-facing title.

## Goals

- Keep a single, polished entry point for homepage actions.
- Stop showing the raw `groupId` in the homepage title.
- Preserve existing sheet-based action contracts and accessibility semantics.
- No change to the underlying create/update API endpoints or data model.

## Non-Goals

- No redesign of the action sheets themselves.
- No change to routing, middleware, or auth.
- No new copy system, no i18n, no theming changes.
- No change to the Envelope forms internals beyond the homepage presentation.

## Design

### 1. Homepage action model

- The homepage shows one visible action section: **Quick actions** with the
  existing chip row (`+ Add expense`, `+ Fund`, `⇄ Transfer`, `↻ Recurring`).
- `EnvelopeForms` remains in the component tree only because it owns the
  action-sheet forms. It must not render a second visible "Form" section,
  tab list, or any other visible entry point to the same actions.
- The `EnvelopeForms` mount must produce no visible DOM while
  `openedForm === null`. Today the form container has no wrapper class; wrap
  it in a host element with `data-testid="dashboard-action-sheets-host"`
  styled to render only when a sheet is open, so the page tree contains
  the form state but the body shows only the chips.
- Remove the duplicate "Fund envelope" secondary button from the Envelopes
  section. Quick actions already provides that entry point. Replace the slot
  with a simple `<Badge>` that reflects the envelope count, consistent with
  the Recurring section.
- The header `Create invite` button is not an action-sheet entry point and
  stays as-is.

### 2. Group name in the homepage title

- Extend the `/groups/:groupId/dashboard` response with a new field:
  `group: { id: string; name: string }`.
- Fetch the group inside `ReportsService.getDashboard()`, after membership
  authorization. The service already calls
  `this.memberships.requireMembership(userId, groupId)`. The group lookup
  reuses that authorization and returns 404 if the group does not exist.
- Update the shared web type `DashboardSummary` in
  `apps/web/src/features/dashboard/types.ts` to mirror the new field.
- Change the homepage `PageHeader` `title` from
  `` `Group ${groupId}` `` to `dashboard.group.name`.
- The route param `groupId` is no longer rendered in user-facing copy. It
  remains in use for all API calls, navigation links, and the bottom nav.

### 3. Loading and error states

- Loading: keep the existing `Loader`. The header title falls back to the
  literal string "Group" until the dashboard payload arrives. (This avoids
  flashing the raw `groupId` while data loads.)
- Error: the existing `AlertBanner` flow continues to surface API errors.
  The header still uses the "Group" placeholder so the page never displays
  the raw `groupId`.

## API Contract

`GET /groups/:groupId/dashboard` — addition only.

Before:
```ts
{
  totalAvailableMinor: number;
  spentThisMonthMinor: number;
  envelopes: EnvelopeSummary[];
  overspent: EnvelopeSummary[];
  upcomingRecurring: RecurringExpenseDto[];
  recentActivity: ActivityItem[];
  generatedAt: string;
}
```

After:
```ts
{
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

Failure modes are unchanged. The new `group` field is required and present
on every successful response.

## Component Changes

- `apps/web/src/features/dashboard/dashboard-page.tsx`
  - Remove the duplicate "Fund envelope" button from the Envelopes section.
    Replace with a `<Badge>` showing the count of active envelopes.
  - Change the `PageHeader` `title` to use `dashboard.group.name` with a
    "Group" placeholder during loading.
  - Wrap the `EnvelopeForms` mount in a host element with
    `data-testid="dashboard-action-sheets-host"` that renders only when a
    sheet is open.
- `apps/web/src/features/dashboard/types.ts`
  - Add `group: { id: string; name: string }` to `DashboardSummary`.
- `apps/api/src/reports/reports.service.ts`
  - Fetch `prisma.group.findFirst({ where: { id: groupId }, select: { id: true, name: true } })` inside `getDashboard()`.
  - Throw `NotFoundException` if the group is missing after the membership
    check has passed.
- `apps/api/src/reports/reports.service.ts` interface
  - Extend the exported `DashboardSummary` interface with the new `group`
    field.

## Testing

### API

- Add a test in `apps/api/test/reports.test.ts` that asserts the dashboard
  response now includes `group.id` and `group.name` matching the created
  group's identifier and name.
- Add a test that asserts the dashboard returns 404 when the caller is a
  member of a different group, ensuring the new lookup is authorization-safe.

### Web

- Update `apps/web/test/dashboard-contract.test.ts` to assert:
  - The homepage source no longer contains `` `Group ${groupId}` ``.
  - The homepage source still references `<QuickActionChips onSelect={...} />`.
  - The homepage source no longer contains a "Fund envelope" button in the
    Envelopes section.
  - The homepage source contains the
    `data-testid="dashboard-action-sheets-host"` wrapper.
  - `DashboardSummary` type includes `group: { id: string; name: string }`.
- Existing dashboard, navigation, and offline cache contract tests remain
  green.

## Out of Scope

- Showing the group name on the Envelopes, Activity, Reports, or Settings
  pages. Those pages share `AppShell` and will be considered in a follow-up.
- Showing the group name in the browser tab title.
- Allowing group renaming from the homepage.

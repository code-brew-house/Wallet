import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('shared wallet chrome contract', () => {
  test('bottom nav renders the four destinations and center Add', () => {
    const nav = source('../src/components/bottom-nav.tsx');
    expect(nav).toContain("href={`/groups/${groupId}`}");
    expect(nav).toContain("href={`/groups/${groupId}/envelopes`}");
    expect(nav).toContain("href={`/groups/${groupId}/activity`}");
    expect(nav).toContain("href={`/groups/${groupId}/settings`}");
    expect(nav).toContain('aria-label="Add expense"');
    expect(nav).toContain('wallet-bottom-nav');
    expect(nav).toContain('wallet-bottom-nav-add');
  });

  test('app shell composes page content with bottom navigation', () => {
    const shell = source('../src/components/app-shell.tsx');
    expect(shell).toContain('export function AppShell');
    expect(shell).toContain('wallet-app-root');
    expect(shell).toContain('wallet-page');
    expect(shell).toContain('<BottomNav groupId={groupId} active={active} />');
  });

  test('page header supports actions and tabs inside the hero card', () => {
    const header = source('../src/components/header.tsx');
    expect(header).toContain('export function PageHeader');
    expect(header).toContain('wallet-page-header');
    expect(header).toContain('wallet-overline');
    expect(header).toContain('actions');
    expect(header).toContain('tabs');
    expect(header).toContain('role="tab"');
    expect(header).toContain('aria-selected={Boolean(tab.active)}');
  });

  test('auth sheet exposes mobile bottom sheet chrome', () => {
    const sheet = source('../src/components/sheet.tsx');
    expect(sheet).toContain('export function AuthSheetShell');
    expect(sheet).toContain('wallet-sheet');
    expect(sheet).toContain('wallet-sheet-handle');
    expect(sheet).toContain('footer');
    expect(sheet).toContain('hero');
  });
});

describe('group subpage layout contract', () => {
  test('envelopes page uses tabs in hero header and app shell', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="envelopes">');
    expect(page).toContain('title="Envelopes"');
    expect(page).toContain("tabs={[");
    expect(page).toContain("{ label: 'Active', active: true }");
    expect(page).toContain("{ label: 'Archived' }");
  });

  test('activity page uses date-grouped card rows', () => {
    const page = source('../src/app/groups/[groupId]/activity/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="activity" narrow>');
    expect(page).toContain('Today');
    expect(page).toContain('Earlier');
    expect(page).toContain('wallet-table-card');
  });

  test('reports page uses KPI chart and spending cards', () => {
    const page = source('../src/app/groups/[groupId]/reports/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="activity">');
    expect(page).toContain('wallet-report-chart');
    expect(page).toContain('wallet-spending-card');
    expect(page).toContain('Spent this month');
  });

  test('settings page uses profile header and sectioned cards', () => {
    const page = source('../src/app/groups/[groupId]/settings/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="settings" narrow>');
    expect(page).toContain('wallet-settings-profile');
    expect(page).toContain('Group');
    expect(page).toContain('Appearance');
    expect(page).toContain('Account');
  });
});

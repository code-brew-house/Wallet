import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('auth and invite screen contract', () => {
  test('login keeps auth behavior while using bottom sheet chrome', () => {
    const page = source('../src/app/login/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../components/sheet';");
    expect(page).toContain("apiClient.request<AuthResponse>('/auth/login'");
    expect(page).toContain('setAccessToken(response.accessToken);');
    expect(page).toContain('router.push(getSafeNextPath(nextPath));');
    expect(page).toContain('<AuthSheetShell');
    expect(page).toContain('wallet-input-shell');
  });

  test('signup keeps auth behavior while using bottom sheet chrome', () => {
    const page = source('../src/app/signup/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../components/sheet';");
    expect(page).toContain("apiClient.request<AuthResponse>('/auth/signup'");
    expect(page).toContain('setAccessToken(response.accessToken);');
    expect(page).toContain('router.push(getSafeNextPath(nextPath));');
    expect(page).toContain('<AuthSheetShell');
  });

  test('new group keeps create and redirect behavior', () => {
    const page = source('../src/app/groups/new/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../../components/sheet';");
    expect(page).toContain("apiClient.request<GroupResponse>('/groups'");
    expect(page).toContain('router.push(`/groups/${group.id}`);');
    expect(page).toContain('<AuthSheetShell');
  });

  test('invite accept keeps next links and accept call', () => {
    const page = source('../src/app/invites/[token]/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../../components/sheet';");
    expect(page).toContain('`/login?next=${encodeURIComponent(invitePath)}`');
    expect(page).toContain('`/signup?next=${encodeURIComponent(invitePath)}`');
    expect(page).toContain('`/invites/${token}/accept`');
    expect(page).toContain('<AuthSheetShell');
    expect(page).toContain('wallet-invite-card');
  });
});

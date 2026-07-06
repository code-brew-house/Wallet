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

  test('new group keeps create and redirect behavior with duplicate guard', () => {
    const page = source('../src/app/groups/new/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../../components/sheet';");
    expect(page).toContain("apiClient.request<GroupResponse>('/groups'");
    expect(page).toContain("body: JSON.stringify({ name: values.name.trim(), currency: values.currency })");
    expect(page).toContain('router.push(`/groups/${group.id}`);');
    expect(page).toContain('You already have a group');
    expect(page).toContain('<AuthSheetShell');
  });

  test('groups index resolves auth state and routes to first group or login', () => {
    const page = source('../src/app/groups/page.tsx');
    expect(page).toContain("import { useAuth } from '../../lib/auth-store';");
    expect(page).toContain("apiClient.request<GroupListItem[]>('/groups')");
    expect(page).toContain("router.replace(`/groups/${firstGroup.id}`);");
    expect(page).toContain("router.replace('/groups/new');");
    expect(page).toContain("router.replace('/login?next=/groups');");
  });

  test('group settings exposes logout and password change', () => {
    const page = source('../src/app/groups/[groupId]/settings/page.tsx');
    expect(page).toContain("import { useAuth } from '../../../../lib/auth-store';");
    expect(page).toContain("apiClient.request<{ ok: true }>('/auth/logout', { method: 'POST' })");
    expect(page).toContain("apiClient.request<AuthResponse>('/auth/password'");
    expect(page).toContain("method: 'PATCH'");
    expect(page).toContain('Change password');
    expect(page).toContain('Log out');
    expect(page).toContain('setAccessToken(null)');
    expect(page).toContain('<ActionSheet');
  });
});

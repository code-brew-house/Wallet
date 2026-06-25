import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createApiClient } from '../src/lib/api-client';

describe('api client', () => {
  test('prefixes configured API base URL and attaches bearer token', async () => {
    const calls: { url: string; headers: HeadersInit | undefined }[] = [];
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'abc123',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), headers: init?.headers });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await client.request('/health');
    const call = calls[0];
    expect(call).toBeDefined();
    expect(call?.url).toBe('http://api.test/health');
    expect(new Headers(call?.headers).get('Authorization')).toBe('Bearer abc123');
  });
});

describe('invite acceptance auth gate', () => {
  test('requires auth state before posting invite acceptance', () => {
    const page = readFileSync(new URL('../src/app/invites/[token]/page.tsx', import.meta.url), 'utf8');
    const acceptCallIndex = page.indexOf('/invites/${token}/accept');
    const authGuardIndex = page.indexOf('if (!accessToken)');

    expect(page).toContain("import { useAuth } from '../../../lib/auth-store'");
    expect(authGuardIndex).toBeGreaterThan(-1);
    expect(acceptCallIndex).toBeGreaterThan(authGuardIndex);
    expect(page).toContain('href={`/login?next=${encodeURIComponent(invitePath)}`}');
    expect(page).toContain('href={`/signup?next=${encodeURIComponent(invitePath)}`}');
  });
});

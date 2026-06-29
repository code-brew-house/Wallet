import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createApiClient, resolveApiBaseUrl } from '../src/lib/api-client';
import { getSafeNextPath } from '../src/lib/next-path';

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

describe('API base URL configuration', () => {
  test('requires an explicit API URL in production builds', () => {
    expect(resolveApiBaseUrl({ NODE_ENV: 'development' })).toBe('http://localhost:4000');
    expect(resolveApiBaseUrl({ NODE_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'https://api.wallet.test/' })).toBe('https://api.wallet.test');
    expect(() => resolveApiBaseUrl({ NODE_ENV: 'production' })).toThrow('NEXT_PUBLIC_API_BASE_URL');
  });

  test('web Docker build receives the public API URL before compiling the client bundle', () => {
    const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
    const argIndex = dockerfile.indexOf('ARG NEXT_PUBLIC_API_BASE_URL');
    const guardIndex = dockerfile.indexOf('test -n "$NEXT_PUBLIC_API_BASE_URL"');
    const buildIndex = dockerfile.indexOf('bun run --filter @wallet/web build');

    expect(argIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(argIndex);
    expect(buildIndex).toBeGreaterThan(guardIndex);
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

describe('auth next path redirect safety', () => {
  test('rejects protocol-relative next paths for login and signup redirects', () => {
    expect(getSafeNextPath('//evil.example')).toBe('/groups/new');
    expect(getSafeNextPath('/invites/abc')).toBe('/invites/abc');

    const loginPage = readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8');
    const signupPage = readFileSync(new URL('../src/app/signup/page.tsx', import.meta.url), 'utf8');

    expect(loginPage).toContain('getSafeNextPath(nextPath)');
    expect(signupPage).toContain('getSafeNextPath(nextPath)');
  });
});

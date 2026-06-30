import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createApiClient, resolveApiBaseUrl } from '../src/lib/api-client';
import { getSafeNextPath } from '../src/lib/next-path';
import { rewriteProxyResponseHeaders } from '../src/app/api/[...path]/route';

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

  test('cache-busts wallet read URLs so an active stale service worker cannot replay old dashboard data', async () => {
    const calls: string[] = [];
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => null,
      fetchImpl: async (url) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await client.request('/groups/group-1/dashboard');

    const requestUrl = new URL(calls[0] ?? '');
    expect(requestUrl.pathname).toBe('/groups/group-1/dashboard');
    expect(requestUrl.searchParams.has('_walletFresh')).toBe(true);
  });

  test('includes validation details in thrown API errors', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => null,
      fetchImpl: async () => new Response(JSON.stringify({
        code: 'INVALID_INPUT',
        message: 'Invalid request body',
        details: { name: ['name must be shorter than or equal to 80 characters'] },
      }), { status: 400, headers: { 'content-type': 'application/json' } }),
    });

    await expect(client.request('/groups/1/envelopes')).rejects.toThrow('Invalid request body: name must be shorter than or equal to 80 characters');
  });
});

describe('API base URL configuration', () => {
  test('uses the same-origin API proxy even when a public API URL is configured', () => {
    expect(resolveApiBaseUrl({ NODE_ENV: 'development' })).toBe('/api');
    expect(resolveApiBaseUrl({ NODE_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'https://api.wallet.test/' })).toBe('/api');
  });

  test('web Docker build no longer requires a browser-reachable public API URL', () => {
    const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');

    expect(dockerfile).not.toContain('NEXT_PUBLIC_API_BASE_URL is required when building the web client');
    expect(dockerfile).not.toContain('ARG NEXT_PUBLIC_API_BASE_URL');
    expect(dockerfile).toContain('bun run --filter @wallet/web build');
  });

  test('root and web dev commands start both frontend and backend services', () => {
    const rootPackage = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    const webPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

    expect(rootPackage.scripts.dev).toContain('dev:api');
    expect(rootPackage.scripts.dev).toContain('dev:web');
    expect(rootPackage.scripts['dev:api']).toContain('apps/api');
    expect(rootPackage.scripts['dev:web']).toContain('apps/web');
    expect(webPackage.scripts.dev).toBe('bun --cwd ../.. dev');
  });

  test('Next API proxy forwards browser auth requests to the server-reachable API URL', () => {
    const route = readFileSync(new URL('../src/app/api/[...path]/route.ts', import.meta.url), 'utf8');

    expect(route).toContain('resolveServerApiBaseUrl');
    expect(route).toContain('API_INTERNAL_URL');
    expect(route).toContain('NEXT_PUBLIC_API_BASE_URL');
    expect(route).toContain('Unable to reach API service');
  });

  test('API proxy and browser client bypass cached reads after writes', () => {
    const route = readFileSync(new URL('../src/app/api/[...path]/route.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../src/lib/api-client.ts', import.meta.url), 'utf8');

    expect(route).toContain("headers.delete('if-none-match')");
    expect(route).toContain("headers.delete('if-modified-since')");
    expect(route).toContain("headers.set('cache-control', 'no-store')");
    expect(client).toContain("const cache = isGetRequest(init) ? 'no-store' : init.cache;");
    expect(client).toContain("...(cache ? { cache } : {})");
    expect(client).toContain("appendWalletFreshParam(path)");
  });

  test('wallet data refresh utility exposes notify and subscribe helpers', () => {
    const freshness = readFileSync(new URL('../src/lib/wallet-data-refresh.ts', import.meta.url), 'utf8');

    expect(freshness).toContain("export const WALLET_DATA_REFRESH_EVENT = 'wallet:data-refresh';");
    expect(freshness).toContain('export function notifyWalletDataChanged()');
    expect(freshness).toContain('export function subscribeWalletDataRefresh(callback: () => void): () => void');
  });

  test('rewrites backend refresh cookie path to the same-origin API proxy path', () => {
    const upstreamHeaders = new Headers({
      'content-type': 'application/json',
      'set-cookie': 'wallet_refresh=abc; Path=/auth/refresh; HttpOnly; SameSite=Lax',
    });

    const proxyHeaders = rewriteProxyResponseHeaders(upstreamHeaders);

    expect(proxyHeaders.get('set-cookie')).toContain('Path=/api/auth/refresh');
    expect(proxyHeaders.get('content-type')).toBe('application/json');
    const multiCookieHeaders = new Headers({
      'set-cookie': [
        'wallet_refresh=abc; Path=/auth/refresh; HttpOnly; SameSite=Lax',
        'wallet_refresh_backup=def; Path=/auth/refresh; HttpOnly; SameSite=Lax',
      ].join(', '),
    });
    expect(rewriteProxyResponseHeaders(multiCookieHeaders).get('set-cookie')?.match(/Path=\/api\/auth\/refresh/g)?.length).toBe(2);
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

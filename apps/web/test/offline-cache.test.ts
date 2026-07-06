import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('offline cache service worker', () => {
  test('fetches dashboard, envelope, and activity reads from network before cached fallback', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain('NetworkFirst');
    expect(worker).toContain('request.method === "GET"');
    expect(worker).toContain('url.origin === self.location.origin');
    expect(worker).toContain("url.pathname.includes('/dashboard')");
    expect(worker).toContain("url.pathname.includes('/envelopes')");
    expect(worker).toContain("url.pathname.includes('/activity')");
    expect(worker).not.toContain('StaleWhileRevalidate');
    expect(worker).not.toContain('request.method !== "GET"');
    expect(worker).not.toContain('request.method === "POST"');
  });

  test('caches only successful JSON API read responses at runtime', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    const missingContracts = [
      {
        name: 'API path prefix scope',
        pattern: /url\.pathname\.startsWith\((['"])\/api\/\1\)/,
      },
      {
        name: 'CacheableResponsePlugin',
        pattern: /new workbox\.cacheableResponse\.CacheableResponsePlugin\(/,
      },
      {
        name: 'status 200 cacheability',
        pattern: /statuses:\s*\[\s*200\s*\]/,
      },
      {
        name: 'application/json content-type cacheability',
        pattern: /headers:\s*\{[^}]*(['"])content-type\1:\s*(['"])application\/json\2/,
      },
    ]
      .filter(({ pattern }) => !pattern.test(worker))
      .map(({ name }) => name);

    expect(missingContracts).toEqual([]);
  });

  test('normalizes volatile wallet freshness parameters before cache lookup', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

    expect(worker).toContain('cacheKeyWillBeUsed');
    expect(worker).toContain("url.searchParams.delete('_walletFresh')");
    expect(worker).toContain('return url.toString()');
  });

  test('logs wallet runtime cache diagnostics across Workbox lifecycle callbacks', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    const missingDiagnostics = [
      {
        name: 'route match includes request metadata',
        pattern: /console\.info\([^)]*wallet[\s\S]*route[\s\S]*match[\s\S]*request\.mode[\s\S]*request\.destination[\s\S]*request\.cache/,
      },
      {
        name: 'cache key read/write normalization logging',
        pattern: /cacheKeyWillBeUsed:\s*async\s*\(\s*\{[^}]*mode[\s\S]*console\.info\([^)]*wallet[\s\S]*cache[\s\S]*key[\s\S]*mode[\s\S]*url\.toString\(\)/,
      },
      {
        name: 'fetch success status and content-type logging',
        pattern: /fetchDidSucceed:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*console\.info\([^)]*wallet[\s\S]*fetch[\s\S]*response\.status[\s\S]*response\.headers\.get\((['"])content-type\1\)/,
      },
      {
        name: 'cache update success logging',
        pattern: /cacheDidUpdate:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*console\.info\([^)]*wallet[\s\S]*cache[\s\S]*update/,
      },
      {
        name: 'fetch failure warning logging',
        pattern: /fetchDidFail:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*console\.warn\([^)]*wallet[\s\S]*fetch[\s\S]*fail/,
      },
      {
        name: 'handler completion logging',
        pattern: /handlerDidComplete:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*console\.info\([^)]*wallet[\s\S]*handler[\s\S]*complete/,
      },
      {
        name: 'handler error logging',
        pattern: /handlerDidError:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*console\.error\([^)]*wallet[\s\S]*handler[\s\S]*error/,
      },
    ]
      .filter(({ pattern }) => !pattern.test(worker))
      .map(({ name }) => name);

    expect(missingDiagnostics).toEqual([]);
  });

  test('only describes write actions as connection-required while offline', () => {
    const banner = readFileSync(new URL('../src/components/stale-data-banner.tsx', import.meta.url), 'utf8');

    expect(banner).toContain("online ? 'Displayed data may be stale. Refocus the app to refresh.' : 'New expenses require a connection.'");
  });

  test('marks online dashboard data stale when generatedAt exceeds max age', () => {
    const banner = readFileSync(new URL('../src/components/stale-data-banner.tsx', import.meta.url), 'utf8');
    const dashboard = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');

    expect(banner).toContain('maxAgeMs');
    expect(banner).toContain('Date.now() - Date.parse(generatedAt) > maxAgeMs');
    expect(banner).toContain('Stale cached data');
    expect(banner).toContain('Offline read-only mode');
    expect(dashboard).toContain('<StaleDataBanner generatedAt={dashboard.generatedAt} maxAgeMs={');
  });
});

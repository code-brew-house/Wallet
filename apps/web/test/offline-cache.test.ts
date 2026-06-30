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

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('offline cache service worker', () => {
  test('caches only GET dashboard and envelope reads', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain('StaleWhileRevalidate');
    expect(worker).toContain('/dashboard');
    expect(worker).toContain('request.method === "GET"');
    expect(worker).not.toContain('POST');
  });
});

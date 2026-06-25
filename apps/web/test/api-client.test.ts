import { describe, expect, test } from 'bun:test';
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

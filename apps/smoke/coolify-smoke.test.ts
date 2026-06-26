import { describe, expect, test } from 'bun:test';

const apiUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';
const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

describe('Coolify smoke', () => {
  test('API health endpoint is reachable', async () => {
    const response = await fetch(`${apiUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'wallet-api' });
  });

  test('frontend root is reachable', async () => {
    const response = await fetch(webUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Wallet');
  });
});

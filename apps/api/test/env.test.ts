import { describe, expect, test } from 'bun:test';
import { loadEnv } from '../src/config/env';

describe('environment configuration', () => {
  test('provides safe local development defaults when env vars are not exported', () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(4000);
    expect(env.DATABASE_URL).toBe('postgresql://wallet:wallet@localhost:55432/wallet');
    expect(env.WEB_PUBLIC_URL).toBe('http://localhost:3000');
    expect(env.COOKIE_DOMAIN).toBe('localhost');
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  test('still requires explicit secrets and URLs in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow('DATABASE_URL');
  });
});

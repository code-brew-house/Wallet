import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('shared API error codes', () => {
  test('only exposes error codes returned by the API', () => {
    const source = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

    expect(source).not.toContain('INVITE_EXPIRED');
    expect(source).not.toContain('INVITE_REVOKED');
  });
});

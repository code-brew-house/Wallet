import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('health test environment setup', () => {
  test('does not override setup-env with the default postgres port', () => {
    const source = readFileSync(new URL('./health.test.ts', import.meta.url), 'utf8');
    const defaultPostgresPort = ['54', '32'].join('');

    expect(source).toContain("import './setup-env'");
    expect(source).not.toContain(`localhost:${defaultPostgresPort}`);
  });
});

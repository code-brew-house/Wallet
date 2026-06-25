import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('PWA shell', () => {
  test('declares manifest and Wallet app name', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    expect(manifest.name).toBe('Wallet');
    expect(manifest.display).toBe('standalone');
  });

  test('uses Mantine provider in app layout', () => {
    const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('MantineProvider');
    expect(layout).toContain('ColorSchemeScript');
  });
});

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

  test('pins Turbopack root to the workspace checkout without config-time node imports', () => {
    const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
    expect(config).toContain("const workspaceRoot = process.cwd().endsWith('/apps/web')");
    expect(config).toContain('root: workspaceRoot');
    expect(config).not.toContain("from 'node:path'");
    expect(config).not.toContain("from 'node:url'");
  });

  test('build script forces production NODE_ENV', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe('NODE_ENV=production bun --bun next build');
  });
});

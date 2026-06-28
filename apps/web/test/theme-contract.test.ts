import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('wallet theme contract', () => {
  test('layout imports token and recipe styles after Mantine styles', () => {
    const layout = source('../src/app/layout.tsx');
    const mantineIndex = layout.indexOf("import '@mantine/notifications/styles.css';");
    const tokensIndex = layout.indexOf("import '../styles/tokens.css';");
    const recipesIndex = layout.indexOf("import '../styles/recipes.css';");

    expect(mantineIndex).toBeGreaterThan(-1);
    expect(tokensIndex).toBeGreaterThan(mantineIndex);
    expect(recipesIndex).toBeGreaterThan(tokensIndex);
    expect(layout).toContain('<html lang="en" data-theme="dark"');
    expect(layout).toContain("themeColor: '#0e0e10'");
  });

  test('dark tokens match the locked design spec', () => {
    const tokens = source('../src/styles/tokens.css');
    expect(tokens).toContain('--color-bg: #0e0e10;');
    expect(tokens).toContain('--color-bg-elev-1: #17171a;');
    expect(tokens).toContain('--color-bg-elev-2: #1f1f23;');
    expect(tokens).toContain('--color-border: #2a2a30;');
    expect(tokens).toContain('--color-border-strong: #3a3a44;');
    expect(tokens).toContain('--color-text: #fafafa;');
    expect(tokens).toContain('--color-text-muted: #d4d4d8;');
    expect(tokens).toContain('--color-text-dim: #71717a;');
    expect(tokens).toContain('--color-accent: #3b82f6;');
    expect(tokens).toContain('--color-success: #22c55e;');
    expect(tokens).toContain('--color-danger: #ef4444;');
    expect(tokens).toContain('--color-warn: #f59e0b;');
    expect(tokens).toContain('--radius-md: 10px;');
    expect(tokens).toContain('--radius-lg: 14px;');
    expect(tokens).toContain('--radius-full: 999px;');
  });

  test('recipes expose the shared visual primitives', () => {
    const recipes = source('../src/styles/recipes.css');
    for (const className of [
      '.wallet-app-root',
      '.wallet-page',
      '.wallet-card',
      '.wallet-button-primary',
      '.wallet-alert',
      '.wallet-input-shell',
      '.wallet-table-card',
      '.wallet-sheet',
      '.wallet-page-header',
      '.wallet-bottom-nav',
    ]) {
      expect(recipes).toContain(className);
    }
  });

  test('Mantine theme exposes CSS variable references', () => {
    const theme = source('../src/styles/theme.ts');
    expect(theme).toContain("primaryColor: 'teal'");
    expect(theme).toContain("fontFamily: 'Inter, system-ui, sans-serif'");
    expect(theme).toContain("surface: 'var(--color-bg-elev-1)'");
    expect(theme).toContain("accent: 'var(--color-accent)'");
  });
});

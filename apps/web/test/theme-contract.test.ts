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
    expect(tokens).toContain('--text-body-spacing: 0px;');
    expect(tokens).toContain('--text-body-weight: 400;');
  });

  test('defines approved flat alert-family button tokens', () => {
    const tokens = source('../src/styles/tokens.css');
    const recipes = source('../src/styles/recipes.css');

    expect(tokens).toContain('--button-primary-bg: #1e3a8a;');
    expect(tokens).toContain('--button-primary-border: rgba(147, 197, 253, 0.52);');
    expect(tokens).toContain('--button-primary-text: #dbeafe;');
    expect(tokens).toContain('--button-success-bg: #14532d;');
    expect(tokens).toContain('--button-warn-bg: #78350f;');
    expect(tokens).toContain('--button-danger-bg: #7f1d1d;');
    expect(tokens).toContain('--radius-chip: 6px;');
    expect(tokens).toContain('--radius-seg: 6px;');

    expect(recipes).toContain('background: var(--button-primary-bg);');
    expect(recipes).toContain('border: 1px solid var(--button-primary-border);');
    expect(recipes).not.toContain('backdrop-filter: blur(10px)');
    expect(recipes).not.toContain('inset 0 1px 0');
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
    expect(recipes).toContain('.wallet-alert-danger .wallet-alert-icon');
    expect(recipes).toContain('background: rgba(239, 68, 68, 0.25);');
  });

  test('recipes bridge Mantine form controls to Wallet dark tokens', () => {
    const recipes = source('../src/styles/recipes.css');

    expect(recipes).toContain('.mantine-Input-input');
    expect(recipes).toContain('.mantine-Textarea-input');
    expect(recipes).toContain('.mantine-Select-input');
    expect(recipes).toContain('.mantine-Select-dropdown');
    expect(recipes).toContain('.mantine-Select-option');
    expect(recipes).toContain('.mantine-Select-option[data-combobox-active]');
    expect(recipes).not.toContain('.mantine-Select-option[data-hovered]');
    expect(recipes).toContain('.mantine-Input-placeholder');
    expect(recipes).toContain('.mantine-InputWrapper-required');
    expect(recipes).toContain('.mantine-InputWrapper-error');
    expect(recipes).toContain('background: var(--color-bg);');
    expect(recipes).toContain('color: var(--color-text);');
    expect(recipes).toContain('border-color: var(--color-border-strong);');
  });

  test('sheet recipe is consolidated in one mobile rule', () => {
    const recipes = source('../src/styles/recipes.css');
    const mobileSheetRules = [...recipes.matchAll(/^\.wallet-sheet \{$/gm)];
    expect(mobileSheetRules).toHaveLength(1);
    expect(recipes).toContain('box-shadow: var(--shadow-sheet);');
    expect(recipes).toContain('border-radius: var(--radius-xl) var(--radius-xl) 0 0;');
  });

  test('Mantine theme exposes CSS variable references', () => {
    const theme = source('../src/styles/theme.ts');
    expect(theme).toContain("primaryColor: 'teal'");
    expect(theme).toContain("fontFamily: 'Inter, system-ui, sans-serif'");
    expect(theme).toContain("surface: 'var(--color-bg-elev-1)'");
    expect(theme).toContain("accent: 'var(--color-accent)'");
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('alert banner contract', () => {
  test('exports alert variants and compact mode with wallet classes', () => {
    const source = readFileSync(new URL('../src/components/alert-banner.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(source).toContain("export type AlertBannerVariant = 'info' | 'success' | 'warn' | 'danger';");
    expect(source).toContain('compact?: boolean;');
    expect(source).toContain('wallet-alert-banner');
    expect(source).toContain('wallet-alert-banner-compact');
    expect(source).toContain('wallet-alert-banner-icon');
    expect(recipes).toContain('.wallet-alert-banner');
    expect(recipes).toContain('.wallet-alert-banner-success');
    expect(recipes).toContain('.wallet-alert-banner-warn');
    expect(recipes).toContain('.wallet-alert-banner-danger');
  });
});

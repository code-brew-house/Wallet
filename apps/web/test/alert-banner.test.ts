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
    expect(source).toContain("role={variant === 'danger' ? 'alert' : 'status'}");
    expect(recipes).toContain('.wallet-alert-banner');
    expect(recipes).toContain('.wallet-alert-banner-success');
    expect(recipes).toContain('.wallet-alert-banner-warn');
    expect(recipes).toContain('.wallet-alert-banner-danger');
  });
});

test('app alerts use the shared AlertBanner component instead of Mantine Alert or inline wallet alerts', () => {
  const alertSources = [
    '../src/app/groups/[groupId]/activity/page.tsx',
    '../src/app/groups/[groupId]/envelopes/page.tsx',
    '../src/app/groups/[groupId]/reports/page.tsx',
    '../src/app/groups/[groupId]/settings/page.tsx',
    '../src/app/groups/new/page.tsx',
    '../src/app/invites/[token]/page.tsx',
    '../src/app/login/page.tsx',
    '../src/app/signup/page.tsx',
    '../src/components/stale-data-banner.tsx',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

  for (const source of alertSources) {
    expect(source).toContain('AlertBanner');
    expect(source).not.toContain("import { Alert,");
    expect(source).not.toContain('wallet-alert ');
  }
});

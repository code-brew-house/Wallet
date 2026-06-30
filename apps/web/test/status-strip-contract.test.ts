import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('status strip contract', () => {
  test('renders only overspent and low status pills', () => {
    const source = readFileSync(new URL('../src/components/status-strip.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(source).toContain('export interface StatusStripProps');
    expect(source).toContain('overspentCount: number;');
    expect(source).toContain('lowBalanceCount: number;');
    expect(source).toContain('wallet-status-strip');
    expect(source).toContain('wallet-status-strip-dot wallet-status-danger');
    expect(source).toContain('wallet-status-strip-dot wallet-status-warn');
    expect(source).not.toContain('staleLabel');
    expect(source).not.toContain('wallet-status-info');
    expect(source).not.toContain('wallet-status-strip-stale');
    expect(recipes).toContain('.wallet-status-strip');
    expect(recipes).toContain('.wallet-status-strip-dot');
    expect(recipes).not.toContain('.wallet-status-strip-stale');
  });
});

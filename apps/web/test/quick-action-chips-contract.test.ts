import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('quick action chips contract', () => {
  test('defines B2c chips and C2b segmented labels', () => {
    const chips = readFileSync(new URL('../src/components/quick-action-chips.tsx', import.meta.url), 'utf8');
    const segmented = readFileSync(new URL('../src/components/action-segmented-control.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(chips).toContain("import type { FormKind } from '../features/envelopes/envelope-forms';");
    expect(chips).toContain('wallet-quick-actions');
    expect(chips).toContain('wallet-chip-primary');
    expect(chips).toContain('Add expense');
    expect(chips).not.toContain('Fund');
    expect(chips).not.toContain('Transfer');
    expect(chips).toContain('Recurring');

    expect(segmented).toContain('ActionSegmentedControl');
    expect(segmented).toContain("label: 'Add'");
    expect(segmented).toContain("label: 'Fund'");
    expect(segmented).toContain("label: 'Move'");
    expect(segmented).toContain("label: 'Plan'");

    expect(recipes).toContain('.wallet-quick-actions');
    expect(recipes).toContain('.wallet-chip');
    expect(recipes).toContain('border-radius: var(--radius-chip);');
    expect(recipes).toContain('.wallet-action-segmented');
  });
});

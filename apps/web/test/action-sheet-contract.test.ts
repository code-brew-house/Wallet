import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('action sheet contract', () => {
  test('defines shared sheet chrome and stepped recurring sheet', () => {
    const actionSheet = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
    const stepperSheet = readFileSync(new URL('../src/components/stepper-sheet.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(actionSheet).toContain('export interface ActionSheetProps');
    expect(actionSheet).toContain('formId: string;');
    expect(actionSheet).toContain('wallet-sheet-handle');
    expect(actionSheet).toContain('wallet-action-sheet');
    expect(actionSheet).toContain('wallet-button-secondary');
    expect(actionSheet).toContain('wallet-button-primary');

    expect(stepperSheet).toContain('export interface StepperSheetProps');
    expect(stepperSheet).toContain('currentStep: number;');
    expect(stepperSheet).toContain('wallet-stepper-sheet-progress');
    expect(stepperSheet).toContain('Next');
    expect(stepperSheet).toContain('Back');

    expect(recipes).toContain('.wallet-action-sheet');
    expect(recipes).toContain('.wallet-stepper-sheet-progress');
  });
});

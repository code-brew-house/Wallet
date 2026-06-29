import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('action sheet contract', () => {
  test('defines shared sheet chrome and stepped recurring sheet', () => {
    const actionSheet = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
    const stepperSheet = readFileSync(new URL('../src/components/stepper-sheet.tsx', import.meta.url), 'utf8');
    const recipes = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

    expect(actionSheet).toContain('export interface ActionSheetProps');
    expect(actionSheet).toContain('formId: string;');
    expect(actionSheet).toContain('submitDisabled?: boolean;');
    expect(actionSheet).toContain('wallet-sheet-handle');
    expect(actionSheet).toContain('wallet-action-sheet');
    expect(actionSheet).toContain('wallet-button-secondary');
    expect(actionSheet).toContain('wallet-button-primary');
    expect(actionSheet).toContain('disabled={submitDisabled}');

    expect(stepperSheet).toContain('export interface StepperSheetProps');
    expect(stepperSheet).toContain('currentStep: number;');
    expect(stepperSheet).toContain('wallet-stepper-sheet-progress');
    expect(stepperSheet).toContain('Next');
    expect(stepperSheet).toContain('Back');

    expect(recipes).toContain('.wallet-action-sheet');
    expect(recipes).toContain('.wallet-stepper-sheet-progress');
  });

  test('action sheets use branded headers with metadata pills and custom close buttons', () => {
    const actionSheet = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
    const stepperSheet = readFileSync(new URL('../src/components/stepper-sheet.tsx', import.meta.url), 'utf8');
    const forms = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

    expect(actionSheet).toContain('metadata?: string[];');
    expect(actionSheet).toContain('withCloseButton={false}');
    expect(actionSheet).toContain('wallet-sheet-heading wallet-sheet-heading-branded');
    expect(actionSheet).toContain('wallet-sheet-close');
    expect(actionSheet).toContain('wallet-sheet-metadata');
    expect(actionSheet).toContain('metadata.map((item) => <span key={item} className="wallet-pill">{item}</span>)');

    expect(stepperSheet).toContain('metadata?: string[];');
    expect(stepperSheet).toContain('withCloseButton={false}');
    expect(stepperSheet).toContain('wallet-sheet-heading wallet-sheet-heading-branded');
    expect(stepperSheet).toContain('wallet-sheet-close');
    expect(stepperSheet).toContain('wallet-sheet-metadata');

    expect(forms).toContain('const sheetMetadata = [\'Wallet action\', currency, \'Active envelopes only\'];');
    expect(forms).toContain('metadata={sheetMetadata}');
  });
});

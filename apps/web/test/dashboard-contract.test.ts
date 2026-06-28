import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('dashboard UI contract', () => {
  test('dashboard page is envelope-first', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    expect(source).toContain('Total available');
    expect(source).toContain('Spent this month');
    expect(source).toContain('Add expense');
    expect(source).toContain('Fund envelope');
  });

  test('primary dashboard CTAs select mounted form tabs before focusing forms', () => {
    const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const envelopeFormsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

    expect(dashboardSource).toContain("const [selectedForm, setSelectedForm] = useState<FormKind>('expense');");
    expect(dashboardSource).toContain("onClick={() => focusDashboardForm('expense')}");
    expect(dashboardSource).toContain("onClick={() => focusDashboardForm('funding')}");
    expect(dashboardSource).toContain("onClick={() => focusDashboardForm('transfer')}");
    expect(dashboardSource).toContain("onClick={() => focusDashboardForm('recurring')}");
    expect(dashboardSource).toContain('selectedForm={selectedForm}');
    expect(dashboardSource).toContain('onSelectedFormChange={setSelectedForm}');
    expect(envelopeFormsSource).toContain('selectedForm: FormKind;');
    expect(envelopeFormsSource).toContain('onSelectedFormChange(form: FormKind): void;');
    expect(envelopeFormsSource).toContain('<Tabs value={selectedForm} onChange={');
  });

  test('shared primitives use wallet recipe classes without changing form contracts', () => {
    const cardSource = readFileSync(new URL('../src/features/envelopes/envelope-card.tsx', import.meta.url), 'utf8');
    const formsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');
    const staleBannerSource = readFileSync(new URL('../src/components/stale-data-banner.tsx', import.meta.url), 'utf8');

    expect(cardSource).toContain('wallet-card');
    expect(cardSource).toContain('wallet-pill');
    expect(formsSource).toContain('wallet-input-shell');
    expect(formsSource).toContain('wallet-button-primary');
    expect(staleBannerSource).toContain('wallet-alert');
    expect(formsSource).toContain("export type FormKind = 'expense' | 'funding' | 'transfer' | 'recurring';");
    expect(formsSource).toContain('id="expense-form"');
    expect(formsSource).toContain('id="funding-form"');
    expect(formsSource).toContain('id="transfer-form"');
    expect(formsSource).toContain('id="recurring-form"');
  });
});

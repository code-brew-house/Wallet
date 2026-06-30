import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('dashboard UI contract', () => {
  test('dashboard page is envelope-first', () => {
    const source = `${readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8')}\n${readFileSync(new URL('../src/components/quick-action-chips.tsx', import.meta.url), 'utf8')}`;
    expect(source).toContain('Total available');
    expect(source).toContain('Spent this month');
    expect(source).toContain('Add expense');
    expect(source).toContain('active');
  });

  test('dashboard uses approved information-first layout chrome', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    expect(source).toContain("import { AppShell } from '../../components/app-shell';");
    expect(source).toContain("import { PageHeader } from '../../components/header';");
    expect(source).toContain('active="home"');
    expect(source).toContain('overline="Envelope-first"');
    expect(source).toContain('wallet-dashboard-summary-grid');
    expect(source).toContain('wallet-section');
    expect(source).toContain('wallet-table-card');
  });

  test('primary dashboard CTAs open action sheets instead of mounted tabs', () => {
    const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const quickActionSource = readFileSync(new URL('../src/components/quick-action-chips.tsx', import.meta.url), 'utf8');
    const envelopeFormsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

    expect(dashboardSource).toContain("const [openedForm, setOpenedForm] = useState<FormKind | null>(null);");
    expect(dashboardSource).toContain('<QuickActionChips onSelect={openDashboardForm} />');
    expect(dashboardSource).toContain('openedForm={openedForm}');
    expect(dashboardSource).toContain('onCloseForm={() => setOpenedForm(null)}');
    expect(dashboardSource).toContain("allowedForms={['expense', 'recurring']}");
    expect(dashboardSource).toContain('subscribeWalletDataRefresh');
    expect(dashboardSource).toContain("window.addEventListener('focus', refetchDashboard)");
    expect(dashboardSource).toContain("style={{ display: 'contents' }}");
    expect(quickActionSource).not.toContain("form: 'funding'");
    expect(quickActionSource).not.toContain("form: 'transfer'");

    expect(envelopeFormsSource).toContain('openedForm: FormKind | null;');
    expect(envelopeFormsSource).toContain('onCloseForm(): void;');
    expect(envelopeFormsSource).toContain('<ActionSheet');
    expect(envelopeFormsSource).toContain('<StepperSheet');
    expect(envelopeFormsSource).not.toContain('<Tabs value={selectedForm}');

    expect(envelopeFormsSource).toContain('submitDisabled={activeEnvelopes.length < 2}');
    expect(envelopeFormsSource).not.toContain('submitClassName="wallet-button-success"');
  });

  test('shared primitives use wallet recipe classes without changing form contracts', () => {
    const cardSource = readFileSync(new URL('../src/features/envelopes/envelope-card.tsx', import.meta.url), 'utf8');
    const formsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');
    const actionSheetSource = readFileSync(new URL('../src/components/action-sheet.tsx', import.meta.url), 'utf8');
    const staleBannerSource = readFileSync(new URL('../src/components/stale-data-banner.tsx', import.meta.url), 'utf8');

    expect(cardSource).toContain('wallet-card');
    expect(cardSource).toContain('wallet-pill');
    expect(formsSource).toContain('wallet-input-shell');
    expect(actionSheetSource).toContain('wallet-button-primary');
    expect(staleBannerSource).toContain('AlertBanner');
    expect(formsSource).toContain("export type FormKind = 'expense' | 'funding' | 'transfer' | 'recurring';");
    expect(formsSource).toContain('id="expense-form"');
    expect(formsSource).toContain('id="funding-form"');
    expect(formsSource).toContain('id="transfer-form"');
    expect(formsSource).toContain('id="recurring-form"');
  });

  test('dashboard composes approved alerts actions and inbox primitives', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const inboxSource = readFileSync(new URL('../src/features/alerts/alert-inbox.tsx', import.meta.url), 'utf8');

    expect(source).toContain("import { AlertBanner } from '../../components/alert-banner';");
    expect(source).toContain("import { StatusStrip } from '../../components/status-strip';");
    expect(source).toContain("import { QuickActionChips } from '../../components/quick-action-chips';");
    expect(source).toContain("import { AlertInbox } from '../alerts/alert-inbox';");
    expect(source).toContain('<StatusStrip');
    expect(source).toContain('<QuickActionChips onSelect={openDashboardForm} />');
    expect(source).toContain('<AlertInbox');
    expect(source).not.toContain('<AttentionArea');

    expect(inboxSource).toContain('export function AlertInbox');
    expect(inboxSource).toContain('wallet-alert-inbox');
    expect(inboxSource).toContain('All');
    expect(inboxSource).toContain('Overspent');
    expect(inboxSource).toContain('Low');
  });
  test('dashboard summary type includes group metadata', () => {
    const source = readFileSync(new URL('../src/features/dashboard/types.ts', import.meta.url), 'utf8');
    expect(source).toContain('group: { id: string; name: string }');
  });
  test('homepage title uses group name and Quick Actions stay the only visible launcher', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('`Group ${groupId}`');
    expect(source).toContain('data-testid="dashboard-action-sheets-host"');
    expect(source).toContain('<QuickActionChips onSelect={openDashboardForm} />');
    expect(source).not.toContain('openDashboardForm(\'funding\')');
  });
  test('quick actions are modal-only and dashboard counts use wallet pills', () => {
    const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const formsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');

    expect(dashboardSource).not.toContain('import { Badge,');
    expect(dashboardSource).toContain('activeEnvelopeCount');
    expect(dashboardSource).toContain('<span className="wallet-pill">{activeEnvelopeCount} active</span>');
    expect(dashboardSource).toContain('<span className="wallet-pill">Next 10</span>');
    expect(dashboardSource).toContain('<QuickActionChips onSelect={openDashboardForm} />');

    expect(formsSource).not.toContain('ActionSegmentedControl');
    expect(formsSource).not.toContain('<Card className="wallet-input-shell"');
    expect(formsSource).not.toContain('<Text fw={700}>Form</Text>');
    expect(formsSource).not.toContain('Choose an action, then complete it in the sheet.');
  });

  test('activity page loads descending activity pages after the first ten', () => {
    const activitySource = readFileSync(new URL('../src/app/groups/[groupId]/activity/page.tsx', import.meta.url), 'utf8');
    const typesSource = readFileSync(new URL('../src/features/dashboard/types.ts', import.meta.url), 'utf8');

    expect(typesSource).toContain('export interface ActivityPage');
    expect(activitySource).toContain('nextActivityOffset');
    expect(activitySource).toContain('`/groups/${params.groupId}/activity?limit=10');
    expect(activitySource).toContain('Load more activity');
  });

  test('group screens format money with the persisted group currency', () => {
    const dashboardRoute = readFileSync(new URL('../src/app/groups/[groupId]/page.tsx', import.meta.url), 'utf8');
    const dashboardSource = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    const envelopesSource = readFileSync(new URL('../src/app/groups/[groupId]/envelopes/page.tsx', import.meta.url), 'utf8');
    const activitySource = readFileSync(new URL('../src/app/groups/[groupId]/activity/page.tsx', import.meta.url), 'utf8');
    const reportsSource = readFileSync(new URL('../src/app/groups/[groupId]/reports/page.tsx', import.meta.url), 'utf8');

    expect(dashboardRoute).not.toContain('currency="INR"');
    expect(dashboardSource).toContain('useGroupCurrency(groupId)');
    expect(envelopesSource).toContain('useGroupCurrency(groupId)');
    expect(activitySource).toContain('useGroupCurrency(params.groupId)');
    expect(reportsSource).toContain('useGroupCurrency(params.groupId)');

    for (const source of [dashboardRoute, dashboardSource, envelopesSource, activitySource, reportsSource]) {
      expect(source).not.toContain("currency: 'INR'");
      expect(source).not.toContain('currency="INR"');
    }
    expect(readFileSync(new URL('../src/app/groups/[groupId]/settings/page.tsx', import.meta.url), 'utf8')).toContain('useGroupCurrency(params.groupId)');
  });

});

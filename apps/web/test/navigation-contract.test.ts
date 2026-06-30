import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('shared wallet chrome contract', () => {
  test('bottom nav renders only the four destinations', () => {
    const nav = source('../src/components/bottom-nav.tsx');
    expect(nav).toContain("href={`/groups/${groupId}`}");
    expect(nav).toContain("href={`/groups/${groupId}/envelopes`}");
    expect(nav).toContain("href={`/groups/${groupId}/activity`}");
    expect(nav).toContain("href={`/groups/${groupId}/settings`}");
    expect(nav).toContain('wallet-bottom-nav');
    expect(nav).not.toContain('aria-label="Add expense"');
    expect(nav).not.toContain('wallet-bottom-nav-add');
    expect(nav).not.toContain('>+</Link>');
  });

  test('bottom nav uses icon-only accessible destinations', () => {
    const nav = source('../src/components/bottom-nav.tsx');
    expect(nav).toContain('aria-label="Home"');
    expect(nav).toContain('aria-label="Envelope"');
    expect(nav).toContain('aria-label="Activity"');
    expect(nav).toContain('aria-label="Profile"');
    expect(nav).toContain('className="wallet-bottom-nav-icon"');
    expect(nav).not.toContain('<span>Home</span>');
    expect(nav).not.toContain('<span>Env</span>');
    expect(nav).not.toContain('<span>Act</span>');
    expect(nav).not.toContain('<span>Set</span>');
  });

  test('bottom nav stays reachable above the screen edge with larger icon affordances', () => {
    const recipes = source('../src/styles/recipes.css');
    expect(recipes).toContain('bottom: max(var(--space-3), env(safe-area-inset-bottom, 0px));');
    expect(recipes).toContain('grid-template-columns: repeat(4, minmax(44px, 1fr));');
    expect(recipes).toContain('min-height: 44px;');
    expect(recipes).toContain('padding: 8px 12px;');
    expect(recipes).toContain('width: 28px;');
    expect(recipes).toContain('height: 28px;');
  });

  test('app shell composes page content with bottom navigation', () => {
    const shell = source('../src/components/app-shell.tsx');
    expect(shell).toContain('export function AppShell');
    expect(shell).toContain('wallet-app-root');
    expect(shell).toContain('wallet-page');
    expect(shell).toContain('<BottomNav groupId={groupId}');
  });

  test('page header supports actions and tabs inside the hero card', () => {
    const header = source('../src/components/header.tsx');
    expect(header).toContain('export function PageHeader');
    expect(header).toContain('wallet-page-header');
    expect(header).toContain('wallet-overline');
    expect(header).toContain('actions');
    expect(header).toContain('tabs');
    expect(header).toContain('role="tab"');
    expect(header).toContain('aria-selected={Boolean(tab.active)}');
  });

  test('auth sheet exposes mobile bottom sheet chrome', () => {
    const sheet = source('../src/components/sheet.tsx');
    expect(sheet).toContain('export function AuthSheetShell');
    expect(sheet).toContain('wallet-sheet');
    expect(sheet).toContain('wallet-sheet-handle');
    expect(sheet).toContain('footer');
    expect(sheet).toContain('hero');
  });
});

describe('group subpage layout contract', () => {
  test('envelopes page uses tabs in hero header and app shell', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('<AppShell groupId={groupId} active="envelopes">');
    expect(page).toContain('title="Envelopes"');
    expect(page).toContain("tabs={[");
    expect(page).toContain("{ label: 'Active', active: true }");
    expect(page).toContain("{ label: 'Archived' }");
  });

  test('envelopes page exposes create envelope sheet', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('useForm<{ name: string }>');
    expect(page).toContain('const [createEnvelopeOpened, setCreateEnvelopeOpened] = useState(false);');
    expect(page).toContain('<Button className="wallet-button-success" onClick={() => setCreateEnvelopeOpened(true)}>Create envelope</Button>');
    expect(page).toContain('title="Create envelope"');
    expect(page).toContain('formId="create-envelope-form"');
    expect(page).toContain('id="create-envelope-form"');
    expect(page).toContain('`/groups/${groupId}/envelopes`');
    expect(page).toContain("method: 'POST'");
    expect(page).toContain('body: JSON.stringify({ name: values.name.trim() })');
    expect(page).toContain('await loadEnvelopes();');
  });

  test('envelopes page uses a stable primitive group id for reload effects', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('const groupId = params.groupId;');
    expect(page).toContain('<AppShell groupId={groupId} active="envelopes">');
    expect(page).toContain('`/groups/${groupId}/envelopes`');
    expect(page).toContain('}, [groupId]);');
    expect(page).not.toContain('[params.groupId]');
  });

  test('envelopes page owns funding transfer and success feedback', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('const [actionMessage, setActionMessage] = useState<string | null>(null);');
    expect(page).toContain('const [openedForm, setOpenedForm] = useState<FormKind | null>(null);');
    expect(page).toContain("onClick={() => setOpenedForm('funding')}");
    expect(page).toContain("onClick={() => setOpenedForm('transfer')}");
    expect(page).toContain('variant="success"');
    expect(page).toContain('Envelope created');
    expect(page).toContain('Envelope funded');
    expect(page).toContain('Transfer completed');
    expect(page).toContain("allowedForms={['funding', 'transfer']}");
    expect(page).toContain('openedForm={openedForm}');
    expect(page).toContain('onFundEnvelope={fundEnvelope}');
    expect(page).toContain('onTransfer={transferEnvelope}');
    expect(page).toContain('notifyWalletDataChanged();');
    expect(page).toContain('`/groups/${groupId}/envelopes/${values.envelopeId}/funding`');
    expect(page).toContain('const createdEnvelope = await apiClient.request<EnvelopeSummary>');
    expect(page).toContain('currentEnvelopes.some((envelope) => envelope.id === createdEnvelope.id)');
    expect(page).toContain('setCreateEnvelopeOpened(false);');
    expect(page).toContain("className=\"wallet-button-primary\" onClick={() => setOpenedForm('funding')}");
    expect(page).toContain('`/groups/${groupId}/transfers`');
  });

  test('activity page uses date-grouped card rows', () => {
    const page = source('../src/app/groups/[groupId]/activity/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="activity" narrow>');
    expect(page).toContain('Today');
    expect(page).toContain('Earlier');
    expect(page).toContain('wallet-table-card');
  });

  test('reports page uses KPI chart and spending cards', () => {
    const page = source('../src/app/groups/[groupId]/reports/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId}>');
    expect(page).toContain('wallet-report-chart');
    expect(page).toContain('wallet-spending-card');
    expect(page).toContain('Spent this month');
  });

  test('reports route is not highlighted as Activity in bottom nav', () => {
    const shell = source('../src/components/app-shell.tsx');
    const nav = source('../src/components/bottom-nav.tsx');
    const page = source('../src/app/groups/[groupId]/reports/page.tsx');

    expect(shell).toContain('active?: BottomNavActive');
    expect(nav).toContain('active?: BottomNavActive');
    expect(page).toContain('<AppShell groupId={params.groupId}>');
    expect(page).not.toContain('active="activity"');
  });

  test('settings page uses profile header and sectioned cards', () => {
    const page = source('../src/app/groups/[groupId]/settings/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="settings" narrow>');
    expect(page).toContain('wallet-settings-profile');
    expect(page).toContain('Group');
    expect(page).toContain('Appearance');
    expect(page).toContain('Account');
  });
});

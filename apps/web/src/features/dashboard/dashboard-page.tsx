'use client';

import { Button, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-store';
import { useGroupCurrency } from '../../lib/group-currency';
import { subscribeWalletDataRefresh } from '../../lib/wallet-data-refresh';
import { StaleDataBanner } from '../../components/stale-data-banner';
import { AppShell } from '../../components/app-shell';
import { PageHeader } from '../../components/header';
import { AlertBanner } from '../../components/alert-banner';
import { StatusStrip } from '../../components/status-strip';
import { QuickActionChips } from '../../components/quick-action-chips';
import { EnvelopeCard } from '../envelopes/envelope-card';
import { EnvelopeForms, type FormKind } from '../envelopes/envelope-forms';
import { AlertInbox } from '../alerts/alert-inbox';
import type { ActivityItem, DashboardSummary } from './types';

interface DashboardPageProps {
  groupId: string;
}

interface InviteResponse {
  token?: string;
}


const DASHBOARD_STALE_MAX_AGE_MS = 5 * 60 * 1000;

export function DashboardPage({ groupId }: DashboardPageProps) {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [openedForm, setOpenedForm] = useState<FormKind | null>(null);
  const { accessToken, isRefreshing } = useAuth();
  const currency = useGroupCurrency(groupId);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency }), [currency]);

  const loadDashboard = useCallback(async () => {
    const dashboard = await apiClient.request<DashboardSummary>(`/groups/${groupId}/dashboard`);
    return dashboard;
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    if (isRefreshing) return;
    if (!accessToken) return;

    async function loadInitialDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const nextDashboard = await loadDashboard();
        if (!cancelled) setDashboard(nextDashboard);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isRefreshing, loadDashboard]);

  useEffect(() => {
    if (isRefreshing || accessToken) return;
    setDashboard(null);
    setError('Authentication required');
    setIsLoading(false);
  }, [accessToken, isRefreshing]);


  async function refetchDashboard() {
    if (isRefreshing || !accessToken) return;
    try {
      const nextDashboard = await loadDashboard();
      setDashboard(nextDashboard);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh dashboard');
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeWalletDataRefresh(refetchDashboard);
    window.addEventListener('focus', refetchDashboard);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', refetchDashboard);
    };
  }, [accessToken, isRefreshing, loadDashboard]);

  async function runMutation(request: () => Promise<void>, successMessage: string) {
    setIsMutating(true);
    setError(null);
    setActionMessage(null);
    try {
      await request();
      await refetchDashboard();
      setActionMessage(successMessage);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Action failed';
      setError(message);
      throw requestError;
    } finally {
      setIsMutating(false);
    }
  }

  async function createInvite() {
    await runMutation(async () => {
      const invite = await apiClient.request<InviteResponse>(`/groups/${groupId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ expiresInHours: 72 }),
      });
      if (invite.token) setInviteUrl(`${window.location.origin}/invites/${invite.token}`);
    }, 'Invite link created');
  }

  function openDashboardForm(form: FormKind) {
    setOpenedForm(form);
  }

  const lowBalanceEnvelopes = dashboard?.envelopes.filter((envelope) => envelope.balanceMinor >= 0 && envelope.balanceMinor < 1000) ?? [];
  const activeEnvelopeCount = dashboard?.envelopes.filter((envelope) => !envelope.archivedAt).length ?? 0;

  return (
    <AppShell groupId={groupId} active="home">
      <PageHeader
        overline="Envelope-first"
        title={dashboard?.group.name ?? 'Group'}
        description="Track shared budgets, funding, spending, recurring expenses, and household activity."
        tone="info"
        actions={(
          <Button className="wallet-button-secondary" onClick={() => void createInvite()} loading={isMutating}>Create invite</Button>
        )}
      />
      <Stack gap="lg">
        {dashboard ? <StaleDataBanner generatedAt={dashboard.generatedAt} maxAgeMs={DASHBOARD_STALE_MAX_AGE_MS} /> : <StaleDataBanner />}

        {inviteUrl ? <AlertBanner variant="info" title="Invite action ready">Share this invite link: {inviteUrl}</AlertBanner> : null}
        {actionMessage ? <AlertBanner variant="success">{actionMessage}</AlertBanner> : null}
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}

        {isLoading ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : dashboard ? (
          <Stack gap="xl">
            <SimpleGrid className="wallet-dashboard-summary-grid" cols={{ base: 2, sm: 4 }} spacing="sm">
              <SummaryCard label="Total available" value={moneyFormatter.format(dashboard.totalAvailableMinor / 100)} tone="success" />
              <SummaryCard label="Spent this month" value={moneyFormatter.format(dashboard.spentThisMonthMinor / 100)} tone="danger" />
              <SummaryCard label="Overspent" value={String(dashboard.overspent.length)} tone="warn" />
              <SummaryCard label="Recurring" value={String(dashboard.upcomingRecurring.length)} tone="info" />
            </SimpleGrid>

            <StatusStrip overspentCount={dashboard.overspent.length} lowBalanceCount={lowBalanceEnvelopes.length} />

            <section className="wallet-section">
              <div className="wallet-section-heading">
                <div>
                  <div className="wallet-overline">Quick actions</div>
                  <h2>Add expense · Recurring</h2>
                </div>
              </div>
              <QuickActionChips onSelect={openDashboardForm} />
            </section>

            <div data-testid="dashboard-action-sheets-host" hidden={openedForm === null} style={{ display: 'contents' }}>
              <EnvelopeForms
                envelopes={dashboard.envelopes}
                currency={currency}
                openedForm={openedForm}
                onCloseForm={() => setOpenedForm(null)}
                allowedForms={['expense', 'recurring']}
                onAddExpense={(values) => runMutation(
                  async () => {
                    await apiClient.request<unknown>(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(values) });
                  },
                  'Expense added',
                )}
                onCreateRecurring={(values) => runMutation(
                  async () => {
                    await apiClient.request<unknown>(`/groups/${groupId}/recurring-expenses`, { method: 'POST', body: JSON.stringify(values) });
                  },
                  'Recurring expense created',
                )}
              />
            </div>

            <section className="wallet-section">
              <div className="wallet-section-heading">
                <div>
                  <div className="wallet-overline">Envelopes</div>
                  <h2>Funding status</h2>
                </div>
                <span className="wallet-pill">{activeEnvelopeCount} active</span>
              </div>
              {dashboard.envelopes.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {dashboard.envelopes.map((envelope) => <EnvelopeCard key={envelope.id} envelope={envelope} currency={currency} />)}
                </SimpleGrid>
              ) : (
                <EmptyState title="No envelopes yet" description="Create envelopes to split the group balance into spendable categories." />
              )}
            </section>

            <AlertInbox overspent={dashboard.overspent} lowBalance={lowBalanceEnvelopes} currency={currency} />

            <section className="wallet-section">
              <div className="wallet-section-heading">
                <div>
                  <div className="wallet-overline">Recurring</div>
                  <h2>Upcoming recurring expenses</h2>
                </div>
                <span className="wallet-pill">Next 10</span>
              </div>
              {dashboard.upcomingRecurring.length > 0 ? (
                <div className="wallet-table-card">
                  {dashboard.upcomingRecurring.map((item) => (
                    <div key={item.id} className="wallet-table-row">
                      <span className="wallet-status-dot wallet-status-warn" aria-hidden="true" />
                      <div>
                        <strong>{item.title}</strong>
                        <div className="wallet-muted">Due {new Date(item.nextDueAt).toLocaleDateString()}</div>
                      </div>
                      <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No upcoming recurring expenses" description="Scheduled rent, subscriptions, or bills will appear here before they are confirmed." />
              )}
            </section>

            <section className="wallet-section">
              <div className="wallet-section-heading">
                <div>
                  <div className="wallet-overline">Activity</div>
                  <h2>Recent activity</h2>
                </div>
                <Text size="sm" c="dimmed">Updated {new Date(dashboard.generatedAt).toLocaleString()}</Text>
              </div>
              {dashboard.recentActivity.length > 0 ? (
                <div className="wallet-table-card">
                  {dashboard.recentActivity.map((item) => <ActivityRow key={`${item.type}-${item.id}`} item={item} currency={currency} />)}
                </div>
              ) : (
                <EmptyState title="No activity yet" description="Funding, transfers, and expenses will create a timeline for the group here." />
              )}
            </section>
          </Stack>
        ) : <EmptyState title="Dashboard unavailable" description={error ?? 'Refresh the page to try again.'} />}
      </Stack>
    </AppShell>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'info' | 'success' | 'warn' | 'danger' }) {
  return (
    <article className={`wallet-card wallet-card-${tone}`}>
      <div className="wallet-overline">{label}</div>
      <div className="wallet-summary-value">{value}</div>
    </article>
  );
}


function ActivityRow({ item, currency }: { item: ActivityItem; currency: string }) {
  const moneyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  const color = item.type === 'expense' ? 'wallet-status-danger' : item.type === 'funding' ? 'wallet-status-success' : 'wallet-status-info';

  return (
    <div className="wallet-table-row">
      <span className={`wallet-status-dot ${color}`} aria-hidden="true" />
      <div>
        <strong>{item.title}</strong>
        <div className="wallet-muted">{item.type} · {new Date(item.occurredAt).toLocaleString()}</div>
      </div>
      <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <article className="wallet-card">
      <strong>{title}</strong>
      <p className="wallet-muted">{description}</p>
    </article>
  );
}

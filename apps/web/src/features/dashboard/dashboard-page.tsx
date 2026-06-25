'use client';

import { Alert, Badge, Button, Card, Container, Divider, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { EnvelopeCard } from '../envelopes/envelope-card';
import { EnvelopeForms, type FormKind } from '../envelopes/envelope-forms';
import type { ActivityItem, DashboardSummary, EnvelopeSummary } from './types';

interface DashboardPageProps {
  groupId: string;
  currency: string;
}

interface InviteResponse {
  token?: string;
}


const dashboardFormIds: Record<FormKind, string> = {
  expense: 'expense-form',
  funding: 'funding-form',
  transfer: 'transfer-form',
  recurring: 'recurring-form',
};
export function DashboardPage({ groupId, currency }: DashboardPageProps) {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormKind>('expense');
  const [pendingFocusForm, setPendingFocusForm] = useState<FormKind | null>(null);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency }), [currency]);

  const loadDashboard = useCallback(async () => {
    const dashboard = await apiClient.request<DashboardSummary>(`/groups/${groupId}/dashboard`);
    return dashboard;
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;

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
  }, [loadDashboard]);

  useEffect(() => {
    if (!pendingFocusForm || selectedForm !== pendingFocusForm) return;

    const form = document.getElementById(dashboardFormIds[pendingFocusForm]);
    if (!form) return;

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button, [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
    setPendingFocusForm(null);
  }, [pendingFocusForm, selectedForm]);

  async function refetchDashboard() {
    const nextDashboard = await loadDashboard();
    setDashboard(nextDashboard);
  }

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

  function focusDashboardForm(form: FormKind) {
    setSelectedForm(form);
    setPendingFocusForm(form);
  }

  const lowBalanceEnvelopes = dashboard?.envelopes.filter((envelope) => envelope.balanceMinor >= 0 && envelope.balanceMinor < 1000) ?? [];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="start">
          <div>
            <Badge color="teal" variant="light">Envelope-first</Badge>
            <Title order={1} mt="xs">Group dashboard</Title>
            <Text c="dimmed">Track the shared budget for group {groupId}.</Text>
          </div>
          <Button onClick={() => void createInvite()} loading={isMutating}>Create invite</Button>
        </Group>

        {inviteUrl ? <Alert color="teal" title="Invite action ready">Share this invite link: {inviteUrl}</Alert> : null}
        {actionMessage ? <Alert color="green">{actionMessage}</Alert> : null}
        {error ? <Alert color="red">{error}</Alert> : null}

        {isLoading ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : dashboard ? (
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <SummaryCard label="Total available" value={moneyFormatter.format(dashboard.totalAvailableMinor / 100)} tone="teal" />
              <SummaryCard label="Spent this month" value={moneyFormatter.format(dashboard.spentThisMonthMinor / 100)} tone="blue" />
            </SimpleGrid>

            <Group gap="sm">
              <Button onClick={() => focusDashboardForm('expense')}>Add expense</Button>
              <Button onClick={() => focusDashboardForm('funding')} variant="light">Fund envelope</Button>
              <Button onClick={() => focusDashboardForm('transfer')} variant="light">Transfer</Button>
              <Button onClick={() => focusDashboardForm('recurring')} variant="light">Create recurring</Button>
            </Group>

            <EnvelopeForms
              envelopes={dashboard.envelopes}
              currency={currency}
              selectedForm={selectedForm}
              onSelectedFormChange={setSelectedForm}
              onAddExpense={(values) => runMutation(
                async () => {
                  await apiClient.request<unknown>(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(values) });
                },
                'Expense added',
              )}
              onFundEnvelope={(values) => runMutation(
                async () => {
                  const { envelopeId, ...body } = values;
                  await apiClient.request<unknown>(`/groups/${groupId}/envelopes/${envelopeId}/funding`, { method: 'POST', body: JSON.stringify(body) });
                },
                'Envelope funded',
              )}
              onTransfer={(values) => runMutation(
                async () => {
                  await apiClient.request<unknown>(`/groups/${groupId}/transfers`, { method: 'POST', body: JSON.stringify(values) });
                },
                'Transfer complete',
              )}
              onCreateRecurring={(values) => runMutation(
                async () => {
                  await apiClient.request<unknown>(`/groups/${groupId}/recurring-expenses`, { method: 'POST', body: JSON.stringify(values) });
                },
                'Recurring expense created',
              )}
            />

            <section>
              <Group justify="space-between" mb="md">
                <Title order={2}>Envelope cards</Title>
                <Text size="sm" c="dimmed">{dashboard.envelopes.length} active and archived envelopes</Text>
              </Group>
              {dashboard.envelopes.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {dashboard.envelopes.map((envelope) => <EnvelopeCard key={envelope.id} envelope={envelope} currency={currency} />)}
                </SimpleGrid>
              ) : (
                <EmptyState title="No envelopes yet" description="Create envelopes to split the group balance into spendable categories." />
              )}
            </section>

            <AttentionArea overspent={dashboard.overspent} lowBalance={lowBalanceEnvelopes} currency={currency} />

            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={2}>Upcoming recurring expenses</Title>
                <Badge variant="light">Next 10</Badge>
              </Group>
              {dashboard.upcomingRecurring.length > 0 ? (
                <Stack gap="sm">
                  {dashboard.upcomingRecurring.map((item) => (
                    <Group key={item.id} justify="space-between">
                      <div>
                        <Text fw={600}>{item.title}</Text>
                        <Text size="sm" c="dimmed">Due {new Date(item.nextDueAt).toLocaleDateString()}</Text>
                      </div>
                      <Text fw={700}>{moneyFormatter.format(item.amountMinor / 100)}</Text>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <EmptyState title="No upcoming recurring expenses" description="Scheduled rent, subscriptions, or bills will appear here before they are confirmed." />
              )}
            </Card>

            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={2}>Recent activity</Title>
                <Text size="sm" c="dimmed">Updated {new Date(dashboard.generatedAt).toLocaleString()}</Text>
              </Group>
              {dashboard.recentActivity.length > 0 ? (
                <Stack gap="sm">
                  {dashboard.recentActivity.map((item) => <ActivityRow key={`${item.type}-${item.id}`} item={item} currency={currency} />)}
                </Stack>
              ) : (
                <EmptyState title="No activity yet" description="Funding, transfers, and expenses will create a timeline for the group here." />
              )}
            </Card>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="xs">
        <Text size="sm" tt="uppercase" c="dimmed" fw={700}>{label}</Text>
        <Text size="2rem" fw={900} c={tone}>{value}</Text>
      </Stack>
    </Card>
  );
}

function AttentionArea({ overspent, lowBalance, currency }: { overspent: EnvelopeSummary[]; lowBalance: EnvelopeSummary[]; currency: string }) {
  const moneyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });

  return (
    <Card withBorder radius="lg" padding="lg">
      <Title order={2}>Overspent and low balance attention</Title>
      <Text c="dimmed" size="sm" mt="xs">Review envelopes that need funding or spending changes.</Text>
      <Divider my="md" />
      {overspent.length === 0 && lowBalance.length === 0 ? (
        <Alert color="teal">No overspent or low balance envelopes right now.</Alert>
      ) : (
        <Stack gap="sm">
          {overspent.map((envelope) => (
            <Group key={envelope.id} justify="space-between">
              <Text fw={600}>{envelope.name}</Text>
              <Badge color="red">Overspent {moneyFormatter.format(envelope.balanceMinor / 100)}</Badge>
            </Group>
          ))}
          {lowBalance.map((envelope) => (
            <Group key={envelope.id} justify="space-between">
              <Text fw={600}>{envelope.name}</Text>
              <Badge color="yellow">Low balance {moneyFormatter.format(envelope.balanceMinor / 100)}</Badge>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

function ActivityRow({ item, currency }: { item: ActivityItem; currency: string }) {
  const moneyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  const color = item.type === 'expense' ? 'red' : item.type === 'funding' ? 'teal' : 'blue';

  return (
    <Group justify="space-between" align="start">
      <div>
        <Text fw={600}>{item.title}</Text>
        <Text size="sm" c="dimmed">{item.type} · {new Date(item.occurredAt).toLocaleString()}</Text>
      </div>
      <Text fw={700} c={color}>{moneyFormatter.format(item.amountMinor / 100)}</Text>
    </Group>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card withBorder radius="md" padding="md" bg="gray.0">
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed">{description}</Text>
    </Card>
  );
}

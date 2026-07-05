'use client';

import { Button, Group, Loader, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
import { AlertBanner } from '../../../../components/alert-banner';
import type { ActivityItem, ActivityPage } from '../../../../features/dashboard/types';
import { apiClient } from '../../../../lib/api-client';
import { useGroupCurrency } from '../../../../lib/group-currency';

export default function GroupActivityPage() {
  const params = useParams<{ groupId: string }>();
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [nextActivityOffset, setNextActivityOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = useGroupCurrency(params.groupId);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency }), [currency]);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<ActivityPage>(`/groups/${params.groupId}/activity?limit=10`);
        if (!cancelled) {
          setActivityItems(response.items);
          setNextActivityOffset(response.nextOffset);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load activity');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [params.groupId]);

  async function loadMoreActivity() {
    if (nextActivityOffset === null) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await apiClient.request<ActivityPage>(`/groups/${params.groupId}/activity?limit=10&offset=${nextActivityOffset}`);
      setActivityItems((currentItems) => [...currentItems, ...response.items]);
      setNextActivityOffset(response.nextOffset);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load more activity');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const todayKey = utcDateKey(new Date().toISOString());
  const todayItems = activityItems.filter((item) => utcDateKey(item.occurredAt) === todayKey);
  const earlierItems = activityItems.filter((item) => utcDateKey(item.occurredAt) !== todayKey);

  return (
    <AppShell groupId={params.groupId} active="activity" narrow>
      <PageHeader
        overline="Ledger"
        title="Activity"
        description="A chronological ledger of envelope funding, transfers, and expenses."
        tone="info"
      />
      <Stack gap="lg">
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && activityItems.length === 0 ? (
          <AlertBanner title="No activity yet">
            Funding entries, envelope transfers, and expense confirmations appear here once your group starts using envelopes.
          </AlertBanner>
        ) : null}
        <ActivityGroup title="Today" items={todayItems} moneyFormatter={moneyFormatter} />
        <ActivityGroup title="Earlier" items={earlierItems} moneyFormatter={moneyFormatter} />
        {nextActivityOffset !== null ? (
          <Group justify="center">
            <Button className="wallet-button-secondary" loading={isLoadingMore} onClick={() => void loadMoreActivity()}>
              Load more activity
            </Button>
          </Group>
        ) : null}
      </Stack>
    </AppShell>
  );
}

function utcDateKey(isoDate: string) {
  return new Date(isoDate).toISOString().slice(0, 10);
}

function ActivityGroup({
  title,
  items,
  moneyFormatter,
}: {
  title: string;
  items: ActivityItem[];
  moneyFormatter: Intl.NumberFormat;
}) {
  if (items.length === 0) return null;

  return (
    <section className="wallet-section">
      <div className="wallet-overline">{title}</div>
      <div className="wallet-table-card">
        <div className="wallet-table-header"><span /> <span>Item</span><span>Amount</span></div>
        {items.map((item) => {
          const status = item.type === 'expense' ? 'wallet-status-danger' : item.type === 'funding' ? 'wallet-status-success' : '';
          return (
            <div key={`${item.type}-${item.id}`} className="wallet-table-row">
              <span className={`wallet-status-dot ${status}`} aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <div className="wallet-muted">{item.type} · {new Date(item.occurredAt).toLocaleString()}</div>
              </div>
              <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

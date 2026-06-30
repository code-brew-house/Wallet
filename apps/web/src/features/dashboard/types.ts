export interface EnvelopeSummary {
  id: string;
  name: string;
  balanceMinor: number;
  archivedAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'funding' | 'transfer' | 'expense';
  title: string;
  amountMinor: number;
  occurredAt: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextOffset: number | null;
  limit: number;
}

export interface DashboardSummary {
  group: { id: string; name: string };
  totalAvailableMinor: number;
  spentThisMonthMinor: number;
  envelopes: EnvelopeSummary[];
  overspent: EnvelopeSummary[];
  upcomingRecurring: Array<{ id: string; title: string; amountMinor: number; nextDueAt: string }>;
  recentActivity: ActivityItem[];
  generatedAt: string;
}

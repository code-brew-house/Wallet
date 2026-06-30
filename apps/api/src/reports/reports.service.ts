import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnvelopeBalanceService, type EnvelopeSummary } from '../envelopes/envelope-balance.service';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RecurringExpenseDto } from '../recurring-expenses/recurring-expenses.service';

type Frequency = 'weekly' | 'monthly' | 'yearly';

type FundingRecord = {
  id: string;
  amountMinor: number;
  note: string | null;
  createdAt: Date;
  envelope: { name: string };
};

type TransferRecord = {
  id: string;
  amountMinor: number;
  note: string | null;
  createdAt: Date;
  fromEnvelope: { name: string };
  toEnvelope: { name: string };
};

type ExpenseRecord = {
  id: string;
  amountMinor: number;
  createdAt: Date;
  title: string;
};

type RecurringExpenseRecord = {
  id: string;
  groupId: string;
  envelopeId: string;
  amountMinor: number;
  title: string;
  frequency: Frequency;
  nextDueAt: Date;
  note: string | null;
  active: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

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
  upcomingRecurring: RecurringExpenseDto[];
  recentActivity: ActivityItem[];
  generatedAt: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
    @Inject(EnvelopeBalanceService) private readonly balanceService: EnvelopeBalanceService,
  ) {}

  async getDashboard(userId: string, groupId: string): Promise<DashboardSummary> {
    await this.memberships.requireMembership(userId, groupId);

    const group = await this.prisma.group.findFirst({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    if (!group) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Group not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [envelopes, spent, upcomingRecurring, recentActivity] = await Promise.all([
      this.balanceService.getGroupEnvelopeSummaries(groupId),
      this.prisma.expense.aggregate({
        where: { groupId, deletedAt: null, spentAt: { gte: startOfMonth, lte: now } },
        _sum: { amountMinor: true },
      }),
      this.getUpcomingRecurring(groupId),
      this.getRecentActivityPage(groupId, 0, 10),
    ]);

    const totalAvailableMinor = envelopes.reduce((sum, envelope) => sum + envelope.balanceMinor, 0);
    const overspent = envelopes.filter((envelope) => envelope.balanceMinor < 0);

    return {
      group,
      totalAvailableMinor,
      spentThisMonthMinor: spent._sum.amountMinor ?? 0,
      envelopes,
      overspent,
      upcomingRecurring,
      recentActivity: recentActivity.items,
      generatedAt: now.toISOString(),
    };
  }

  async getActivityPage(userId: string, groupId: string, offset: number, limit: number): Promise<ActivityPage> {
    await this.memberships.requireMembership(userId, groupId);
    return this.getRecentActivityPage(groupId, offset, limit);
  }

  private async getUpcomingRecurring(groupId: string): Promise<RecurringExpenseDto[]> {
    const recurringExpenses = await this.prisma.recurringExpense.findMany({
      where: { groupId, active: true },
      orderBy: [{ nextDueAt: 'asc' }, { createdAt: 'asc' }],
      take: 10,
    });
    return recurringExpenses.map((recurring) => this.serializeRecurring(recurring as RecurringExpenseRecord));
  }

  private async getRecentActivityPage(groupId: string, offset: number, limit: number): Promise<ActivityPage> {
    const safeOffset = Math.max(0, Math.trunc(offset));
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));
    const fetchLimit = safeOffset + safeLimit + 1;
    const [funding, transfers, expenses] = await Promise.all([
      this.prisma.envelopeFunding.findMany({
        where: { groupId, deletedAt: null },
        include: { envelope: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: fetchLimit,
      }),
      this.prisma.envelopeTransfer.findMany({
        where: { groupId, deletedAt: null },
        include: {
          fromEnvelope: { select: { name: true } },
          toEnvelope: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: fetchLimit,
      }),
      this.prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: fetchLimit,
      }),
    ]);

    const sortedActivity = [
      ...(funding as FundingRecord[]).map((item) => this.serializeFundingActivity(item)),
      ...(transfers as TransferRecord[]).map((item) => this.serializeTransferActivity(item)),
      ...(expenses as ExpenseRecord[]).map((item) => this.serializeExpenseActivity(item)),
    ].sort(compareActivityDescending);
    const items = sortedActivity.slice(safeOffset, safeOffset + safeLimit);

    return {
      items,
      nextOffset: sortedActivity.length > safeOffset + safeLimit ? safeOffset + safeLimit : null,
      limit: safeLimit,
    };
  }

  private serializeFundingActivity(funding: FundingRecord): ActivityItem {
    return {
      id: funding.id,
      type: 'funding',
      title: funding.note ?? `Funded ${funding.envelope.name}`,
      amountMinor: funding.amountMinor,
      occurredAt: funding.createdAt.toISOString(),
    };
  }

  private serializeTransferActivity(transfer: TransferRecord): ActivityItem {
    return {
      id: transfer.id,
      type: 'transfer',
      title: transfer.note ?? `${transfer.fromEnvelope.name} to ${transfer.toEnvelope.name}`,
      amountMinor: transfer.amountMinor,
      occurredAt: transfer.createdAt.toISOString(),
    };
  }

  private serializeExpenseActivity(expense: ExpenseRecord): ActivityItem {
    return {
      id: expense.id,
      type: 'expense',
      title: expense.title,
      amountMinor: expense.amountMinor,
      occurredAt: expense.createdAt.toISOString(),
    };
  }

  private serializeRecurring(recurring: RecurringExpenseRecord): RecurringExpenseDto {
    return {
      id: recurring.id,
      groupId: recurring.groupId,
      envelopeId: recurring.envelopeId,
      amountMinor: recurring.amountMinor,
      title: recurring.title,
      frequency: recurring.frequency,
      nextDueAt: recurring.nextDueAt.toISOString(),
      note: recurring.note,
      active: recurring.active,
      createdById: recurring.createdById,
      createdAt: recurring.createdAt.toISOString(),
      updatedAt: recurring.updatedAt.toISOString(),
    };
  }
}

function compareActivityDescending(left: ActivityItem, right: ActivityItem): number {
  const timeDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
  if (timeDifference !== 0) return timeDifference;
  const typeDifference = left.type.localeCompare(right.type);
  return typeDifference !== 0 ? typeDifference : left.id.localeCompare(right.id);
}

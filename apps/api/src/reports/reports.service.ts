import { Inject, Injectable } from '@nestjs/common';
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
  spentAt: Date;
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

export interface DashboardSummary {
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

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [envelopes, spent, upcomingRecurring, recentActivity] = await Promise.all([
      this.balanceService.getGroupEnvelopeSummaries(groupId),
      this.prisma.expense.aggregate({
        where: { groupId, deletedAt: null, spentAt: { gte: startOfMonth, lte: now } },
        _sum: { amountMinor: true },
      }),
      this.getUpcomingRecurring(groupId),
      this.getRecentActivity(groupId),
    ]);

    const totalAvailableMinor = envelopes.reduce((sum, envelope) => sum + envelope.balanceMinor, 0);
    const overspent = envelopes.filter((envelope) => envelope.balanceMinor < 0);

    return {
      totalAvailableMinor,
      spentThisMonthMinor: spent._sum.amountMinor ?? 0,
      envelopes,
      overspent,
      upcomingRecurring,
      recentActivity,
      generatedAt: now.toISOString(),
    };
  }

  private async getUpcomingRecurring(groupId: string): Promise<RecurringExpenseDto[]> {
    const recurringExpenses = await this.prisma.recurringExpense.findMany({
      where: { groupId, active: true },
      orderBy: [{ nextDueAt: 'asc' }, { createdAt: 'asc' }],
      take: 10,
    });
    return recurringExpenses.map((recurring) => this.serializeRecurring(recurring as RecurringExpenseRecord));
  }

  private async getRecentActivity(groupId: string): Promise<ActivityItem[]> {
    const [funding, transfers, expenses] = await Promise.all([
      this.prisma.envelopeFunding.findMany({
        where: { groupId, deletedAt: null },
        include: { envelope: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.envelopeTransfer.findMany({
        where: { groupId, deletedAt: null },
        include: {
          fromEnvelope: { select: { name: true } },
          toEnvelope: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        orderBy: { spentAt: 'desc' },
        take: 10,
      }),
    ]);

    return [
      ...(funding as FundingRecord[]).map((item) => this.serializeFundingActivity(item)),
      ...(transfers as TransferRecord[]).map((item) => this.serializeTransferActivity(item)),
      ...(expenses as ExpenseRecord[]).map((item) => this.serializeExpenseActivity(item)),
    ]
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, 10);
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
      occurredAt: expense.spentAt.toISOString(),
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

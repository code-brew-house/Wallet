import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnvelopeBalanceService, type EnvelopeSummary } from '../envelopes/envelope-balance.service';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RecurringExpenseDto } from '../recurring-expenses/recurring-expenses.service';

type Frequency = 'weekly' | 'monthly' | 'yearly';

type ActivityRow = {
  id: string;
  type: 'funding' | 'transfer' | 'expense';
  title: string;
  amountMinor: number;
  occurredAt: Date;
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
    const rows = await this.prisma.$queryRaw<ActivityRow[]>`
      SELECT *
      FROM (
        SELECT
          funding."id",
          'funding' AS "type",
          COALESCE(funding."note", 'Funded ' || envelope."name") AS "title",
          funding."amountMinor",
          funding."createdAt" AS "occurredAt"
        FROM "EnvelopeFunding" funding
        INNER JOIN "Envelope" envelope ON envelope."id" = funding."envelopeId"
        WHERE funding."groupId" = ${groupId} AND funding."deletedAt" IS NULL

        UNION ALL

        SELECT
          transfer."id",
          'transfer' AS "type",
          COALESCE(transfer."note", from_envelope."name" || ' to ' || to_envelope."name") AS "title",
          transfer."amountMinor",
          transfer."createdAt" AS "occurredAt"
        FROM "EnvelopeTransfer" transfer
        INNER JOIN "Envelope" from_envelope ON from_envelope."id" = transfer."fromEnvelopeId"
        INNER JOIN "Envelope" to_envelope ON to_envelope."id" = transfer."toEnvelopeId"
        WHERE transfer."groupId" = ${groupId} AND transfer."deletedAt" IS NULL

        UNION ALL

        SELECT
          expense."id",
          'expense' AS "type",
          expense."title",
          expense."amountMinor",
          expense."createdAt" AS "occurredAt"
        FROM "Expense" expense
        WHERE expense."groupId" = ${groupId} AND expense."deletedAt" IS NULL
      ) activity
      ORDER BY "occurredAt" DESC, "type" ASC, "id" ASC
      LIMIT ${safeLimit + 1} OFFSET ${safeOffset}
    `;
    const items = rows.slice(0, safeLimit).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      amountMinor: row.amountMinor,
      occurredAt: row.occurredAt.toISOString(),
    }));

    return {
      items,
      nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null,
      limit: safeLimit,
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


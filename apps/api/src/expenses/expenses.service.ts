import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/enums';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto';
import { EnvelopeBalanceService, type EnvelopeSummary } from '../envelopes/envelope-balance.service';

type ExpenseRecord = {
  id: string;
  groupId: string;
  envelopeId: string;
  amountMinor: number;
  spentAt: Date;
  title: string;
  note: string | null;
  createdById: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ExpenseLookupClient = Pick<PrismaService, 'envelope'>;

export type ExpenseDto = {
  id: string;
  groupId: string;
  envelopeId: string;
  amountMinor: number;
  spentAt: string;
  title: string;
  note: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

const MANAGER_ROLES: MembershipRole[] = ['owner', 'admin'];

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
    @Inject(EnvelopeBalanceService) private readonly balances: EnvelopeBalanceService,
  ) {}

  async createExpense(userId: string, groupId: string, dto: CreateExpenseDto): Promise<{ expense: ExpenseDto; summary: EnvelopeSummary }> {
    await this.memberships.requireMembership(userId, groupId);
    await this.requireEnvelopeInGroup(dto.envelopeId, groupId);

    const expense = await this.prisma.expense.create({
      data: {
        groupId,
        envelopeId: dto.envelopeId,
        amountMinor: dto.amountMinor,
        spentAt: new Date(dto.spentAt),
        title: dto.title,
        note: dto.note || null,
        createdById: userId,
      },
    });

    return { expense: this.serializeExpense(expense), summary: await this.balances.getEnvelopeSummary(dto.envelopeId) };
  }

  async listExpenses(userId: string, groupId: string): Promise<ExpenseDto[]> {
    await this.memberships.requireMembership(userId, groupId);
    const expenses = await this.prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map((expense) => this.serializeExpense(expense));
  }

  async deleteExpense(userId: string, groupId: string, expenseId: string): Promise<{ deleted: true; summary: EnvelopeSummary }> {
    const membership = await this.memberships.requireMembership(userId, groupId);
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, groupId, deletedAt: null } });
    if (!expense) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Expense not found' });

    if (expense.createdById !== userId && !MANAGER_ROLES.includes(membership.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient group role' });
    }

    await this.prisma.expense.update({ where: { id: expense.id }, data: { deletedAt: new Date() } });
    return { deleted: true, summary: await this.balances.getEnvelopeSummary(expense.envelopeId) };
  }

  private async requireEnvelopeInGroup(envelopeId: string, groupId: string, client: ExpenseLookupClient = this.prisma) {
    const envelope = await client.envelope.findFirst({ where: { id: envelopeId, groupId } });
    if (!envelope) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Envelope not found' });
    return envelope;
  }

  private serializeExpense(expense: ExpenseRecord): ExpenseDto {
    return {
      id: expense.id,
      groupId: expense.groupId,
      envelopeId: expense.envelopeId,
      amountMinor: expense.amountMinor,
      spentAt: expense.spentAt.toISOString(),
      title: expense.title,
      note: expense.note,
      createdById: expense.createdById,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}

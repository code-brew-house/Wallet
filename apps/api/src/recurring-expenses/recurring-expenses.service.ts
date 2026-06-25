import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseDto } from '../expenses/expenses.service';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringExpenseDto } from './dto';

type Frequency = 'weekly' | 'monthly' | 'yearly';

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
  createdAt: Date;
  updatedAt: Date;
};

type RecurringLookupClient = Pick<PrismaService, 'envelope'>;

export type RecurringExpenseDto = {
  id: string;
  groupId: string;
  envelopeId: string;
  amountMinor: number;
  title: string;
  frequency: Frequency;
  nextDueAt: string;
  note: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class RecurringExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
  ) {}

  async createRecurring(userId: string, groupId: string, dto: CreateRecurringExpenseDto): Promise<RecurringExpenseDto> {
    await this.memberships.requireMembership(userId, groupId);
    await this.requireEnvelopeInGroup(dto.envelopeId, groupId);

    const recurring = await this.prisma.recurringExpense.create({
      data: {
        groupId,
        envelopeId: dto.envelopeId,
        amountMinor: dto.amountMinor,
        title: dto.title,
        frequency: dto.frequency,
        nextDueAt: new Date(dto.nextDueAt),
        note: dto.note,
      },
    });

    return this.serializeRecurring(recurring as RecurringExpenseRecord);
  }

  async listUpcoming(userId: string, groupId: string): Promise<RecurringExpenseDto[]> {
    await this.memberships.requireMembership(userId, groupId);
    const recurringExpenses = await this.prisma.recurringExpense.findMany({
      where: { groupId, active: true },
      orderBy: [{ nextDueAt: 'asc' }, { createdAt: 'asc' }],
    });
    return recurringExpenses.map((recurring) => this.serializeRecurring(recurring as RecurringExpenseRecord));
  }

  async confirmOccurrence(userId: string, groupId: string, recurringExpenseId: string): Promise<{ expense: ExpenseDto; nextDueAt: string }> {
    await this.memberships.requireMembership(userId, groupId);

    return this.prisma.$transaction(async (tx) => {
      const recurring = (await tx.recurringExpense.findFirst({
        where: { id: recurringExpenseId, groupId, active: true },
      })) as RecurringExpenseRecord | null;
      if (!recurring) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Recurring expense not found' });

      await this.requireEnvelopeInGroup(recurring.envelopeId, groupId, tx);
      const nextDueAt = advanceDueDate(recurring.nextDueAt, recurring.frequency);

      const expense = await tx.expense.create({
        data: {
          groupId,
          envelopeId: recurring.envelopeId,
          amountMinor: recurring.amountMinor,
          spentAt: recurring.nextDueAt,
          title: recurring.title,
          note: recurring.note,
          createdById: userId,
        },
      });
      const updatedRecurring = await tx.recurringExpense.update({ where: { id: recurring.id }, data: { nextDueAt } });

      return {
        expense: this.serializeExpense(expense),
        nextDueAt: updatedRecurring.nextDueAt.toISOString(),
      };
    });
  }

  private async requireEnvelopeInGroup(envelopeId: string, groupId: string, client: RecurringLookupClient = this.prisma) {
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
      createdAt: recurring.createdAt.toISOString(),
      updatedAt: recurring.updatedAt.toISOString(),
    };
  }
}

function advanceDueDate(current: Date, frequency: Frequency): Date {
  const next = new Date(current);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
  return next;
}

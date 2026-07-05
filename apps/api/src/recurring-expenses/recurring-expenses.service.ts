import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseDto } from '../expenses/expenses.service';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringExpenseDto } from './dto';
import { Prisma } from '../generated/prisma/client';

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
  createdById: string;
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
  createdById: string;
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
    await this.memberships.requireRole(userId, groupId, ['owner', 'admin']);
    await this.requireEnvelopeInGroup(dto.envelopeId, groupId);

    const recurring = await this.prisma.recurringExpense.create({
      data: {
        groupId,
        envelopeId: dto.envelopeId,
        amountMinor: dto.amountMinor,
        title: dto.title,
        frequency: dto.frequency,
        nextDueAt: new Date(dto.nextDueAt),
        note: dto.note || null,
        createdById: userId,
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
    await this.memberships.requireRole(userId, groupId, ['owner', 'admin']);

    return this.runSerializableRecurringConfirmation(async () =>
      this.prisma.$transaction(
        async (tx) => {
          const recurring = (await tx.recurringExpense.findFirst({
            where: { id: recurringExpenseId, groupId, active: true },
          })) as RecurringExpenseRecord | null;
          if (!recurring) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Recurring expense not found' });

          await this.requireEnvelopeInGroup(recurring.envelopeId, groupId, tx);
          const nextDueAt = advanceDueDate(recurring.nextDueAt, recurring.frequency);

          const updatedRecurring = await tx.recurringExpense.updateMany({
            where: { id: recurring.id, groupId, active: true, nextDueAt: recurring.nextDueAt },
            data: { nextDueAt },
          });
          if (updatedRecurring.count !== 1) {
            throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Recurring expense was already confirmed; refresh and try again' });
          }

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

          return {
            expense: this.serializeExpense(expense),
            nextDueAt: nextDueAt.toISOString(),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  private async runSerializableRecurringConfirmation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isPrismaSerializationFailure(error)) {
        throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Recurring expense could not be confirmed safely; retry' });
      }
      throw error;
    }
  }

  private isPrismaSerializationFailure(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { code?: unknown; cause?: { originalCode?: unknown; kind?: unknown } };
    return candidate.code === 'P2034' || candidate.cause?.originalCode === '40001' || candidate.cause?.kind === 'TransactionWriteConflict';
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
      createdById: recurring.createdById,
      createdAt: recurring.createdAt.toISOString(),
      updatedAt: recurring.updatedAt.toISOString(),
    };
  }
}

function advanceDueDate(current: Date, frequency: Frequency): Date {
  if (frequency === 'weekly') return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (frequency === 'yearly') {
    const targetYear = current.getUTCFullYear() + 1;
    const targetMonth = current.getUTCMonth();
    const day = Math.min(current.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));
    return new Date(Date.UTC(targetYear, targetMonth, day, current.getUTCHours(), current.getUTCMinutes(), current.getUTCSeconds(), current.getUTCMilliseconds()));
  }

  const targetYear = current.getUTCFullYear() + (current.getUTCMonth() === 11 ? 1 : 0);
  const targetMonth = (current.getUTCMonth() + 1) % 12;
  const day = Math.min(current.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day, current.getUTCHours(), current.getUTCMinutes(), current.getUTCSeconds(), current.getUTCMilliseconds()));
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

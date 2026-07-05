import { describe, expect, test } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../src/generated/prisma/client';
import { RecurringExpensesService } from '../src/recurring-expenses/recurring-expenses.service';

const dueDate = new Date('2026-01-15T00:00:00.000Z');
const createdAt = new Date('2025-12-01T00:00:00.000Z');

function createRecurringRecord() {
  return {
    id: 'recurring-1',
    groupId: 'group-1',
    envelopeId: 'envelope-1',
    amountMinor: 12345,
    title: 'Rent',
    frequency: 'monthly' as const,
    nextDueAt: dueDate,
    note: null,
    active: true,
    createdById: 'user-1',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('recurring expense concurrency', () => {
  test('confirmOccurrence surfaces serialization conflicts without retrying into another occurrence', async () => {
    let attempts = 0;
    const transactionOptions: unknown[] = [];
    const prisma = {
      $transaction: async (_callback: unknown, options?: unknown) => {
        attempts += 1;
        transactionOptions.push(options);
        throw { code: 'P2034' };
      },
    };
    const memberships = { requireRole: async () => undefined };
    const service = new RecurringExpensesService(prisma as never, memberships as never);

    await expect(service.confirmOccurrence('user-1', 'group-1', 'recurring-1')).rejects.toBeInstanceOf(BadRequestException);

    expect(attempts).toBe(1);
    expect(transactionOptions).toEqual([{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }]);
  });

  test('monthly recurrence clamps end-of-month dates in UTC', async () => {
    const updatedNextDueDates: Date[] = [];
    const recurring = { ...createRecurringRecord(), nextDueAt: new Date('2026-01-31T00:00:00.000Z') };
    const tx = {
      envelope: { findFirst: async () => ({ id: recurring.envelopeId, groupId: recurring.groupId }) },
      expense: {
        create: async ({ data }: { data: { spentAt: Date; groupId: string; envelopeId: string; amountMinor: number; title: string; note: string | null; createdById: string } }) => ({
          id: 'expense-1',
          ...data,
          deletedAt: null,
          createdAt,
          updatedAt: createdAt,
        }),
      },
      recurringExpense: {
        findFirst: async () => recurring,
        updateMany: async ({ data }: { data: { nextDueAt: Date } }) => {
          updatedNextDueDates.push(data.nextDueAt);
          return { count: 1 };
        },
      },
    };
    const prisma = {
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    };
    const memberships = { requireRole: async () => undefined };
    const service = new RecurringExpensesService(prisma as never, memberships as never);

    const result = await service.confirmOccurrence('user-1', 'group-1', recurring.id);

    expect(result.nextDueAt).toBe('2026-02-28T00:00:00.000Z');
    expect(updatedNextDueDates[0]?.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  test('does not create an expense when another confirmation already advanced the due date', async () => {
    let expenseCreateCalls = 0;
    const recurring = createRecurringRecord();
    const tx = {
      envelope: { findFirst: async () => ({ id: recurring.envelopeId, groupId: recurring.groupId }) },
      expense: {
        create: async ({ data }: { data: { spentAt: Date; groupId: string; envelopeId: string; amountMinor: number; title: string; note: string | null; createdById: string } }) => {
          expenseCreateCalls += 1;
          return {
            id: 'expense-1',
            ...data,
            deletedAt: null,
            createdAt,
            updatedAt: createdAt,
          };
        },
      },
      recurringExpense: {
        findFirst: async () => recurring,
        update: async ({ data }: { data: { nextDueAt: Date } }) => ({ ...recurring, nextDueAt: data.nextDueAt }),
        updateMany: async () => ({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    };
    const memberships = { requireRole: async () => undefined };
    const service = new RecurringExpensesService(prisma as never, memberships as never);

    await expect(service.confirmOccurrence('user-1', 'group-1', recurring.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(expenseCreateCalls).toBe(0);
  });
});

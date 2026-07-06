import { describe, expect, test } from 'bun:test';
import { EnvelopeBalanceService } from '../src/envelopes/envelope-balance.service';

describe('EnvelopeBalanceService', () => {
  test('summarizes group envelopes with grouped ledger queries instead of per-envelope aggregates', async () => {
    const recordedCalls: string[] = [];

    const fakeEnvelopes = [
      { id: 'env-groceries', name: 'Groceries', archivedAt: null },
      { id: 'env-rent', name: 'Rent', archivedAt: null },
      { id: 'env-utilities', name: 'Utilities', archivedAt: null },
      { id: 'env-travel', name: 'Travel', archivedAt: null },
      { id: 'env-buffer', name: 'Buffer', archivedAt: null },
    ];

    const fakeClient = {
      envelope: {
        findMany: async () => {
          recordedCalls.push('envelope.findMany');
          return fakeEnvelopes;
        },
        findUniqueOrThrow: async () => {
          recordedCalls.push('envelope.findUniqueOrThrow');
          throw new Error('getGroupEnvelopeSummaries must not call getEnvelopeSummary per envelope');
        },
      },
      envelopeFunding: {
        groupBy: async (args: { by: string[]; where: { groupId: string }; _sum: { amountMinor: boolean } }) => {
          recordedCalls.push('envelopeFunding.groupBy');
          return [
            { envelopeId: 'env-groceries', _sum: { amountMinor: 10000 } },
            { envelopeId: 'env-rent', _sum: { amountMinor: 50000 } },
            { envelopeId: 'env-utilities', _sum: { amountMinor: 12000 } },
            { envelopeId: 'env-travel', _sum: { amountMinor: 20000 } },
          ];
        },
        aggregate: async () => {
          recordedCalls.push('aggregate:envelopeFunding');
          throw new Error('per-envelope aggregate should not be called');
        },
      },
      envelopeTransfer: {
        groupBy: async (args: { by: string[]; where: { groupId: string }; _sum: { amountMinor: boolean } }) => {
          const by = args.by;
          if (by.length === 1 && by[0] === 'toEnvelopeId') {
            recordedCalls.push('envelopeTransfer.groupBy:toEnvelopeId');
            return [{ toEnvelopeId: 'env-travel', _sum: { amountMinor: 5000 } }];
          }
          if (by.length === 1 && by[0] === 'fromEnvelopeId') {
            recordedCalls.push('envelopeTransfer.groupBy:fromEnvelopeId');
            return [{ fromEnvelopeId: 'env-groceries', _sum: { amountMinor: 2500 } }];
          }
          recordedCalls.push(`envelopeTransfer.groupBy:${by.join(',')}`);
          return [];
        },
        aggregate: async () => {
          recordedCalls.push('aggregate:envelopeTransfer');
          throw new Error('per-envelope aggregate should not be called');
        },
      },
      expense: {
        groupBy: async (args: { by: string[]; where: { groupId: string }; _sum: { amountMinor: boolean } }) => {
          recordedCalls.push('expense.groupBy');
          return [
            { envelopeId: 'env-groceries', _sum: { amountMinor: 3000 } },
            { envelopeId: 'env-utilities', _sum: { amountMinor: 4000 } },
            { envelopeId: 'env-travel', _sum: { amountMinor: 1000 } },
          ];
        },
        aggregate: async () => {
          recordedCalls.push('aggregate:expense');
          throw new Error('per-envelope aggregate should not be called');
        },
      },
    };

    const service = new EnvelopeBalanceService(fakeClient as never);
    const result = await service.getGroupEnvelopeSummaries('group-1', fakeClient as never);

    expect(result).toEqual([
      { id: 'env-groceries', name: 'Groceries', archivedAt: null, balanceMinor: 4500 },
      { id: 'env-rent', name: 'Rent', archivedAt: null, balanceMinor: 50000 },
      { id: 'env-utilities', name: 'Utilities', archivedAt: null, balanceMinor: 8000 },
      { id: 'env-travel', name: 'Travel', archivedAt: null, balanceMinor: 24000 },
      { id: 'env-buffer', name: 'Buffer', archivedAt: null, balanceMinor: 0 },
    ]);

    // No per-envelope aggregate or findUniqueOrThrow calls should have been made
    const bannedPrefixes = ['aggregate:'];
    for (const call of recordedCalls) {
      expect(bannedPrefixes.some((p) => call.startsWith(p))).toBe(false);
    }
    expect(recordedCalls).not.toContain('envelope.findUniqueOrThrow');

    // The grouped calls we DO expect
    expect(recordedCalls).toContain('envelope.findMany');
    expect(recordedCalls).toContain('envelopeFunding.groupBy');
    expect(recordedCalls).toContain('envelopeTransfer.groupBy:toEnvelopeId');
    expect(recordedCalls).toContain('envelopeTransfer.groupBy:fromEnvelopeId');
    expect(recordedCalls).toContain('expense.groupBy');
  });
});

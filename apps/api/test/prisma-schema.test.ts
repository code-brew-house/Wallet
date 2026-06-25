import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

describe('Prisma schema', () => {
  test('defines all MVP tables and integer minor-unit money fields', () => {
    for (const model of [
      'User',
      'Group',
      'Membership',
      'Invite',
      'Envelope',
      'EnvelopeFunding',
      'EnvelopeTransfer',
      'Expense',
      'RecurringExpense',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }

    expect(schema).toContain('amountMinor Int');
    expect(schema).not.toContain('Float');
    expect(schema).not.toContain('Decimal');
  });
});

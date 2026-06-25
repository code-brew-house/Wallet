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

  test('enforces user foreign keys for invite and transfer audit fields', () => {
    expect(schema).toMatch(/createdInvites\s+Invite\[\]\s+@relation\("InviteCreatedBy"\)/);
    expect(schema).toMatch(/acceptedInvites\s+Invite\[\]\s+@relation\("InviteAcceptedBy"\)/);
    expect(schema).toMatch(/createdTransfers\s+EnvelopeTransfer\[\]\s+@relation\("EnvelopeTransferCreatedBy"\)/);
    expect(schema).toMatch(/createdBy\s+User\s+@relation\("InviteCreatedBy", fields: \[createdById\], references: \[id\]\)/);
    expect(schema).toMatch(/acceptedBy\s+User\?\s+@relation\("InviteAcceptedBy", fields: \[acceptedById\], references: \[id\]\)/);
    expect(schema).toMatch(/createdBy\s+User\s+@relation\("EnvelopeTransferCreatedBy", fields: \[createdById\], references: \[id\]\)/);
  });
});

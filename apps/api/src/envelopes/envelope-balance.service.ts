import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EnvelopeBalanceClient = Pick<PrismaService, 'envelope' | 'envelopeFunding' | 'envelopeTransfer' | 'expense'>;

export interface EnvelopeSummary {
  id: string;
  name: string;
  balanceMinor: number;
  archivedAt: string | null;
}

@Injectable()
export class EnvelopeBalanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getGroupEnvelopeSummaries(groupId: string, client: EnvelopeBalanceClient = this.prisma): Promise<EnvelopeSummary[]> {
    const envelopes = await client.envelope.findMany({ where: { groupId }, orderBy: { createdAt: 'asc' } });
    if (envelopes.length === 0) return [];

    const [fundingRows, incomingRows, outgoingRows, expenseRows] = await Promise.all([
      client.envelopeFunding.groupBy({ by: ['envelopeId'], where: { groupId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.envelopeTransfer.groupBy({ by: ['toEnvelopeId'], where: { groupId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.envelopeTransfer.groupBy({ by: ['fromEnvelopeId'], where: { groupId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.expense.groupBy({ by: ['envelopeId'], where: { groupId, deletedAt: null }, _sum: { amountMinor: true } }),
    ]);

    const fundingByEnvelopeId = new Map<string, number>(fundingRows.map((row) => [row.envelopeId, row._sum.amountMinor ?? 0]));
    const incomingByEnvelopeId = new Map<string, number>(incomingRows.map((row) => [row.toEnvelopeId, row._sum.amountMinor ?? 0]));
    const outgoingByEnvelopeId = new Map<string, number>(outgoingRows.map((row) => [row.fromEnvelopeId, row._sum.amountMinor ?? 0]));
    const expensesByEnvelopeId = new Map<string, number>(expenseRows.map((row) => [row.envelopeId, row._sum.amountMinor ?? 0]));

    return envelopes.map((envelope) => ({
      id: envelope.id,
      name: envelope.name,
      archivedAt: envelope.archivedAt?.toISOString() ?? null,
      balanceMinor:
        (fundingByEnvelopeId.get(envelope.id) ?? 0) +
        (incomingByEnvelopeId.get(envelope.id) ?? 0) -
        (outgoingByEnvelopeId.get(envelope.id) ?? 0) -
        (expensesByEnvelopeId.get(envelope.id) ?? 0),
    }));
  }

  async getEnvelopeSummary(envelopeId: string, client: EnvelopeBalanceClient = this.prisma): Promise<EnvelopeSummary> {
    const envelope = await client.envelope.findUniqueOrThrow({ where: { id: envelopeId } });
    const [funding, incoming, outgoing, expenses] = await Promise.all([
      client.envelopeFunding.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.envelopeTransfer.aggregate({ where: { toEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.envelopeTransfer.aggregate({ where: { fromEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      client.expense.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
    ]);

    return {
      id: envelope.id,
      name: envelope.name,
      archivedAt: envelope.archivedAt?.toISOString() ?? null,
      balanceMinor:
        (funding._sum.amountMinor ?? 0) +
        (incoming._sum.amountMinor ?? 0) -
        (outgoing._sum.amountMinor ?? 0) -
        (expenses._sum.amountMinor ?? 0),
    };
  }
}

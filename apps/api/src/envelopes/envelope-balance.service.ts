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
    const summaries = await Promise.all(envelopes.map((envelope) => this.getEnvelopeSummary(envelope.id, client)));
    return summaries;
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

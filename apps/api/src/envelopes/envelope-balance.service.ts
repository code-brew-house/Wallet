import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EnvelopeSummary {
  id: string;
  name: string;
  balanceMinor: number;
  archivedAt: string | null;
}

@Injectable()
export class EnvelopeBalanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getGroupEnvelopeSummaries(groupId: string): Promise<EnvelopeSummary[]> {
    const envelopes = await this.prisma.envelope.findMany({ where: { groupId }, orderBy: { createdAt: 'asc' } });
    const summaries = await Promise.all(envelopes.map((envelope) => this.getEnvelopeSummary(envelope.id)));
    return summaries;
  }

  async getEnvelopeSummary(envelopeId: string): Promise<EnvelopeSummary> {
    const envelope = await this.prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId } });
    const [funding, incoming, outgoing, expenses] = await Promise.all([
      this.prisma.envelopeFunding.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.envelopeTransfer.aggregate({ where: { toEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.envelopeTransfer.aggregate({ where: { fromEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.expense.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
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

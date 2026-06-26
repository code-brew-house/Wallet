import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MembershipRole } from '../generated/prisma/enums';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnvelopeDto, FundEnvelopeDto, TransferEnvelopeDto } from './dto';
import { EnvelopeBalanceService, type EnvelopeSummary } from './envelope-balance.service';

type EnvelopeLookupClient = Pick<PrismaService, 'envelope'>;

const MANAGER_ROLES: MembershipRole[] = ['owner', 'admin'];
const SERIALIZABLE_RETRY_LIMIT = 5;

@Injectable()
export class EnvelopesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
    @Inject(EnvelopeBalanceService) private readonly balances: EnvelopeBalanceService,
  ) {}

  async createEnvelope(userId: string, groupId: string, dto: CreateEnvelopeDto): Promise<EnvelopeSummary> {
    await this.memberships.requireRole(userId, groupId, MANAGER_ROLES);
    const envelope = await this.prisma.envelope.create({ data: { groupId, name: dto.name } });
    return this.balances.getEnvelopeSummary(envelope.id);
  }

  async listEnvelopes(userId: string, groupId: string): Promise<EnvelopeSummary[]> {
    await this.memberships.requireMembership(userId, groupId);
    return this.balances.getGroupEnvelopeSummaries(groupId);
  }

  async fundEnvelope(
    userId: string,
    groupId: string,
    envelopeId: string,
    dto: FundEnvelopeDto,
  ): Promise<{ summary: EnvelopeSummary }> {
    await this.memberships.requireRole(userId, groupId, MANAGER_ROLES);
    await this.requireEnvelopeInGroup(envelopeId, groupId);

    await this.prisma.envelopeFunding.create({
      data: { groupId, envelopeId, amountMinor: dto.amountMinor, note: dto.note || null, createdById: userId },
    });

    return { summary: await this.balances.getEnvelopeSummary(envelopeId) };
  }

  async transfer(
    userId: string,
    groupId: string,
    dto: TransferEnvelopeDto,
  ): Promise<{ from: EnvelopeSummary; to: EnvelopeSummary }> {
    await this.memberships.requireRole(userId, groupId, MANAGER_ROLES);
    if (dto.fromEnvelopeId === dto.toEnvelopeId) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Transfer envelopes must be different' });
    }
    return this.runSerializableTransfer(async () =>
      this.prisma.$transaction(
        async (tx) => {
          await Promise.all([
            this.requireEnvelopeInGroup(dto.fromEnvelopeId, groupId, tx),
            this.requireEnvelopeInGroup(dto.toEnvelopeId, groupId, tx),
          ]);

          const sourceSummary = await this.balances.getEnvelopeSummary(dto.fromEnvelopeId, tx);
          if (sourceSummary.balanceMinor < dto.amountMinor) {
            throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Transfer exceeds source envelope balance' });
          }

          await tx.envelopeTransfer.create({
            data: {
              groupId,
              fromEnvelopeId: dto.fromEnvelopeId,
              toEnvelopeId: dto.toEnvelopeId,
              amountMinor: dto.amountMinor,
              note: dto.note || null,
              createdById: userId,
            },
          });

          const [from, to] = await Promise.all([
            this.balances.getEnvelopeSummary(dto.fromEnvelopeId, tx),
            this.balances.getEnvelopeSummary(dto.toEnvelopeId, tx),
          ]);
          return { from, to };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  private async requireEnvelopeInGroup(envelopeId: string, groupId: string, client: EnvelopeLookupClient = this.prisma) {
    const envelope = await client.envelope.findFirst({ where: { id: envelopeId, groupId } });
    if (!envelope) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Envelope not found' });
    return envelope;
  }

  private async runSerializableTransfer<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isPrismaSerializationFailure(error)) throw error;
        if (attempt === SERIALIZABLE_RETRY_LIMIT) {
          throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Transfer could not be applied safely; retry' });
        }
      }
    }

    throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Transfer could not be applied safely; retry' });
  }

  private isPrismaSerializationFailure(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { code?: unknown; cause?: { originalCode?: unknown; kind?: unknown } };
    return candidate.code === 'P2034' || candidate.cause?.originalCode === '40001' || candidate.cause?.kind === 'TransactionWriteConflict';
  }
}

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/enums';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnvelopeDto, FundEnvelopeDto, TransferEnvelopeDto } from './dto';
import { EnvelopeBalanceService, type EnvelopeSummary } from './envelope-balance.service';

const MANAGER_ROLES: MembershipRole[] = ['owner', 'admin'];

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
      data: { groupId, envelopeId, amountMinor: dto.amountMinor, note: dto.note, createdById: userId },
    });

    return { summary: await this.balances.getEnvelopeSummary(envelopeId) };
  }

  async transfer(
    userId: string,
    groupId: string,
    dto: TransferEnvelopeDto,
  ): Promise<{ from: EnvelopeSummary; to: EnvelopeSummary }> {
    await this.memberships.requireRole(userId, groupId, MANAGER_ROLES);
    await Promise.all([
      this.requireEnvelopeInGroup(dto.fromEnvelopeId, groupId),
      this.requireEnvelopeInGroup(dto.toEnvelopeId, groupId),
    ]);

    const sourceSummary = await this.balances.getEnvelopeSummary(dto.fromEnvelopeId);
    if (sourceSummary.balanceMinor < dto.amountMinor) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Transfer exceeds source envelope balance' });
    }

    await this.prisma.envelopeTransfer.create({
      data: {
        groupId,
        fromEnvelopeId: dto.fromEnvelopeId,
        toEnvelopeId: dto.toEnvelopeId,
        amountMinor: dto.amountMinor,
        note: dto.note,
        createdById: userId,
      },
    });

    const [from, to] = await Promise.all([
      this.balances.getEnvelopeSummary(dto.fromEnvelopeId),
      this.balances.getEnvelopeSummary(dto.toEnvelopeId),
    ]);
    return { from, to };
  }

  private async requireEnvelopeInGroup(envelopeId: string, groupId: string) {
    const envelope = await this.prisma.envelope.findFirst({ where: { id: envelopeId, groupId } });
    if (!envelope) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Envelope not found' });
    return envelope;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { InviteModel } from '../generated/prisma/models/Invite';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInviteDto } from './dto';

@Injectable()
export class InvitesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
  ) {}

  async createInvite(userId: string, groupId: string, dto: CreateInviteDto) {
    await this.memberships.requireRole(userId, groupId, ['owner', 'admin']);
    const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const tokenHash = await Bun.password.hash(token);
    const invite = await this.prisma.invite.create({
      data: {
        tokenHash,
        groupId,
        createdById: userId,
        expiresAt: new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000),
      },
    });
    return this.toInviteResponse(invite, token);
  }

  async acceptInvite(userId: string, token: string) {
    const invite = await this.findActiveInviteByToken(token);
    return this.prisma.$transaction(async (tx) => {
      const activeInvite = await tx.invite.findFirst({
        where: { id: invite.id, status: 'active', expiresAt: { gt: new Date() } },
      });
      if (!activeInvite) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invite not found' });

      return tx.membership.upsert({
        where: { groupId_userId: { groupId: activeInvite.groupId, userId } },
        update: {},
        create: { groupId: activeInvite.groupId, userId, role: 'member' },
      });
    });
  }

  async revokeInvite(userId: string, groupId: string, inviteId: string) {
    await this.memberships.requireRole(userId, groupId, ['owner', 'admin']);
    const updated = await this.prisma.invite.updateMany({
      where: { id: inviteId, groupId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invite not found' });
    const invite = await this.prisma.invite.findUniqueOrThrow({ where: { id: inviteId } });
    return this.toInviteResponse(invite);
  }

  private async findActiveInviteByToken(token: string) {
    const invites = await this.prisma.invite.findMany({
      where: { status: 'active', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });

    for (const invite of invites) {
      if (await Bun.password.verify(token, invite.tokenHash)) return invite;
    }

    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invite not found' });
  }

  private toInviteResponse(invite: InviteModel, token?: string) {
    return {
      id: invite.id,
      groupId: invite.groupId,
      createdById: invite.createdById,
      status: invite.status,
      expiresAt: invite.expiresAt,
      acceptedById: invite.acceptedById,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
      createdAt: invite.createdAt,
      ...(token ? { token } : {}),
    };
  }
}

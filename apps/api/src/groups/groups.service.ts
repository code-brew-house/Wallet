import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ApiErrorBody } from '@wallet/shared';
import type { ChangeRoleDto, CreateGroupDto } from './dto';
import { MembershipService } from '../memberships/membership.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.group.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        memberships: { some: { userId } },
      },
      select: { id: true, name: true },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'You already have a group with this name',
        details: { name: ['Open the existing group instead of creating a duplicate.'] },
      } satisfies ApiErrorBody);
    }
    const group = await this.prisma.$transaction(async (tx) => {
      const createdGroup = await tx.group.create({ data: { name, currency: dto.currency, createdById: userId } });
      await tx.membership.create({ data: { groupId: createdGroup.id, userId, role: 'owner' } });
      return createdGroup;
    });
    return group;
  }

  async listGroups(userId: string) {
    return this.prisma.group.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMembers(userId: string, groupId: string) {
    await this.memberships.requireMembership(userId, groupId);
    return this.prisma.membership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async changeMemberRole(userId: string, groupId: string, memberUserId: string, dto: ChangeRoleDto) {
    await this.memberships.requireRole(userId, groupId, ['owner', 'admin']);
    const membership = await this.prisma.membership.findUnique({ where: { groupId_userId: { groupId, userId: memberUserId } } });
    if (!membership) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (membership.role === 'owner') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Owner role cannot be changed' });
    }
    return this.prisma.membership.update({
      where: { groupId_userId: { groupId, userId: memberUserId } },
      data: { role: dto.role },
    });
  }
}

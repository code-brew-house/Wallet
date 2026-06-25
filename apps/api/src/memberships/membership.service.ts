import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async requireMembership(userId: string, groupId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!membership) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Group not found' });
    return membership;
  }

  async requireRole(userId: string, groupId: string, roles: MembershipRole[]) {
    const membership = await this.requireMembership(userId, groupId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient group role' });
    }
    return membership;
  }
}

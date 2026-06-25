import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvitesController } from '../invites/invites.controller';
import { InvitesService } from '../invites/invites.service';
import { MembershipService } from '../memberships/membership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GroupsController, InvitesController],
  providers: [GroupsService, MembershipService, InvitesService, JwtAuthGuard],
})
export class GroupsModule {}

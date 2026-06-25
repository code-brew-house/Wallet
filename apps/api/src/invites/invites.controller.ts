import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { createValidationPipe } from '../app.config';
import { CurrentUserParam } from '../auth/current-user';
import type { CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInviteDto } from './dto';
import { InvitesService } from './invites.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(@Inject(InvitesService) private readonly invites: InvitesService) {}

  @Post('groups/:groupId/invites')
  async createInvite(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(createValidationPipe(CreateInviteDto)) dto: CreateInviteDto,
  ) {
    return this.invites.createInvite(user.id, groupId, dto);
  }

  @Post('invites/:token/accept')
  async acceptInvite(@CurrentUserParam() user: CurrentUser, @Param('token') token: string) {
    return this.invites.acceptInvite(user.id, token);
  }

  @Post('groups/:groupId/invites/:inviteId/revoke')
  async revokeInvite(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invites.revokeInvite(user.id, groupId, inviteId);
  }
}

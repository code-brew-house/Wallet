import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createValidationPipe } from '../app.config';
import { CurrentUserParam } from '../auth/current-user';
import type { CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangeRoleDto, CreateGroupDto } from './dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(@Inject(GroupsService) private readonly groups: GroupsService) {}

  @Post()
  async createGroup(@CurrentUserParam() user: CurrentUser, @Body(createValidationPipe(CreateGroupDto)) dto: CreateGroupDto) {
    return this.groups.createGroup(user.id, dto);
  }

  @Get()
  async listGroups(@CurrentUserParam() user: CurrentUser) {
    return this.groups.listGroups(user.id);
  }

  @Get(':groupId/members')
  async listMembers(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.groups.listMembers(user.id, groupId);
  }

  @Patch(':groupId/members/:userId/role')
  async changeMemberRole(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('userId') memberUserId: string,
    @Body(createValidationPipe(ChangeRoleDto)) dto: ChangeRoleDto,
  ) {
    return this.groups.changeMemberRole(user.id, groupId, memberUserId, dto);
  }
}

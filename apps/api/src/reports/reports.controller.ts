import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUserParam, type CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

function parsePaginationNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

@Controller()
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get('groups/:groupId/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.reportsService.getDashboard(user.id, groupId);
  }

  @Get('groups/:groupId/activity')
  @UseGuards(JwtAuthGuard)
  getActivity(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getActivityPage(
      user.id,
      groupId,
      parsePaginationNumber(offset, 0),
      parsePaginationNumber(limit, 10),
    );
  }
}

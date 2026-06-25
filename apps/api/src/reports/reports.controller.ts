import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { CurrentUserParam, type CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get('groups/:groupId/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.reportsService.getDashboard(user.id, groupId);
  }
}

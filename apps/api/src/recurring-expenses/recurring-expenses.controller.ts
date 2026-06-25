import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { createValidationPipe } from '../app.config';
import { CurrentUserParam, type CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRecurringExpenseDto } from './dto';
import { RecurringExpensesService } from './recurring-expenses.service';

@Controller('groups/:groupId/recurring-expenses')
@UseGuards(JwtAuthGuard)
export class RecurringExpensesController {
  constructor(@Inject(RecurringExpensesService) private readonly recurringExpenses: RecurringExpensesService) {}

  @Post()
  async createRecurring(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(createValidationPipe(CreateRecurringExpenseDto)) dto: CreateRecurringExpenseDto,
  ) {
    return this.recurringExpenses.createRecurring(user.id, groupId, dto);
  }

  @Get('upcoming')
  async listUpcoming(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.recurringExpenses.listUpcoming(user.id, groupId);
  }

  @Post(':id/confirm')
  async confirmOccurrence(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    return this.recurringExpenses.confirmOccurrence(user.id, groupId, id);
  }
}

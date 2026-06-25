import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { createValidationPipe } from '../app.config';
import { CurrentUserParam, type CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto';
import { ExpensesService } from './expenses.service';

@Controller('groups/:groupId/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly expenses: ExpensesService) {}

  @Post()
  async createExpense(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(createValidationPipe(CreateExpenseDto)) dto: CreateExpenseDto,
  ) {
    return this.expenses.createExpense(user.id, groupId, dto);
  }

  @Get()
  async listExpenses(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.expenses.listExpenses(user.id, groupId);
  }

  @Delete(':expenseId')
  async deleteExpense(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.expenses.deleteExpense(user.id, groupId, expenseId);
  }
}

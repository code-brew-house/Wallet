import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MembershipService } from '../memberships/membership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RecurringExpensesController } from './recurring-expenses.controller';
import { RecurringExpensesService } from './recurring-expenses.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RecurringExpensesController],
  providers: [RecurringExpensesService, MembershipService, JwtAuthGuard],
})
export class RecurringExpensesModule {}

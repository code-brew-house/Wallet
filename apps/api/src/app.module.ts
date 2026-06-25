import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, GroupsModule, EnvelopesModule, ExpensesModule, RecurringExpensesModule],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnvelopesModule } from '../envelopes/envelopes.module';
import { MembershipService } from '../memberships/membership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [PrismaModule, AuthModule, EnvelopesModule],
  controllers: [ExpensesController],
  exports: [ExpensesService],
  providers: [ExpensesService, MembershipService, JwtAuthGuard],
})
export class ExpensesModule {}

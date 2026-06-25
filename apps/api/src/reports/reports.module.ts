import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnvelopesModule } from '../envelopes/envelopes.module';
import { MembershipService } from '../memberships/membership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule, AuthModule, EnvelopesModule],
  controllers: [ReportsController],
  providers: [ReportsService, MembershipService, JwtAuthGuard],
})
export class ReportsModule {}

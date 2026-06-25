import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MembershipService } from '../memberships/membership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EnvelopeBalanceService } from './envelope-balance.service';
import { EnvelopesController } from './envelopes.controller';
import { EnvelopesService } from './envelopes.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EnvelopesController],
  exports: [EnvelopeBalanceService],
  providers: [EnvelopesService, EnvelopeBalanceService, MembershipService, JwtAuthGuard],
})
export class EnvelopesModule {}

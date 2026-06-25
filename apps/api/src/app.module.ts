import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, GroupsModule, EnvelopesModule],
  controllers: [HealthController],
})
export class AppModule {}

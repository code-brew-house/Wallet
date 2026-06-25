import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { createValidationPipe } from '../app.config';
import { CurrentUserParam } from '../auth/current-user';
import type { CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEnvelopeDto, FundEnvelopeDto, TransferEnvelopeDto } from './dto';
import { EnvelopesService } from './envelopes.service';

@Controller('groups/:groupId')
@UseGuards(JwtAuthGuard)
export class EnvelopesController {
  constructor(@Inject(EnvelopesService) private readonly envelopes: EnvelopesService) {}

  @Get('envelopes')
  async listEnvelopes(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
    return this.envelopes.listEnvelopes(user.id, groupId);
  }

  @Post('envelopes')
  async createEnvelope(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(createValidationPipe(CreateEnvelopeDto)) dto: CreateEnvelopeDto,
  ) {
    return this.envelopes.createEnvelope(user.id, groupId, dto);
  }

  @Post('envelopes/:envelopeId/funding')
  async fundEnvelope(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('envelopeId') envelopeId: string,
    @Body(createValidationPipe(FundEnvelopeDto)) dto: FundEnvelopeDto,
  ) {
    return this.envelopes.fundEnvelope(user.id, groupId, envelopeId, dto);
  }

  @Post('transfers')
  async transfer(
    @CurrentUserParam() user: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(createValidationPipe(TransferEnvelopeDto)) dto: TransferEnvelopeDto,
  ) {
    return this.envelopes.transfer(user.id, groupId, dto);
  }
}

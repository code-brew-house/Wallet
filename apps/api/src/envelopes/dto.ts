import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateEnvelopeDto {
  @IsString()
  @Length(1, 80)
  name!: string;
}

export class FundEnvelopeDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(0, 240)
  note = '';
}

export class TransferEnvelopeDto {
  @IsString()
  fromEnvelopeId!: string;

  @IsString()
  toEnvelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(0, 240)
  note = '';
}

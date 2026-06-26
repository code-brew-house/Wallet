import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateEnvelopeDto {
  @IsString()
  @Length(1, 80)
  name!: string;
}

export class FundEnvelopeDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}

export class TransferEnvelopeDto {
  @IsString()
  fromEnvelopeId!: string;

  @IsString()
  toEnvelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}

import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  envelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsDateString()
  spentAt!: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}

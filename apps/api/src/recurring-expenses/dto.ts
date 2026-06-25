import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsString()
  envelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsIn(['weekly', 'monthly', 'yearly'])
  frequency!: 'weekly' | 'monthly' | 'yearly';

  @IsDateString()
  nextDueAt!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}

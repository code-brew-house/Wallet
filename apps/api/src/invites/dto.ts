import { IsInt, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours!: number;
}

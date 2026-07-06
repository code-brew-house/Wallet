import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';

export class CreateGroupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsIn(['INR', 'USD', 'EUR', 'GBP'])
  currency!: string;
}

export class ChangeRoleDto {
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}

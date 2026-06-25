import { IsIn, IsString, Length } from 'class-validator';

export class CreateGroupDto {
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

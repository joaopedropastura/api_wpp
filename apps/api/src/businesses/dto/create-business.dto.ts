import { IsString, IsIn, MinLength, MaxLength } from 'class-validator';
import type { BusinessType } from '@repo/types';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsIn(['barbershop', 'salon', 'store', 'restaurant', 'other'])
  type: BusinessType;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;
}

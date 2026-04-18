import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FaqItem, WorkingHours } from '@repo/types';

class FaqItemDto implements FaqItem {
  @IsString()
  @MaxLength(200)
  question: string;

  @IsString()
  @MaxLength(1000)
  answer: string;
}

class WorkingHoursDto implements WorkingHours {
  @IsString()
  open: string;

  @IsString()
  close: string;

  @IsArray()
  days: number[];
}

export class UpdateBotConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItem[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHours | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

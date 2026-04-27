import { DisputeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateModerationDisputeDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string;
}

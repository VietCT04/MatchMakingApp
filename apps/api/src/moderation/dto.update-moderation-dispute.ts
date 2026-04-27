import { DisputeStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateModerationDisputeDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  correctedTeamAScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  correctedTeamBScore?: number;
}

import { MatchStatus, SportFormat } from '@sports-matchmaking/shared';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  sportId!: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsUUID()
  createdByUserId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SportFormat)
  format!: SportFormat;

  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @IsDateString()
  startsAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  maxPlayers!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRating?: number;
}

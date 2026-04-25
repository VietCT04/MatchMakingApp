import { MatchStatus, SportFormat } from '@sports-matchmaking/shared';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MatchQueryDto {
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsEnum(SportFormat)
  format?: SportFormat;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

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

  @IsOptional()
  @IsDateString()
  startsAfter?: string;

  @IsOptional()
  @IsDateString()
  startsBefore?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;
}

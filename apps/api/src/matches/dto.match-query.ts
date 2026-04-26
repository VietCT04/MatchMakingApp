import { MatchStatus, SportFormat } from '@sports-matchmaking/shared';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, IsUUID, Max, Min } from 'class-validator';

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

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0.1)
  @Max(100)
  radiusKm?: number;
}

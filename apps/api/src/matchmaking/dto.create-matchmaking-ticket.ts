import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SportFormat } from '@sports-matchmaking/shared';

export class CreateMatchmakingTicketDto {
  @IsUUID()
  sportId!: string;

  @IsEnum(SportFormat)
  format!: SportFormat;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100)
  radiusKm = 5;

  @IsDateString()
  earliestStart!: string;

  @IsDateString()
  latestEnd!: string;

  @IsOptional()
  @IsUUID()
  preferredVenueId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minElo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxElo?: number;
}

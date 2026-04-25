import { SportFormat } from '@sports-matchmaking/shared';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAuthenticatedMatchDto {
  @IsUUID()
  sportId!: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SportFormat)
  format!: SportFormat;

  @IsDateString()
  startsAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
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

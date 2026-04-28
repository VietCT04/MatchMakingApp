import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateMyProfileDto {
  @IsString()
  @Length(2, 80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  homeLocationText?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  skillDescription?: string;
}

export class SportPreferenceItemDto {
  @IsUUID()
  sportId!: string;

  @IsBoolean()
  prefersSingles!: boolean;

  @IsBoolean()
  prefersDoubles!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPreferredRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPreferredRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class UpdateSportPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SportPreferenceItemDto)
  sports!: SportPreferenceItemDto[];
}

export class PreferredVenueItemDto {
  @IsUUID()
  venueId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class UpdatePreferredVenuesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferredVenueItemDto)
  venues!: PreferredVenueItemDto[];
}

export class AvailabilitySlotItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(HHMM_REGEX)
  startTime!: string;

  @IsString()
  @Matches(HHMM_REGEX)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotItemDto)
  availability!: AvailabilitySlotItemDto[];
}

export function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

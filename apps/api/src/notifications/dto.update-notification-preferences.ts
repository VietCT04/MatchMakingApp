import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  matchUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  results?: boolean;

  @IsOptional()
  @IsBoolean()
  trustSafety?: boolean;

  @IsOptional()
  @IsBoolean()
  ratingUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

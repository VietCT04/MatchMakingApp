import { IsBoolean, IsOptional } from 'class-validator';

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
}

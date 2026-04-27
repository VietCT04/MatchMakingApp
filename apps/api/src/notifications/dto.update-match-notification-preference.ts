import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, ValidateIf } from 'class-validator';

export class UpdateMatchNotificationPreferenceDto {
  @Type(() => Boolean)
  @IsBoolean()
  muted!: boolean;

  @IsOptional()
  @ValidateIf((o) => o.muteUntil !== null)
  @IsDateString()
  muteUntil?: string | null;
}

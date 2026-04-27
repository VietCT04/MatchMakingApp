import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ModerationNoShowAction {
  CONFIRM = 'CONFIRM',
  REVERSE = 'REVERSE',
}

export class UpdateModerationNoShowDto {
  @IsEnum(ModerationNoShowAction)
  action!: ModerationNoShowAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string;
}

import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserReportDto {
  @IsUUID()
  reportedUserId!: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsString()
  @MinLength(5)
  reason!: string;
}

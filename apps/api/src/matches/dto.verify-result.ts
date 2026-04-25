import { IsOptional, IsUUID } from 'class-validator';

export class VerifyResultDto {
  @IsOptional()
  @IsUUID()
  verifiedByUserId?: string;
}

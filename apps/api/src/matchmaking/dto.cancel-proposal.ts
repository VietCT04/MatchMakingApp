import { IsOptional, IsString, Length } from 'class-validator';

export class CancelProposalDto {
  @IsOptional()
  @IsString()
  @Length(1, 300)
  reason?: string;
}

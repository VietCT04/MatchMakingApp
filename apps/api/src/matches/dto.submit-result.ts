import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class SubmitResultDto {
  @IsUUID()
  submittedByUserId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  teamAScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  teamBScore!: number;
}

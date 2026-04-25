import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class SubmitResultDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  teamAScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  teamBScore!: number;
}

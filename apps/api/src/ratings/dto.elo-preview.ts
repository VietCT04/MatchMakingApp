import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class EloPreviewDto {
  @Type(() => Number)
  @IsNumber()
  playerRating!: number;

  @Type(() => Number)
  @IsNumber()
  opponentRating!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  actualScore!: number;
}

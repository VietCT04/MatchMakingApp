import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, Max, Min } from 'class-validator';

export class DoublesPreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  teamARatings!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  teamBRatings!: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  teamAActualScore!: number;
}

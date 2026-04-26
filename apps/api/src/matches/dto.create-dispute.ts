import { IsString, MinLength } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSportDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}

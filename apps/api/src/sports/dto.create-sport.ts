import { IsString, MaxLength } from 'class-validator';

export class CreateSportDto {
  @IsString()
  @MaxLength(50)
  name!: string;
}

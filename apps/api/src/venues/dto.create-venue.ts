import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

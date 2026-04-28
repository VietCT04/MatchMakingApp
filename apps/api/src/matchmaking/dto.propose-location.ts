import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl, Length, Max, Min } from 'class-validator';

export class ProposeLocationDto {
  @IsString()
  @Length(1, 120)
  locationName!: string;

  @IsOptional()
  @IsString()
  @Length(1, 250)
  address?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsUrl()
  googleMapsUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  googlePlaceId?: string;
}

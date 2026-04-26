import { PushDevicePlatform } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  expoPushToken!: string;

  @IsOptional()
  @IsEnum(PushDevicePlatform)
  platform?: PushDevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

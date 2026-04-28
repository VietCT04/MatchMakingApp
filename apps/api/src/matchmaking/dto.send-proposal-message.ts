import { IsString, Length } from 'class-validator';

export class SendProposalMessageDto {
  @IsString()
  @Length(1, 1000)
  body!: string;
}

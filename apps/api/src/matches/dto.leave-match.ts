import { IsUUID } from 'class-validator';

export class LeaveMatchDto {
  @IsUUID()
  userId!: string;
}

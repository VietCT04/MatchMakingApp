import { MatchParticipantStatus, Team } from '@sports-matchmaking/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class JoinMatchDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(MatchParticipantStatus)
  status?: MatchParticipantStatus = MatchParticipantStatus.JOINED;

  @IsOptional()
  @IsEnum(Team)
  team?: Team = Team.UNKNOWN;
}

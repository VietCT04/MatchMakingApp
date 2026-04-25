import { Team } from '@sports-matchmaking/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class JoinMatchDto {
  @IsOptional()
  @IsEnum(Team)
  team?: Team = Team.UNKNOWN;
}

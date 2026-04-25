import {
  MatchStatus as PrismaMatchStatus,
  SportFormat as PrismaSportFormat,
  Team as PrismaTeam,
} from '@prisma/client';
import { MatchStatus, SportFormat, Team } from '@sports-matchmaking/shared';

export function toPrismaSportFormat(format: SportFormat): PrismaSportFormat {
  return format as PrismaSportFormat;
}

export function toPrismaMatchStatus(status: MatchStatus): PrismaMatchStatus {
  return status as PrismaMatchStatus;
}

export function toPrismaTeam(team: Team): PrismaTeam {
  return team as PrismaTeam;
}

export enum SportFormat {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES',
}

export enum MatchStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchParticipantStatus {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  NO_SHOW = 'NO_SHOW',
}

export enum Team {
  A = 'A',
  B = 'B',
  UNKNOWN = 'UNKNOWN',
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  homeLocationText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SportDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueDto {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchDto {
  id: string;
  sportId: string;
  venueId: string | null;
  createdByUserId: string;
  title: string;
  description: string | null;
  format: SportFormat;
  status: MatchStatus;
  startsAt: string;
  maxPlayers: number;
  minRating: number | null;
  maxRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchParticipantDto {
  id: string;
  matchId: string;
  userId: string;
  status: MatchParticipantStatus;
  team: Team;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResultDto {
  id: string;
  matchId: string;
  submittedByUserId: string;
  teamAScore: number;
  teamBScore: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWithDetailsDto extends MatchDto {
  participants?: MatchParticipantDto[];
  result?: MatchResultDto | null;
  sport?: SportDto;
  venue?: VenueDto | null;
  distanceKm?: number;
  fitScore?: number;
  fitBreakdown?: {
    distanceScore: number;
    ratingFitScore: number;
    timeScore: number;
    slotAvailabilityScore: number;
  };
}

export interface RatingDto {
  id: string;
  userId: string;
  sportId: string;
  format: SportFormat;
  rating: number;
  gamesPlayed: number;
  uncertainty: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingHistoryDto {
  id: string;
  userId: string;
  sportId: string;
  matchId: string;
  oldRating: number;
  newRating: number;
  delta: number;
  createdAt: string;
}

export interface CreateMatchInput {
  sportId: string;
  venueId?: string;
  title: string;
  description?: string;
  format: SportFormat;
  startsAt: string;
  maxPlayers: number;
  minRating?: number;
  maxRating?: number;
}

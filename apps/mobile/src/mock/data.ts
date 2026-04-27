import {
  MatchStatus,
  MatchParticipantStatus,
  SportFormat,
  Team,
  UserRole,
  type MatchDto,
  type MatchWithDetailsDto,
  type RatingDto,
  type SportDto,
  type UserDto,
  type VenueDto,
} from '@sports-matchmaking/shared';

const now = new Date().toISOString();

export const mockUser: UserDto = {
  id: 'mock-user-1',
  email: 'demo@sports.app',
  role: UserRole.USER,
  displayName: 'Demo Player',
  bio: 'Weekend doubles enthusiast',
  homeLocationText: 'Singapore',
  createdAt: now,
  updatedAt: now,
};

export const mockMatches: MatchDto[] = [
  {
    id: 'mock-match-1',
    sportId: 'sport-badminton',
    venueId: 'venue-1',
    createdByUserId: 'mock-user-1',
    title: 'Badminton Ladder Session',
    description: 'Intermediate to advanced players',
    format: SportFormat.DOUBLES,
    status: MatchStatus.OPEN,
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    maxPlayers: 8,
    minRating: 1100,
    maxRating: 1500,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockMatchDetails: MatchWithDetailsDto[] = mockMatches.map((match) => ({
  ...match,
  participants: [
    {
      id: 'participant-1',
      matchId: match.id,
      userId: '11111111-1111-4111-8111-111111111111',
      status: MatchParticipantStatus.JOINED,
      team: Team.A,
      createdAt: now,
      updatedAt: now,
    },
  ],
  result: null,
}));

export const mockSports: SportDto[] = [
  { id: 'sport-badminton', name: 'badminton', createdAt: now, updatedAt: now },
  { id: 'sport-pickleball', name: 'pickleball', createdAt: now, updatedAt: now },
  { id: 'sport-tennis', name: 'tennis', createdAt: now, updatedAt: now },
];

export const mockVenues: VenueDto[] = [
  {
    id: 'venue-1',
    name: 'Central Sports Hall',
    address: '100 Stadium Road',
    latitude: 1.3048,
    longitude: 103.8318,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockRatings: RatingDto[] = [
  {
    id: 'rating-1',
    userId: 'mock-user-1',
    sportId: 'sport-badminton',
    format: SportFormat.DOUBLES,
    rating: 1234,
    gamesPlayed: 22,
    uncertainty: 180,
    createdAt: now,
    updatedAt: now,
  },
];

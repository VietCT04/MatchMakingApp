import { MatchParticipantStatus, MatchStatus, SportFormat, Team } from '@prisma/client';
import { RatingsService } from './ratings.service';

describe('RatingsService', () => {
  it('verifies a result, updates ratings, and creates rating history', async () => {
    const result = {
      id: 'result-1',
      matchId: 'match-1',
      teamAScore: 21,
      teamBScore: 17,
      verified: false,
    };
    const match = {
      id: 'match-1',
      sportId: 'sport-1',
      format: SportFormat.DOUBLES,
      participants: [
        { userId: 'user-a', team: Team.A, status: MatchParticipantStatus.JOINED },
        { userId: 'user-b', team: Team.B, status: MatchParticipantStatus.JOINED },
      ],
    };

    const tx = {
      matchResult: {
        findUnique: jest.fn().mockResolvedValue(result),
        update: jest.fn().mockResolvedValue({ ...result, verified: true }),
      },
      match: {
        findUnique: jest.fn().mockResolvedValue(match),
        update: jest.fn().mockResolvedValue({ ...match, status: MatchStatus.COMPLETED }),
      },
      userSportRating: {
        upsert: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'rating-a',
            userId: 'user-a',
            sportId: 'sport-1',
            format: SportFormat.DOUBLES,
            rating: 1200,
            gamesPlayed: 0,
            uncertainty: 350,
          })
          .mockResolvedValueOnce({
            id: 'rating-b',
            userId: 'user-b',
            sportId: 'sport-1',
            format: SportFormat.DOUBLES,
            rating: 1200,
            gamesPlayed: 0,
            uncertainty: 350,
          }),
        update: jest.fn(),
      },
      ratingHistory: {
        create: jest.fn(),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new RatingsService(prisma as any);

    const response = await service.verifyMatchResult('match-1', 'result-1');

    expect(response.result.verified).toBe(true);
    expect(tx.userSportRating.update).toHaveBeenCalledTimes(2);
    expect(tx.ratingHistory.create).toHaveBeenCalledTimes(2);
    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: MatchStatus.COMPLETED },
    });
  });
});

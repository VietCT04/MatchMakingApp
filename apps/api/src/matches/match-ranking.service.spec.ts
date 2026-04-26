import { MatchRankingService } from './match-ranking.service';

describe('MatchRankingService', () => {
  const service = new MatchRankingService();

  it('calculates distance score linearly from radius', () => {
    expect(service.calculateDistanceScore(0, 5)).toBe(100);
    expect(service.calculateDistanceScore(2.5, 5)).toBe(50);
    expect(service.calculateDistanceScore(5, 5)).toBe(0);
    expect(service.calculateDistanceScore(7, 5)).toBe(0);
  });

  it('returns max rating fit score when user rating is inside range', () => {
    expect(service.calculateRatingFitScore(1300, 1200, 1400)).toBe(100);
  });

  it('reduces rating fit score when user rating is below range', () => {
    expect(service.calculateRatingFitScore(1100, 1200, 1400)).toBe(75);
  });

  it('reduces rating fit score when user rating is above range', () => {
    expect(service.calculateRatingFitScore(1500, 1200, 1400)).toBe(75);
  });

  it('calculates full weighted fit score', () => {
    const now = new Date('2026-04-26T00:00:00.000Z');
    const result = service.calculateFitScore(
      {
        distanceKm: 2,
        radiusKm: 10,
        userRating: 1250,
        minRating: 1200,
        maxRating: 1300,
        startsAt: new Date('2026-04-26T04:00:00.000Z'),
        participantCount: 2,
        maxPlayers: 4,
      },
      now,
    );

    expect(result.fitBreakdown).toEqual({
      distanceScore: 80,
      ratingFitScore: 100,
      timeScore: 90,
      slotAvailabilityScore: 77.5,
    });
    expect(result.fitScore).toBe(88.13);
  });
});

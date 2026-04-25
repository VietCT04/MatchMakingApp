import { expectedScore, teamAverageRating, updateRating } from './elo';

describe('Elo helper', () => {
  it('calculates expected score around 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('increases rating for a win', () => {
    expect(updateRating(1200, 1200, 1)).toBe(1216);
  });

  it('decreases rating for a loss', () => {
    expect(updateRating(1200, 1200, 0)).toBe(1184);
  });

  it('keeps rating stable for expected draw at equal skill', () => {
    expect(updateRating(1200, 1200, 0.5)).toBe(1200);
  });

  it('computes average team rating for doubles', () => {
    expect(teamAverageRating([1100, 1300])).toBe(1200);
  });
});

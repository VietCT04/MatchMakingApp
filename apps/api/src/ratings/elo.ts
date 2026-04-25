export const DEFAULT_RATING = 1200;
export const DEFAULT_K_FACTOR = 32;

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function updateRating(
  playerRating: number,
  opponentRating: number,
  actualScore: number,
  kFactor = DEFAULT_K_FACTOR,
): number {
  const expected = expectedScore(playerRating, opponentRating);
  return Math.round(playerRating + kFactor * (actualScore - expected));
}

export function teamAverageRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return DEFAULT_RATING;
  }
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return sum / ratings.length;
}

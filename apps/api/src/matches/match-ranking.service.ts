import { Injectable } from '@nestjs/common';
import { DEFAULT_RATING } from '../ratings/elo';

const DISTANCE_WEIGHT = 0.35;
const RATING_WEIGHT = 0.35;
const TIME_WEIGHT = 0.15;
const SLOT_WEIGHT = 0.15;
const MAX_RATING_GAP = 400;

export type MatchFitBreakdown = {
  distanceScore: number;
  ratingFitScore: number;
  timeScore: number;
  slotAvailabilityScore: number;
};

export type MatchFitResult = {
  fitScore: number;
  fitBreakdown: MatchFitBreakdown;
};

type MatchFitInput = {
  distanceKm?: number;
  radiusKm?: number;
  userRating?: number;
  minRating?: number | null;
  maxRating?: number | null;
  startsAt: Date;
  participantCount: number;
  maxPlayers: number;
};

@Injectable()
export class MatchRankingService {
  getDefaultRating(): number {
    return DEFAULT_RATING;
  }

  calculateDistanceScore(distanceKm?: number, radiusKm?: number): number {
    if (distanceKm === undefined || radiusKm === undefined) {
      return 50;
    }
    if (radiusKm <= 0) {
      return 50;
    }

    const score = 100 * (1 - distanceKm / radiusKm);
    return this.round(this.clamp(score, 0, 100));
  }

  calculateRatingFitScore(
    userRatingInput: number | undefined,
    minRating?: number | null,
    maxRating?: number | null,
  ): number {
    const userRating = userRatingInput ?? DEFAULT_RATING;

    if (minRating === null && maxRating === null) {
      return 100;
    }

    const effectiveMin = minRating ?? Number.NEGATIVE_INFINITY;
    const effectiveMax = maxRating ?? Number.POSITIVE_INFINITY;
    if (userRating >= effectiveMin && userRating <= effectiveMax) {
      return 100;
    }

    const gap = userRating < effectiveMin ? effectiveMin - userRating : userRating - effectiveMax;
    const score = 100 * (1 - gap / MAX_RATING_GAP);
    return this.round(this.clamp(score, 0, 100));
  }

  calculateTimeScore(startsAt: Date, now = new Date()): number {
    const millisUntilStart = startsAt.getTime() - now.getTime();
    if (millisUntilStart <= 0) {
      return 0;
    }

    const hoursUntilStart = millisUntilStart / (1000 * 60 * 60);
    if (hoursUntilStart <= 3) {
      return 100;
    }
    if (hoursUntilStart <= 24) {
      return 90;
    }
    if (hoursUntilStart <= 72) {
      return 75;
    }
    if (hoursUntilStart <= 168) {
      return 60;
    }
    return 45;
  }

  calculateSlotAvailabilityScore(participantCount: number, maxPlayers: number): number {
    if (maxPlayers <= 0) {
      return 0;
    }

    const openSlots = Math.max(maxPlayers - participantCount, 0);
    if (openSlots <= 0) {
      return 0;
    }

    const openRatio = openSlots / maxPlayers;
    const score = 55 + 45 * openRatio;
    return this.round(this.clamp(score, 0, 100));
  }

  calculateFitScore(input: MatchFitInput, now = new Date()): MatchFitResult {
    const breakdown: MatchFitBreakdown = {
      distanceScore: this.calculateDistanceScore(input.distanceKm, input.radiusKm),
      ratingFitScore: this.calculateRatingFitScore(input.userRating, input.minRating, input.maxRating),
      timeScore: this.calculateTimeScore(input.startsAt, now),
      slotAvailabilityScore: this.calculateSlotAvailabilityScore(input.participantCount, input.maxPlayers),
    };

    const fitScore =
      breakdown.distanceScore * DISTANCE_WEIGHT +
      breakdown.ratingFitScore * RATING_WEIGHT +
      breakdown.timeScore * TIME_WEIGHT +
      breakdown.slotAvailabilityScore * SLOT_WEIGHT;

    return {
      fitScore: this.round(this.clamp(fitScore, 0, 100)),
      fitBreakdown: breakdown,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}

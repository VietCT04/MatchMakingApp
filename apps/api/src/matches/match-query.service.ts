import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus, SportFormat } from '@prisma/client';
import { calculateDistanceKm } from '../common/geo/haversine';
import { PrismaService } from '../prisma/prisma.service';
import { MatchRankingService } from './match-ranking.service';
import { MatchQueryDto } from './dto.match-query';
import { toPrismaMatchStatus, toPrismaSportFormat } from './match-enum.mapper';

@Injectable()
export class MatchQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchRankingService: MatchRankingService,
  ) {}

  async findAll(query: MatchQueryDto = {}, userId?: string) {
    this.validateRatingRange(query.minRating, query.maxRating);
    this.validateNearbyLocationQuery(query);

    const now = new Date();
    const status = query.status ? toPrismaMatchStatus(query.status) : MatchStatus.OPEN;
    const startsAfterDate = query.startsAfter ? new Date(query.startsAfter) : undefined;
    const startsBeforeDate = query.startsBefore ? new Date(query.startsBefore) : undefined;
    const startsAtLowerBound =
      status === MatchStatus.OPEN
        ? this.maxDate(now, startsAfterDate)
        : startsAfterDate;

    const matches = await this.prisma.match.findMany({
      where: {
        sportId: query.sportId,
        format: query.format ? toPrismaSportFormat(query.format) : undefined,
        status,
        venueId: query.venueId,
        minRating: query.minRating === undefined ? undefined : { gte: query.minRating },
        maxRating: query.maxRating === undefined ? undefined : { lte: query.maxRating },
        startsAt: {
          gte: startsAtLowerBound,
          lte: startsBeforeDate,
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                reliabilityStats: {
                  select: {
                    reliabilityScore: true,
                  },
                },
              },
            },
          },
        },
        result: true,
        sport: true,
        venue: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    const hasNearbyFilter = this.hasNearbyLocationQuery(query);
    const withDistanceAndAvailability: Array<(typeof matches)[number] & { distanceKm?: number }> = matches
      .map((match) => {
        const joinedParticipants = match.participants.filter(
          (participant) => participant.status === MatchParticipantStatus.JOINED,
        );
        const openSlots = match.maxPlayers - joinedParticipants.length;
        if (status === MatchStatus.OPEN && openSlots <= 0) {
          return null;
        }

        if (!hasNearbyFilter) {
          return match;
        }

        const venueLatitude = match.venue?.latitude;
        const venueLongitude = match.venue?.longitude;
        if (venueLatitude === null || venueLatitude === undefined || venueLongitude === null || venueLongitude === undefined) {
          return null;
        }

        const distanceKm = calculateDistanceKm(
          query.latitude as number,
          query.longitude as number,
          venueLatitude,
          venueLongitude,
        );
        if (distanceKm > (query.radiusKm as number)) {
          return null;
        }

        return {
          ...match,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((match): match is NonNullable<typeof match> => match !== null);

    if (query.ranked !== true) {
      const normalized = withDistanceAndAvailability.map((match) => ({
        ...match,
        participants: match.participants.map((participant) => {
          const { user, ...participantWithoutUser } = participant;
          return {
            ...participantWithoutUser,
            displayName: participant.user.displayName,
            reliabilityScore: participant.user.reliabilityStats?.reliabilityScore ?? 100,
          };
        }),
      }));
      if (!hasNearbyFilter) {
        return normalized;
      }

      return normalized.sort(
        (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.startsAt.getTime() - b.startsAt.getTime(),
      );
    }

    const userRatingsBySportFormat = await this.getUserRatingsBySportAndFormat(userId, withDistanceAndAvailability);

    return withDistanceAndAvailability
      .map((match) => {
        const joinedParticipants = match.participants.filter(
          (participant) => participant.status === MatchParticipantStatus.JOINED,
        );
        const joinedParticipantCount = joinedParticipants.length;
        const matchReliabilityScore = joinedParticipantCount === 0
          ? 80
          : joinedParticipants.reduce((sum, participant) => {
            const reliabilityScore = participant.user.reliabilityStats?.reliabilityScore ?? 100;
            return sum + reliabilityScore;
          }, 0) / joinedParticipantCount;
        const ratingKey = this.toSportFormatKey(match.sportId, match.format);
        const userRating = userRatingsBySportFormat.get(ratingKey) ?? this.matchRankingService.getDefaultRating();
        const fit = this.matchRankingService.calculateFitScore({
          distanceKm: match.distanceKm,
          radiusKm: query.radiusKm,
          userRating,
          reliabilityScore: Number(matchReliabilityScore.toFixed(2)),
          minRating: match.minRating,
          maxRating: match.maxRating,
          startsAt: match.startsAt,
          participantCount: joinedParticipantCount,
          maxPlayers: match.maxPlayers,
        });

        return {
          ...match,
          participants: match.participants.map((participant) => {
            const { user, ...participantWithoutUser } = participant;
            return {
              ...participantWithoutUser,
              displayName: participant.user.displayName,
              reliabilityScore: participant.user.reliabilityStats?.reliabilityScore ?? 100,
            };
          }),
          ...fit,
        };
      })
      .sort((a, b) => b.fitScore - a.fitScore || a.startsAt.getTime() - b.startsAt.getTime());
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                reliabilityStats: {
                  select: {
                    reliabilityScore: true,
                  },
                },
              },
            },
          },
        },
        result: true,
        sport: true,
        venue: true,
      },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return {
      ...match,
      participants: match.participants.map((participant) => {
        const { user, ...participantWithoutUser } = participant;
        return {
          ...participantWithoutUser,
          displayName: participant.user.displayName,
          reliabilityScore: participant.user.reliabilityStats?.reliabilityScore ?? 100,
        };
      }),
    };
  }

  validateRatingRange(minRating?: number, maxRating?: number): void {
    if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
      throw new BadRequestException('minRating must be less than or equal to maxRating');
    }
  }

  private hasNearbyLocationQuery(query: MatchQueryDto): boolean {
    return query.latitude !== undefined || query.longitude !== undefined || query.radiusKm !== undefined;
  }

  private validateNearbyLocationQuery(query: MatchQueryDto): void {
    const hasAny = this.hasNearbyLocationQuery(query);
    if (!hasAny) {
      return;
    }

    const hasAll =
      query.latitude !== undefined &&
      query.longitude !== undefined &&
      query.radiusKm !== undefined;

    if (!hasAll) {
      throw new BadRequestException(
        'latitude, longitude, and radiusKm must all be provided for nearby discovery',
      );
    }
  }

  private async getUserRatingsBySportAndFormat(matchesUserId: string | undefined, matches: Array<{ sportId: string; format: SportFormat }>) {
    if (!matchesUserId || matches.length === 0) {
      return new Map<string, number>();
    }

    const uniquePairs = Array.from(
      new Set(matches.map((match) => this.toSportFormatKey(match.sportId, match.format))),
    ).map((key) => {
      const [sportId, format] = key.split(':') as [string, SportFormat];
      return { sportId, format };
    });

    const ratings = await this.prisma.userSportRating.findMany({
      where: {
        userId: matchesUserId,
        OR: uniquePairs,
      },
    });

    return new Map(ratings.map((rating) => [this.toSportFormatKey(rating.sportId, rating.format), rating.rating]));
  }

  private toSportFormatKey(sportId: string, format: SportFormat): string {
    return `${sportId}:${format}`;
  }

  private maxDate(left: Date, right?: Date): Date {
    if (!right) {
      return left;
    }
    return left.getTime() >= right.getTime() ? left : right;
  }
}

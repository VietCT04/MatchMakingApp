import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus, Prisma, SportFormat } from '@prisma/client';
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

    const hasNearbyFilter = this.hasNearbyLocationQuery(query);
    const baseWhere: Prisma.MatchWhereInput = {
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
    };

    const matches = hasNearbyFilter
      ? await this.findAllNearbyWithDistance(
          query,
          baseWhere,
          status,
          startsAtLowerBound,
          startsBeforeDate,
          query.format ? toPrismaSportFormat(query.format) : undefined,
        )
      : await this.prisma.match.findMany({
          where: baseWhere,
          include: this.getMatchInclude(),
          orderBy: { startsAt: 'asc' },
        });

    const withDistanceAndAvailability: Array<(typeof matches)[number] & { distanceKm?: number }> = matches
      .map((match) => {
        const joinedParticipants = match.participants.filter(
          (participant) => participant.status === MatchParticipantStatus.JOINED,
        );
        const openSlots = match.maxPlayers - joinedParticipants.length;
        if (status === MatchStatus.OPEN && openSlots <= 0) {
          return null;
        }

        return match;
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

  private getMatchInclude() {
    return {
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
    } as const;
  }

  private async findAllNearbyWithDistance(
    query: MatchQueryDto,
    baseWhere: Prisma.MatchWhereInput,
    status: MatchStatus,
    startsAtLowerBound?: Date,
    startsBeforeDate?: Date,
    format?: SportFormat,
  ) {
    const latitude = query.latitude as number;
    const longitude = query.longitude as number;
    const radiusMeters = (query.radiusKm as number) * 1000;

    try {
      const rows = await this.prisma.$queryRaw<Array<{ matchId: string; distanceKm: number | string }>>(
        this.buildNearbyMatchIdsQuery({
          latitude,
          longitude,
          radiusMeters,
          sportId: query.sportId,
          format,
          status,
          venueId: query.venueId,
          minRating: query.minRating,
          maxRating: query.maxRating,
          startsAtLowerBound,
          startsBeforeDate,
        }),
      );

      const distanceById = new Map(rows.map((row) => [row.matchId, Number(row.distanceKm)]));
      if (distanceById.size === 0) {
        return [];
      }

      const orderedIds = rows.map((row) => row.matchId);
      const matches = await this.prisma.match.findMany({
        where: {
          ...baseWhere,
          id: {
            in: orderedIds,
          },
        },
        include: this.getMatchInclude(),
      });

      const byId = new Map(matches.map((match) => [match.id, match]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((match): match is NonNullable<typeof match> => match !== undefined)
        .map((match) => ({
          ...match,
          distanceKm: Number((distanceById.get(match.id) ?? 0).toFixed(2)),
        }));
    } catch (error) {
      if (!this.isPostgisUnavailableError(error)) {
        throw error;
      }
      return this.findAllNearbyWithHaversineFallback(baseWhere, latitude, longitude, query.radiusKm as number);
    }
  }

  private buildNearbyMatchIdsQuery(input: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    sportId?: string;
    format?: SportFormat;
    status: MatchStatus;
    venueId?: string;
    minRating?: number;
    maxRating?: number;
    startsAtLowerBound?: Date;
    startsBeforeDate?: Date;
  }) {
    const queryPoint = Prisma.sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography`;
    const venuePoint = Prisma.sql`ST_SetSRID(ST_MakePoint(v."longitude", v."latitude"), 4326)::geography`;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`m."status" = ${input.status}::"MatchStatus"`,
      Prisma.sql`v."latitude" IS NOT NULL`,
      Prisma.sql`v."longitude" IS NOT NULL`,
      Prisma.sql`ST_DWithin(${venuePoint}, ${queryPoint}, ${input.radiusMeters})`,
    ];

    if (input.sportId) {
      conditions.push(Prisma.sql`m."sportId" = ${input.sportId}`);
    }
    if (input.format) {
      conditions.push(Prisma.sql`m."format" = ${input.format}::"SportFormat"`);
    }
    if (input.venueId) {
      conditions.push(Prisma.sql`m."venueId" = ${input.venueId}`);
    }
    if (input.minRating !== undefined) {
      conditions.push(Prisma.sql`m."minRating" >= ${input.minRating}`);
    }
    if (input.maxRating !== undefined) {
      conditions.push(Prisma.sql`m."maxRating" <= ${input.maxRating}`);
    }
    if (input.startsAtLowerBound) {
      conditions.push(Prisma.sql`m."startsAt" >= ${input.startsAtLowerBound}`);
    }
    if (input.startsBeforeDate) {
      conditions.push(Prisma.sql`m."startsAt" <= ${input.startsBeforeDate}`);
    }

    return Prisma.sql`
      SELECT
        m."id" AS "matchId",
        ST_Distance(${venuePoint}, ${queryPoint}) / 1000.0 AS "distanceKm"
      FROM "Match" m
      INNER JOIN "Venue" v ON v."id" = m."venueId"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "distanceKm" ASC, m."startsAt" ASC
    `;
  }

  private async findAllNearbyWithHaversineFallback(
    baseWhere: Prisma.MatchWhereInput,
    latitude: number,
    longitude: number,
    radiusKm: number,
  ) {
    const matches = await this.prisma.match.findMany({
      where: baseWhere,
      include: this.getMatchInclude(),
      orderBy: { startsAt: 'asc' },
    });

    return matches
      .map((match) => {
        const venueLatitude = match.venue?.latitude;
        const venueLongitude = match.venue?.longitude;
        if (venueLatitude === null || venueLatitude === undefined || venueLongitude === null || venueLongitude === undefined) {
          return null;
        }

        const distanceKm = calculateDistanceKm(latitude, longitude, venueLatitude, venueLongitude);
        if (distanceKm > radiusKm) {
          return null;
        }

        return {
          ...match,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.startsAt.getTime() - b.startsAt.getTime());
  }

  private isPostgisUnavailableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const candidate = error as { message?: string; code?: string };
    const message = candidate.message?.toLowerCase() ?? '';
    return (
      candidate.code === '42883' ||
      message.includes('st_dwithin') ||
      message.includes('st_distance') ||
      message.includes('postgis') ||
      message.includes('type "geography" does not exist')
    );
  }
}

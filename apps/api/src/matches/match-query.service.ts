import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { calculateDistanceKm } from '../common/geo/haversine';
import { PrismaService } from '../prisma/prisma.service';
import { MatchQueryDto } from './dto.match-query';
import { toPrismaMatchStatus, toPrismaSportFormat } from './match-enum.mapper';

@Injectable()
export class MatchQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: MatchQueryDto = {}) {
    this.validateRatingRange(query.minRating, query.maxRating);
    this.validateNearbyLocationQuery(query);

    const matches = await this.prisma.match.findMany({
      where: {
        sportId: query.sportId,
        format: query.format ? toPrismaSportFormat(query.format) : undefined,
        status: query.status ? toPrismaMatchStatus(query.status) : MatchStatus.OPEN,
        venueId: query.venueId,
        minRating: query.minRating === undefined ? undefined : { gte: query.minRating },
        maxRating: query.maxRating === undefined ? undefined : { lte: query.maxRating },
        startsAt: {
          gte: query.startsAfter ? new Date(query.startsAfter) : undefined,
          lte: query.startsBefore ? new Date(query.startsBefore) : undefined,
        },
      },
      include: { participants: true, result: true, sport: true, venue: true },
      orderBy: { startsAt: 'asc' },
    });

    if (!this.hasNearbyLocationQuery(query)) {
      return matches;
    }

    // TODO: Replace app-layer geo filtering with PostGIS/indexed geospatial query when available.
    const filtered = matches
      .map((match) => {
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
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm || a.startsAt.getTime() - b.startsAt.getTime());

    return filtered;
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { participants: true, result: true, sport: true, venue: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
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
}

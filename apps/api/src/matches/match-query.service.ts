import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchQueryDto } from './dto.match-query';
import { toPrismaMatchStatus, toPrismaSportFormat } from './match-enum.mapper';

@Injectable()
export class MatchQueryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: MatchQueryDto = {}) {
    this.validateRatingRange(query.minRating, query.maxRating);

    return this.prisma.match.findMany({
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
}

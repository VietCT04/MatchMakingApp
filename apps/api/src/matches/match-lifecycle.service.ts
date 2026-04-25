import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto.create-match';
import { UpdateMatchDto } from './dto.update-match';
import { MatchQueryService } from './match-query.service';
import { toPrismaMatchStatus, toPrismaSportFormat } from './match-enum.mapper';

@Injectable()
export class MatchLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: MatchQueryService,
  ) {}

  createForUser(userId: string, dto: CreateMatchDto) {
    this.queryService.validateRatingRange(dto.minRating, dto.maxRating);

    return this.prisma.match.create({
      data: {
        sportId: dto.sportId,
        venueId: dto.venueId,
        createdByUserId: userId,
        title: dto.title,
        description: dto.description,
        format: toPrismaSportFormat(dto.format),
        startsAt: new Date(dto.startsAt),
        status: dto.status ? toPrismaMatchStatus(dto.status) : MatchStatus.OPEN,
        maxPlayers: dto.maxPlayers,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
      },
    });
  }

  async update(id: string, dto: UpdateMatchDto) {
    this.queryService.validateRatingRange(dto.minRating, dto.maxRating);
    await this.queryService.findOne(id);

    return this.prisma.match.update({
      where: { id },
      data: {
        sportId: dto.sportId,
        venueId: dto.venueId,
        createdByUserId: dto.createdByUserId,
        title: dto.title,
        description: dto.description,
        format: dto.format ? toPrismaSportFormat(dto.format) : undefined,
        status: dto.status ? toPrismaMatchStatus(dto.status) : undefined,
        maxPlayers: dto.maxPlayers,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.queryService.findOne(id);
    await this.prisma.match.delete({ where: { id } });
    return { deleted: true };
  }

  setCompleted(matchId: string) {
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.COMPLETED },
    });
  }

  setOpen(matchId: string) {
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.OPEN },
    });
  }

  setFull(matchId: string) {
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.FULL },
    });
  }
}

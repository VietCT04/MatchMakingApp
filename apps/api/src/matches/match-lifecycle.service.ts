import { ForbiddenException, Injectable } from '@nestjs/common';
import { MatchStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
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

  async updateForUser(id: string, user: AuthUser, dto: UpdateMatchDto) {
    this.queryService.validateRatingRange(dto.minRating, dto.maxRating);
    const match = await this.queryService.findOne(id);
    this.assertCanManageMatch(match.createdByUserId, user);

    return this.prisma.match.update({
      where: { id },
      data: {
        sportId: dto.sportId,
        venueId: dto.venueId,
        createdByUserId: undefined,
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

  async removeForUser(id: string, user: AuthUser) {
    const match = await this.queryService.findOne(id);
    this.assertCanManageMatch(match.createdByUserId, user);

    if (match.status === MatchStatus.COMPLETED && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can cancel completed matches');
    }

    await this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.CANCELLED },
    });
    return { cancelled: true };
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

  private assertCanManageMatch(createdByUserId: string, user: AuthUser) {
    const isCreator = createdByUserId === user.id;
    const isPrivileged = user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
    if (!isCreator && !isPrivileged) {
      throw new ForbiddenException('Only match creator, ADMIN, or MODERATOR can manage this match');
    }
  }
}

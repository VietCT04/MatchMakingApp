import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus, Prisma, SportFormat, Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_RATING, teamAverageRating, updateRating } from './elo';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  getDefaults() {
    return {
      defaultRating: DEFAULT_RATING,
      kFactor: 32,
    };
  }

  previewUpdate(playerRating: number, opponentRating: number, actualScore: number) {
    return {
      oldRating: playerRating,
      newRating: updateRating(playerRating, opponentRating, actualScore),
    };
  }

  previewDoublesUpdate(
    teamARatings: number[],
    teamBRatings: number[],
    teamAActualScore: number,
  ) {
    const teamAAvg = teamAverageRating(teamARatings);
    const teamBAvg = teamAverageRating(teamBRatings);

    return {
      teamAAvg,
      teamBAvg,
      teamAProjectedNew: updateRating(teamAAvg, teamBAvg, teamAActualScore),
      teamBProjectedNew: updateRating(teamBAvg, teamAAvg, 1 - teamAActualScore),
    };
  }

  listUserRatings(userId?: string) {
    return this.prisma.userSportRating.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  listUserRatingHistory(userId: string) {
    return this.prisma.ratingHistory.findMany({
      where: { userId },
      include: { sport: true, match: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyMatchResult(matchId: string, resultId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.matchResult.findUnique({ where: { id: resultId } });
      if (!result || result.matchId !== matchId) {
        throw new NotFoundException('Match result not found');
      }
      if (result.verified) {
        throw new ConflictException('Match result is already verified');
      }

      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          participants: {
            where: { status: MatchParticipantStatus.JOINED },
          },
        },
      });

      if (!match) {
        throw new NotFoundException('Match not found');
      }

      const teamA = match.participants.filter((participant) => participant.team === Team.A);
      const teamB = match.participants.filter((participant) => participant.team === Team.B);
      if (teamA.length === 0 || teamB.length === 0) {
        throw new BadRequestException('Verified results require joined participants on teams A and B');
      }

      const teamARatings = await Promise.all(
        teamA.map((participant) => this.getOrCreateRating(tx, participant.userId, match.sportId, match.format)),
      );
      const teamBRatings = await Promise.all(
        teamB.map((participant) => this.getOrCreateRating(tx, participant.userId, match.sportId, match.format)),
      );

      const teamAAvg = teamAverageRating(teamARatings.map((rating) => rating.rating));
      const teamBAvg = teamAverageRating(teamBRatings.map((rating) => rating.rating));
      const teamAActual = this.actualScore(result.teamAScore, result.teamBScore);
      const teamBActual = this.actualScore(result.teamBScore, result.teamAScore);

      const ratingUpdates = [];
      for (const rating of teamARatings) {
        ratingUpdates.push(await this.applyRatingUpdate(tx, rating, match.id, teamBAvg, teamAActual));
      }
      for (const rating of teamBRatings) {
        ratingUpdates.push(await this.applyRatingUpdate(tx, rating, match.id, teamAAvg, teamBActual));
      }

      const verifiedResult = await tx.matchResult.update({
        where: { id: resultId },
        data: { verified: true },
      });

      await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.COMPLETED },
      });

      return {
        result: verifiedResult,
        ratingUpdates,
      };
    });
  }

  private actualScore(teamScore: number, opponentScore: number): number {
    if (teamScore > opponentScore) {
      return 1;
    }
    if (teamScore < opponentScore) {
      return 0;
    }
    return 0.5;
  }

  private getOrCreateRating(
    tx: Prisma.TransactionClient,
    userId: string,
    sportId: string,
    format: SportFormat,
  ) {
    return tx.userSportRating.upsert({
      where: { userId_sportId_format: { userId, sportId, format } },
      update: {},
      create: {
        userId,
        sportId,
        format,
        rating: DEFAULT_RATING,
        gamesPlayed: 0,
        uncertainty: 350,
      },
    });
  }

  private async applyRatingUpdate(
    tx: Prisma.TransactionClient,
    rating: Awaited<ReturnType<RatingsService['getOrCreateRating']>>,
    matchId: string,
    opponentRating: number,
    actualScoreValue: number,
  ) {
    const oldRating = rating.rating;
    const newRating = updateRating(oldRating, opponentRating, actualScoreValue);
    const delta = newRating - oldRating;

    await tx.userSportRating.update({
      where: { id: rating.id },
      data: {
        rating: newRating,
        gamesPlayed: { increment: 1 },
      },
    });

    await tx.ratingHistory.create({
      data: {
        userId: rating.userId,
        sportId: rating.sportId,
        matchId,
        oldRating,
        newRating,
        delta,
      },
    });

    return {
      userId: rating.userId,
      sportId: rating.sportId,
      oldRating,
      newRating,
      delta,
    };
  }
}

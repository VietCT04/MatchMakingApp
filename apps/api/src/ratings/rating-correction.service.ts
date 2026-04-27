import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, Prisma, SportFormat, Team } from '@prisma/client';
import { DEFAULT_RATING, teamAverageRating, updateRating } from './elo';

type CorrectionScores = {
  teamAScore: number;
  teamBScore: number;
};

type RatingUpdate = {
  userId: string;
  sportId: string;
  oldRating: number;
  newRating: number;
  delta: number;
};

@Injectable()
export class RatingCorrectionService {
  private static readonly MATCH_REVERT_REASON_PREFIX = 'Rating correction rollback for disputed result';

  async applyDisputeRatingCorrection(
    tx: Prisma.TransactionClient,
    disputeId: string,
    moderatorUserId: string,
    scores: CorrectionScores,
    correctionReason?: string,
  ) {
    const dispute = await tx.matchResultDispute.findUnique({
      where: { id: disputeId },
      include: {
        matchResult: {
          include: {
            match: {
              include: {
                participants: {
                  where: { status: MatchParticipantStatus.JOINED },
                  select: {
                    userId: true,
                    team: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const result = dispute.matchResult;
    if (!result) {
      throw new NotFoundException('Match result not found for dispute');
    }
    if (!result.verified) {
      throw new BadRequestException('Cannot correct Elo for an unverified result');
    }
    if (result.isCorrected) {
      throw new ConflictException('This result has already been corrected');
    }

    const teamA = result.match.participants.filter((participant) => participant.team === Team.A);
    const teamB = result.match.participants.filter((participant) => participant.team === Team.B);
    if (teamA.length === 0 || teamB.length === 0) {
      throw new BadRequestException('Rating correction requires joined participants on teams A and B');
    }

    const revertedHistory = await this.revertOriginalMatchRatings(
      tx,
      result.matchId,
      result.match.sportId,
      result.match.format,
      `${RatingCorrectionService.MATCH_REVERT_REASON_PREFIX}: ${correctionReason ?? 'moderator correction'}`,
    );

    const correctionUpdates = await this.applyCorrectedResultRating(
      tx,
      result.id,
      {
        teamAScore: scores.teamAScore,
        teamBScore: scores.teamBScore,
      },
      revertedHistory,
    );

    const correctedResult = await tx.matchResult.update({
      where: { id: result.id },
      data: {
        correctedTeamAScore: scores.teamAScore,
        correctedTeamBScore: scores.teamBScore,
        correctedByUserId: moderatorUserId,
        correctedAt: new Date(),
        correctionReason: correctionReason?.trim() || null,
        isCorrected: true,
      },
    });

    return {
      disputeId,
      matchId: result.matchId,
      resultId: result.id,
      originalTeamAScore: result.teamAScore,
      originalTeamBScore: result.teamBScore,
      correctedTeamAScore: scores.teamAScore,
      correctedTeamBScore: scores.teamBScore,
      correctedResult,
      revertedHistory,
      correctionUpdates,
    };
  }

  async revertOriginalMatchRatings(
    tx: Prisma.TransactionClient,
    matchId: string,
    sportId: string,
    format: SportFormat,
    reason: string,
  ) {
    const histories = await tx.ratingHistory.findMany({
      where: {
        matchId,
        isReverted: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (histories.length === 0) {
      throw new BadRequestException('No rating history found for this match; cannot apply correction');
    }

    for (const history of histories) {
      const rating = await tx.userSportRating.upsert({
        where: {
          userId_sportId_format: {
            userId: history.userId,
            sportId,
            format,
          },
        },
        update: {},
        create: {
          userId: history.userId,
          sportId,
          format,
          rating: DEFAULT_RATING,
          gamesPlayed: 0,
          uncertainty: 350,
        },
      });

      await tx.userSportRating.update({
        where: { id: rating.id },
        data: {
          rating: history.oldRating,
          gamesPlayed: Math.max(0, rating.gamesPlayed - 1),
        },
      });

      await tx.ratingHistory.update({
        where: { id: history.id },
        data: {
          isReverted: true,
          revertedAt: new Date(),
          revertReason: reason,
        },
      });
    }

    return histories;
  }

  async applyCorrectedResultRating(
    tx: Prisma.TransactionClient,
    matchResultId: string,
    scores: CorrectionScores,
    revertedHistory: Array<{
      id: string;
      userId: string;
      oldRating: number;
    }>,
  ): Promise<RatingUpdate[]> {
    const result = await tx.matchResult.findUnique({
      where: { id: matchResultId },
      include: {
        match: {
          include: {
            participants: {
              where: { status: MatchParticipantStatus.JOINED },
            },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Match result not found');
    }

    const teamA = result.match.participants.filter((participant) => participant.team === Team.A);
    const teamB = result.match.participants.filter((participant) => participant.team === Team.B);
    if (teamA.length === 0 || teamB.length === 0) {
      throw new BadRequestException('Cannot apply corrected rating without joined teams A and B');
    }

    const teamARatings = await Promise.all(
      teamA.map((participant) =>
        tx.userSportRating.upsert({
          where: {
            userId_sportId_format: {
              userId: participant.userId,
              sportId: result.match.sportId,
              format: result.match.format,
            },
          },
          update: {},
          create: {
            userId: participant.userId,
            sportId: result.match.sportId,
            format: result.match.format,
            rating: DEFAULT_RATING,
            gamesPlayed: 0,
            uncertainty: 350,
          },
        }),
      ),
    );

    const teamBRatings = await Promise.all(
      teamB.map((participant) =>
        tx.userSportRating.upsert({
          where: {
            userId_sportId_format: {
              userId: participant.userId,
              sportId: result.match.sportId,
              format: result.match.format,
            },
          },
          update: {},
          create: {
            userId: participant.userId,
            sportId: result.match.sportId,
            format: result.match.format,
            rating: DEFAULT_RATING,
            gamesPlayed: 0,
            uncertainty: 350,
          },
        }),
      ),
    );

    const teamAAvg = teamAverageRating(teamARatings.map((rating) => rating.rating));
    const teamBAvg = teamAverageRating(teamBRatings.map((rating) => rating.rating));

    const teamAActual = this.actualScore(scores.teamAScore, scores.teamBScore);
    const teamBActual = this.actualScore(scores.teamBScore, scores.teamAScore);

    const correctionHistoryByUser = new Map(revertedHistory.map((history) => [history.userId, history.id]));
    const updates: RatingUpdate[] = [];

    for (const rating of teamARatings) {
      updates.push(
        await this.applyRatingUpdate(
          tx,
          rating,
          result.matchId,
          teamBAvg,
          teamAActual,
          correctionHistoryByUser.get(rating.userId) ?? null,
        ),
      );
    }

    for (const rating of teamBRatings) {
      updates.push(
        await this.applyRatingUpdate(
          tx,
          rating,
          result.matchId,
          teamAAvg,
          teamBActual,
          correctionHistoryByUser.get(rating.userId) ?? null,
        ),
      );
    }

    return updates;
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

  private async applyRatingUpdate(
    tx: Prisma.TransactionClient,
    rating: {
      id: string;
      userId: string;
      sportId: string;
      rating: number;
      gamesPlayed: number;
    },
    matchId: string,
    opponentRating: number,
    actualScoreValue: number,
    correctionOfRatingHistoryId: string | null,
  ): Promise<RatingUpdate> {
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
        correctionOfRatingHistoryId,
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

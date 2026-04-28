import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserReliabilityStats } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_RELIABILITY_SCORE = 100;

type ReliabilityDeltas = Partial<Pick<
  UserReliabilityStats,
  'completedMatches' | 'cancelledMatches' | 'lateCancellationCount' | 'noShowCount' | 'disputedResults' | 'reportCount'
>>;

@Injectable()
export class ReliabilityService {
  constructor(private readonly prisma: PrismaService) {}

  calculateReliabilityScore(stats: Pick<UserReliabilityStats, 'noShowCount' | 'lateCancellationCount' | 'disputedResults' | 'reportCount'>): number {
    const score =
      DEFAULT_RELIABILITY_SCORE -
      stats.noShowCount * 10 -
      stats.lateCancellationCount * 5 -
      stats.disputedResults * 5 -
      stats.reportCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  async getOrCreateByUserId(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.userReliabilityStats.upsert({
      where: { userId },
      update: {},
      create: { userId, reliabilityScore: DEFAULT_RELIABILITY_SCORE },
    });
  }

  async getSummaryByUserId(userId: string) {
    const stats = await this.prisma.userReliabilityStats.findUnique({ where: { userId } });
    if (!stats) {
      throw new NotFoundException('Reliability stats not found');
    }
    return this.toSummary(stats);
  }

  async incrementCompletedMatch(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { completedMatches: 1 }, tx);
  }

  async incrementCancellation(userId: string, isLate: boolean, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(
      userId,
      {
        cancelledMatches: 1,
        lateCancellationCount: isLate ? 1 : 0,
      },
      tx,
    );
  }

  async incrementNoShow(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { noShowCount: 1 }, tx);
  }

  async incrementDisputedResults(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { disputedResults: 1 }, tx);
  }

  async incrementReports(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { reportCount: 1 }, tx);
  }

  async decrementReports(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { reportCount: -1 }, tx);
  }

  async decrementDisputedResults(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { disputedResults: -1 }, tx);
  }

  async decrementNoShow(userId: string, tx?: Prisma.TransactionClient) {
    return this.applyDeltas(userId, { noShowCount: -1 }, tx);
  }

  async toSummaryByUserId(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const stats = await client.userReliabilityStats.findUnique({ where: { userId } });
    if (!stats) {
      return this.defaultSummary(userId);
    }
    return this.toSummary(stats);
  }

  private async applyDeltas(userId: string, deltas: ReliabilityDeltas, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await this.getOrCreateByUserId(userId, client);
    const current = await client.userReliabilityStats.findUniqueOrThrow({ where: { userId } });

    const nextCounts = {
      completedMatches: Math.max(0, current.completedMatches + (deltas.completedMatches ?? 0)),
      cancelledMatches: Math.max(0, current.cancelledMatches + (deltas.cancelledMatches ?? 0)),
      lateCancellationCount: Math.max(0, current.lateCancellationCount + (deltas.lateCancellationCount ?? 0)),
      noShowCount: Math.max(0, current.noShowCount + (deltas.noShowCount ?? 0)),
      disputedResults: Math.max(0, current.disputedResults + (deltas.disputedResults ?? 0)),
      reportCount: Math.max(0, current.reportCount + (deltas.reportCount ?? 0)),
    };

    return client.userReliabilityStats.update({
      where: { userId },
      data: {
        ...nextCounts,
        reliabilityScore: this.calculateReliabilityScore(nextCounts),
      },
    });
  }

  private toSummary(stats: UserReliabilityStats) {
    return {
      userId: stats.userId,
      completedMatches: stats.completedMatches,
      cancelledMatches: stats.cancelledMatches,
      lateCancellationCount: stats.lateCancellationCount,
      noShowCount: stats.noShowCount,
      disputedResults: stats.disputedResults,
      reportCount: stats.reportCount,
      reliabilityScore: stats.reliabilityScore,
    };
  }

  private defaultSummary(userId: string) {
    return {
      userId,
      completedMatches: 0,
      cancelledMatches: 0,
      lateCancellationCount: 0,
      noShowCount: 0,
      disputedResults: 0,
      reportCount: 0,
      reliabilityScore: DEFAULT_RELIABILITY_SCORE,
    };
  }
}
